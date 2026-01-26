import { supabase } from './supabaseClient';

const STORAGE_KEY = 'global_valve_records';

export const storageService = {
    getAll: async () => {
        // 1. Baseline: Load from LocalStorage
        let localRecords = [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            localRecords = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading local storage', e);
        }

        // 2. Try Supabase Sync
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('valve_records')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('Database fetch failed, using local records', error);
                    return localRecords;
                }

                if (data) {
                    const cloudRecords = data.map(r => ({
                        ...r,
                        serialNumber: r.serial_number,
                        jobNo: r.job_no,
                        tagNo: r.tag_no,
                        order_no: r.order_no, // Ensure mapping for both cases if needed
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
                        latitude: r.latitude,
                        longitude: r.longitude,
                        updatedAt: r.updated_at,
                        lastViewedAt: r.last_viewed_at,
                        valvePhoto: r.valve_photo,
                        files: r.file_urls || []
                    }));

                    // Safety: Only overwrite local if we actually got something from the cloud
                    if (cloudRecords.length > 0) {
                        // MERGE STRATEGY: Prioritize the record with the most recent 'updatedAt' timestamp.
                        // This ensures that if we just saved locally, we don't get overwritten by stale cloud data.
                        const mergedRecords = cloudRecords.map(cloudRecord => {
                            const localMatch = localRecords.find(l => l.id === cloudRecord.id);
                            if (!localMatch) return cloudRecord;

                            const cloudTime = new Date(cloudRecord.updatedAt || 0).getTime();
                            const localTime = new Date(localMatch.updatedAt || 0).getTime();

                            // Use Local data if it is newer or equal (Equal = we likely just synced it)
                            if (localTime >= cloudTime) {
                                return {
                                    ...localMatch, // Base on local
                                    // Optionally fill in missing keys from cloud if needed, but usually local is complete
                                };
                            } else {
                                // Cloud is newer. Use Cloud data.
                                // Fallback: If cloud has NO files, but local has files, keep local files to be safe?
                                // This handles the edge case of 'cloud array empty' bug.
                                let finalFiles = cloudRecord.files;
                                if ((!finalFiles || finalFiles.length === 0) && (localMatch.files && localMatch.files.length > 0)) {
                                    finalFiles = localMatch.files;
                                }

                                return {
                                    ...cloudRecord,
                                    files: finalFiles
                                };
                            }
                        });

                        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedRecords));
                        return mergedRecords;
                    }
                }
            } catch (e) {
                console.error('Database connection error during getAll', e);
            }
        }

        return localRecords;
    },

    save: async (record) => {
        let finalRecord = { ...record };

        // 1. Prepare ID and Metadata
        if (!finalRecord.id) {
            finalRecord.id = crypto.randomUUID();
            finalRecord.createdAt = new Date().toISOString();
        }
        finalRecord.updatedAt = new Date().toISOString();

        // 2. Process Files & Photos (BEFORE saving to local storage)
        // This ensures local storage never gets "File" objects which turn into {}

        // 2a. Handle Valve Photo
        if (supabase && finalRecord.valvePhoto && typeof finalRecord.valvePhoto !== 'string') {
            try {
                const file = finalRecord.valvePhoto;
                const fileExt = file.name.split('.').pop();
                const filePath = `${finalRecord.id}/valve-photo-${crypto.randomUUID()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('valve-attachment')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Valve photo upload failed:', uploadError);
                    alert(`Valve photo upload failed: ${uploadError.message}`);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('valve-attachment')
                        .getPublicUrl(filePath);
                    finalRecord.valvePhoto = publicUrl;
                }
            } catch (e) {
                console.error('Error during valve photo upload:', e);
            }
        }

        // 2b. Handle Attachments (Support Offline via Base64)
        if (finalRecord.files && finalRecord.files.length > 0) {
            try {
                const processedFiles = await Promise.all(finalRecord.files.map(async (file) => {
                    if (typeof file === 'string') return file; // Already URL or Base64

                    // Try Supabase upload if available
                    if (supabase) {
                        try {
                            const fileExt = file.name.split('.').pop();
                            // Use timestamp to prevent collisions
                            const filePath = `${finalRecord.id}/${Date.now()}_${file.name}`;

                            const { error: uploadError } = await supabase.storage
                                .from('valve-attachment')
                                .upload(filePath, file);

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage
                                    .from('valve-attachment')
                                    .getPublicUrl(filePath);
                                return publicUrl;
                            }
                            console.warn('Supabase upload failed, falling back to local base64:', uploadError);
                        } catch (err) {
                            console.warn('Supabase exception, falling back to local:', err);
                        }
                    }

                    // Fallback (or Offline): Convert to Base64
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = error => reject(error);
                    });
                }));

                finalRecord.files = processedFiles;

            } catch (e) {
                console.error('Error processing files:', e);
                // Don't fail the whole save, at least save the record data
            }
        }

        // 3. Save to Local Storage (Now contains strings, not File objects)
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = records.findIndex(r => r.id === finalRecord.id);
        if (index !== -1) {
            records[index] = { ...records[index], ...finalRecord };
        } else {
            records.unshift(finalRecord);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        // 4. Sync to Supabase
        if (supabase) {
            try {
                // Map to snake_case for Supabase
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
                        seat_test_spec: finalRecord.seat_test_spec,
                        body_pressure: finalRecord.bodyPressure,
                        body_pressure_unit: finalRecord.bodyPressureUnit,
                        tested_by: finalRecord.testedBy,
                        test_date: finalRecord.testDate,
                        test_medium: finalRecord.testMedium,
                        latitude: finalRecord.latitude,
                        longitude: finalRecord.longitude,
                        updated_at: finalRecord.updatedAt,
                        last_viewed_at: finalRecord.lastViewedAt,
                        valve_photo: finalRecord.valvePhoto,
                        file_urls: finalRecord.files || []
                    });

                if (error) {
                    console.error('Supabase DB error:', error);
                    throw error;
                }
            } catch (e) {
                console.error('Supabase connection error:', e);
            }
        }

        return finalRecord;
    },

    delete: async (id) => {
        if (supabase) {
            try {
                const { data: files } = await supabase.storage.from('valve-attachment').list(`${id}`);
                if (files && files.length > 0) {
                    await supabase.storage.from('valve-attachment').remove(files.map(f => `${id}/${f.name}`));
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
                seat_test_spec: r.seat_test_spec,
                body_pressure: r.bodyPressure,
                body_pressure_unit: r.bodyPressureUnit,
                tested_by: r.testedBy,
                test_date: r.testDate,
                test_medium: r.testMedium,
                latitude: r.latitude,
                longitude: r.longitude,
                file_urls: r.files || []
            })));

        if (error) return { error };
        return { success: true, count: localRecords.length };
    }
};
