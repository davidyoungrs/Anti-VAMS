import { supabase } from './supabaseClient';

const STORAGE_KEY = 'global_valve_records';

export const storageService = {
    getAll: async () => {
        // Try Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('valve_records')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const mappedData = data.map(r => ({
                        ...r,
                        serialNumber: r.serial_number,
                        jobNo: r.job_no,
                        tagNo: r.tag_no,
                        orderNo: r.order_no,
                        dateIn: r.date_in,
                        requiredDate: r.required_date,
                        safetyCheck: r.safety_check,
                        decontaminationCert: r.decontamination_cert,
                        lsaCheck: r.lsa_check,
                        seizedMidStroke: r.seized_mid_stroke,
                        modelNo: r.model_no,
                        valveType: r.valve_type,
                        sizeClass: r.size_class,
                        packingType: r.packing_type,
                        flangeType: r.flange_type,
                        bodyMaterial: r.body_material,
                        seatMaterial: r.seat_material,
                        trimMaterial: r.trim_material,
                        obturatorMaterial: r.obturator_material,
                        failMode: r.fail_mode,
                        bodyTestSpec: r.body_test_spec,
                        seatTestSpec: r.seat_test_spec,
                        bodyPressure: r.body_pressure,
                        bodyPressureUnit: r.body_pressure_unit,
                        testedBy: r.tested_by,
                        testDate: r.test_date,
                        testMedium: r.test_medium,
                        passFail: r.pass_fail,
                        files: r.file_urls || []
                    }));
                    // Update local cache
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedData));
                    return mappedData;
                }
                console.warn('Supabase fetch failed, falling back to local', error);
            } catch (e) {
                console.error('Database connection error', e);
            }
        }

        // Fallback to LocalStorage
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading storage', e);
            return [];
        }
    },

    save: async (record) => {
        let finalRecord = { ...record };

        // 1. Prepare record
        if (!record.id) {
            finalRecord.id = crypto.randomUUID();
            finalRecord.createdAt = new Date().toISOString();
        }

        // 2. Handle File Uploads (if any and online)
        if (supabase && record.files && record.files.length > 0) {
            try {
                const uploadedUrls = await Promise.all(record.files.map(async (file) => {
                    // If it's already a URL (string), keep it
                    if (typeof file === 'string') return file;

                    // If it's a File object, upload it
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${finalRecord.id}/${crypto.randomUUID()}.${fileExt}`;
                    const filePath = `valve-attachments/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('valve-attachments')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error('File upload error:', uploadError);
                        return null;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('valve-attachments')
                        .getPublicUrl(filePath);

                    return publicUrl;
                }));

                finalRecord.files = uploadedUrls.filter(url => url !== null);
            } catch (e) {
                console.error('Error during file upload process:', e);
            }
        }

        // 3. Try Online Save
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_records')
                    .upsert({
                        id: finalRecord.id,
                        created_at: finalRecord.createdAt,
                        serial_number: finalRecord.serialNumber,
                        customer: finalRecord.customer,
                        oem: finalRecord.oem,
                        job_no: finalRecord.jobNo,
                        tag_no: finalRecord.tagNo,
                        order_no: finalRecord.orderNo,
                        date_in: finalRecord.dateIn,
                        status: finalRecord.status || 'Pending',
                        pass_fail: finalRecord.passFail || 'Pending',
                        plant_area: finalRecord.plantArea,
                        site_location: finalRecord.siteLocation,
                        required_date: finalRecord.requiredDate,
                        safety_check: finalRecord.safetyCheck,
                        decontamination_cert: finalRecord.decontaminationCert,
                        lsa_check: finalRecord.lsaCheck,
                        seized_mid_stroke: finalRecord.seizedMidStroke,
                        model_no: finalRecord.modelNo,
                        valve_type: finalRecord.valveType,
                        size_class: finalRecord.sizeClass,
                        packing_type: finalRecord.packingType,
                        flange_type: finalRecord.flangeType,
                        mawp: finalRecord.mawp,
                        body_material: finalRecord.bodyMaterial,
                        seat_material: finalRecord.seatMaterial,
                        trim_material: finalRecord.trimMaterial,
                        obturator_material: finalRecord.obturatorMaterial,
                        actuator: finalRecord.actuator,
                        gear_operator: finalRecord.gearOperator,
                        fail_mode: finalRecord.failMode,
                        body_test_spec: finalRecord.bodyTestSpec,
                        seat_test_spec: finalRecord.seatTestSpec,
                        body_pressure: finalRecord.bodyPressure,
                        body_pressure_unit: finalRecord.bodyPressureUnit,
                        tested_by: finalRecord.testedBy,
                        test_date: finalRecord.testDate,
                        test_medium: finalRecord.testMedium,
                        file_urls: finalRecord.files || []
                    });

                if (error) console.error('Supabase save error', error);
            } catch (e) {
                console.error('Supabase connection error during save', e);
            }
        }

        // 4. Always Save to Local (Cache/Offline)
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = records.findIndex(r => r.id === finalRecord.id);

        if (index !== -1) {
            records[index] = { ...records[index], ...finalRecord };
        } else {
            records.unshift(finalRecord);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return finalRecord;
    },

    delete: async (id) => {
        // 1. Delete Online
        if (supabase) {
            try {
                // First, try to list and delete files in storage
                const { data: files } = await supabase.storage
                    .from('valve-attachments')
                    .list(`valve-attachments/${id}`);

                if (files && files.length > 0) {
                    await supabase.storage
                        .from('valve-attachments')
                        .remove(files.map(f => `valve-attachments/${id}/${f.name}`));
                }

                const { error } = await supabase
                    .from('valve_records')
                    .delete()
                    .eq('id', id);
                if (error) console.error('Supabase delete error', error);
            } catch (e) {
                console.error('Supabase connection error during delete', e);
            }
        }

        // 2. Delete Local
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const filteredRecords = records.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
    },

    search: async (query) => {
        const records = await storageService.getAll();
        if (!query) return records;
        const lowerQ = query.toLowerCase();
        return records.filter(r =>
            r.serialNumber?.toLowerCase().includes(lowerQ) ||
            r.customer?.toLowerCase().includes(lowerQ) ||
            r.oem?.toLowerCase().includes(lowerQ)
        );
    },

    syncLocalToCloud: async () => {
        if (!supabase) return { error: 'Supabase not configured' };

        const localRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (localRecords.length === 0) return { success: true, count: 0 };

        const { error } = await supabase
            .from('valve_records')
            .upsert(localRecords.map(r => ({
                id: r.id,
                created_at: r.createdAt,
                serial_number: r.serialNumber,
                customer: r.customer,
                oem: r.oem,
                job_no: r.jobNo,
                tag_no: r.tagNo,
                order_no: r.orderNo,
                date_in: r.dateIn,
                status: r.status,
                pass_fail: r.passFail,
                file_urls: r.files || []
            })));

        if (error) return { error };
        return { success: true, count: localRecords.length };
    }
};

