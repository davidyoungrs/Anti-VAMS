import { supabase } from './supabaseClient';

const STORAGE_KEY = 'global_valve_records';

export const storageService = {
    getAll: async () => {
        // 1. Load Local Data first
        let localRecords = [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            localRecords = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading local storage', e);
        }

        // 2. Try Supabase
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('valve_records')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('Supabase fetch failed, using local data only', error);
                    return localRecords;
                }

                if (data) {
                    const cloudRecords = data.map(r => ({
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
                        mawp: r.mawp,
                        bodyMaterial: r.body_material,
                        seatMaterial: r.seat_material,
                        trimMaterial: r.trim_material,
                        obturatorMaterial: r.obturator_material,
                        plantArea: r.plant_area,
                        siteLocation: r.site_location,
                        actuator: r.actuator,
                        gearOperator: r.gear_operator,
                        failMode: r.fail_mode,
                        bodyTestSpec: r.body_test_spec,
                        seatTestSpec: r.seat_test_spec,
                        bodyPressure: r.body_pressure,
                        bodyPressureUnit: r.body_pressure_unit,
                        testedBy: r.tested_by,
                        testDate: r.test_date,
                        testMedium: r.test_medium,
                        passFail: r.pass_fail,
                        status: r.status,
                        files: r.file_urls || []
                    }));

                    // SAFE MERGE: 
                    // If cloud is empty but we have local records, DON'T overwrite local with nothing.
                    // This prevents data loss if the DB is fresh but user has local work.
                    if (cloudRecords.length === 0 && localRecords.length > 0) {
                        return localRecords;
                    }

                    // Otherwise, cloud is the source of truth
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudRecords));
                    return cloudRecords;
                }
            } catch (e) {
                console.error('Database connection error in getAll', e);
            }
        }

        return localRecords;
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
                    if (typeof file === 'string') return file;
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${finalRecord.id}/${crypto.randomUUID()}.${fileExt}`;
                    const filePath = `valve-attachments/${fileName}`;
                    const { error: uploadError } = await supabase.storage.from('valve-attachments').upload(filePath, file);
                    if (uploadError) {
                        console.error('File upload error:', uploadError);
                        return null;
                    }
                    const { data: { publicUrl } } = supabase.storage.from('valve-attachments').getPublicUrl(filePath);
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

                if (error) {
                    console.error('Supabase save error:', error);
                    // IMPORTANT: We throw here so the UI knows the SAVE FAILED.
                    // This usually means the user needs to run the SQL script to add columns.
                    throw error;
                }
            } catch (e) {
                console.error('Supabase connection error during save', e);
                // We DON'T throw for connection errors, allowing the local save below to act as offline mode.
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
        if (supabase) {
            try {
                const { data: files } = await supabase.storage.from('valve-attachments').list(`valve-attachments/${id}`);
                if (files && files.length > 0) {
                    await supabase.storage.from('valve-attachments').remove(files.map(f => `valve-attachments/${id}/${f.name}`));
                }
                const { error } = await supabase.from('valve_records').delete().eq('id', id);
                if (error) console.error('Supabase delete error', error);
            } catch (e) {
                console.error('Supabase connection error during delete', e);
            }
        }
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records.filter(r => r.id !== id)));
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
                plant_area: r.plantArea,
                site_location: r.siteLocation,
                required_date: r.requiredDate,
                safety_check: r.safetyCheck,
                decontamination_cert: r.decontaminationCert,
                lsa_check: r.lsaCheck,
                seized_mid_stroke: r.seizedMidStroke,
                model_no: r.modelNo,
                valve_type: r.valveType,
                size_class: r.sizeClass,
                packing_type: r.packingType,
                flange_type: r.flangeType,
                mawp: r.mawp,
                body_material: r.bodyMaterial,
                seat_material: r.seatMaterial,
                trim_material: r.trimMaterial,
                obturator_material: r.obturatorMaterial,
                actuator: r.actuator,
                gear_operator: r.gearOperator,
                fail_mode: r.failMode,
                body_test_spec: r.bodyTestSpec,
                seat_test_spec: r.seatTestSpec,
                body_pressure: r.bodyPressure,
                body_pressure_unit: r.bodyPressureUnit,
                tested_by: r.testedBy,
                test_date: r.testDate,
                test_medium: r.testMedium,
                file_urls: r.files || []
            })));

        if (error) return { error };
        return { success: true, count: localRecords.length };
    }
};

