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
                // Helper to sanitize fields (Supabase/Postgres dislikes empty strings for dates & numbers)
                const sanitizeVal = (val) => (!val || val === '') ? null : val;

                // Helper for numeric fields that might be strings in JS
                const sanitizeNum = (val) => {
                    if (val === '' || val === null || val === undefined) return null;
                    return isNaN(val) ? null : val;
                };

                // Map to snake_case for Supabase
                const { error } = await supabase
                    .from('valve_records')
                    .upsert({
                        id: finalRecord.id,
                        created_at: sanitizeVal(finalRecord.createdAt),
                        // updated_at: sanitizeVal(finalRecord.updatedAt), // Removed: Column missing in DB
                        serial_number: finalRecord.serialNumber,
                        customer: finalRecord.customer,
                        oem: finalRecord.oem,
                        job_no: finalRecord.jobNo,
                        tag_no: finalRecord.tagNo,
                        order_no: finalRecord.orderNo,
                        date_in: sanitizeVal(finalRecord.dateIn),
                        status: finalRecord.status || 'Pending',
                        pass_fail: finalRecord.passFail || 'Pending',
                        plant_area: finalRecord.plantArea,
                        site_location: finalRecord.siteLocation,
                        required_date: sanitizeVal(finalRecord.requiredDate),
                        safety_check: finalRecord.safetyCheck,
                        decontamination_cert: finalRecord.decontaminationCert,
                        lsa_check: finalRecord.lsaCheck,
                        seized_mid_stroke: finalRecord.seizedMidStroke,
                        model_no: finalRecord.modelNo,
                        valve_type: finalRecord.valveType,
                        size_class: sanitizeVal(finalRecord.sizeClass),
                        packing_type: finalRecord.packingType,
                        flange_type: finalRecord.flangeType,
                        mawp: sanitizeNum(finalRecord.mawp),
                        body_material: finalRecord.bodyMaterial,
                        seat_material: finalRecord.seatMaterial,
                        trim_material: finalRecord.trimMaterial,
                        obturator_material: finalRecord.obturatorMaterial,
                        actuator: finalRecord.actuator,
                        gear_operator: finalRecord.gearOperator,
                        fail_mode: finalRecord.failMode,
                        body_test_spec: finalRecord.bodyTestSpec,
                        seat_test_spec: finalRecord.seat_test_spec,
                        body_pressure: sanitizeNum(finalRecord.bodyPressure),
                        body_pressure_unit: finalRecord.bodyPressureUnit,
                        tested_by: finalRecord.testedBy,
                        test_date: sanitizeVal(finalRecord.testDate),
                        test_medium: finalRecord.testMedium,
                        latitude: sanitizeNum(finalRecord.latitude),
                        longitude: sanitizeNum(finalRecord.longitude),
                        // last_viewed_at: finalRecord.lastViewedAt, // Removed: Local only
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

        let localRecords = [];
        try {
            localRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return { error: 'Failed to read local storage' };
        }

        if (localRecords.length === 0) return { success: true, count: 0 };

        let syncedCount = 0;
        const failedRecords = [];
        let lastError = null;

        // We need to process records one by one (or in chunks) to handle file uploads
        for (let i = 0; i < localRecords.length; i++) {
            let record = { ...localRecords[i] };
            let recordModified = false;

            try {
                // 1. Process Files: Upload Base64 strings to Supabase Storage
                if (record.files && record.files.length > 0) {
                    const processedFiles = await Promise.all(record.files.map(async (file) => {
                        // Check if it's a Base64 string (starts with data:)
                        if (typeof file === 'string' && file.startsWith('data:')) {
                            try {
                                // Convert Base64 to Blob
                                const res = await fetch(file);
                                const blob = await res.blob();

                                // Generate path
                                const fileExt = file.substring(file.indexOf('/') + 1, file.indexOf(';'));
                                const fileName = `${Date.now()}_offline_upload.${fileExt}`;
                                const filePath = `${record.id}/${fileName}`;

                                // Upload
                                const { error: uploadError } = await supabase.storage
                                    .from('valve-attachment')
                                    .upload(filePath, blob);

                                if (!uploadError) {
                                    const { data: { publicUrl } } = supabase.storage
                                        .from('valve-attachment')
                                        .getPublicUrl(filePath);
                                    recordModified = true;
                                    return publicUrl;
                                } else {
                                    console.warn('Failed to upload offline file during sync:', uploadError);
                                    return file; // Keep Base64 if upload fails? Or fail the sync? Let's keep it for now.
                                }
                            } catch (err) {
                                console.error('Error processing offline file:', err);
                                return file;
                            }
                        }
                        return file; // Already a URL or normal string
                    }));

                    record.files = processedFiles;
                }

                // 2. Process Valve Photo: Same logic
                if (record.valvePhoto && typeof record.valvePhoto === 'string' && record.valvePhoto.startsWith('data:')) {
                    try {
                        const res = await fetch(record.valvePhoto);
                        const blob = await res.blob();
                        const fileExt = record.valvePhoto.substring(record.valvePhoto.indexOf('/') + 1, record.valvePhoto.indexOf(';'));
                        const filePath = `${record.id}/valve-photo-${Date.now()}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from('valve-attachment')
                            .upload(filePath, blob);

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('valve-attachment')
                                .getPublicUrl(filePath);
                            record.valvePhoto = publicUrl;
                            recordModified = true;
                        }
                    } catch (err) {
                        console.error('Error processing valve photo:', err);
                    }
                }

                // Helper to sanitize fields (Supabase/Postgres dislikes empty strings for dates & numbers)
                const sanitizeVal = (val) => (!val || val === '') ? null : val;

                // Helper for numeric fields that might be strings in JS
                const sanitizeNum = (val) => {
                    if (val === '' || val === null || val === undefined) return null;
                    return isNaN(val) ? null : val;
                };

                // 3. Upsert to Supabase
                const response = supabase
                    .from('valve_records')
                    .upsert({
                        id: record.id,
                        created_at: sanitizeVal(record.createdAt),
                        // updated_at: sanitizeVal(record.updatedAt), // Removed: Column missing in DB
                        serial_number: record.serialNumber,
                        customer: record.customer,
                        oem: record.oem,
                        job_no: record.jobNo,
                        tag_no: record.tagNo,
                        order_no: record.orderNo,
                        date_in: sanitizeVal(record.dateIn),
                        status: record.status,
                        pass_fail: record.passFail,
                        plant_area: record.plantArea,
                        site_location: record.siteLocation,
                        required_date: sanitizeVal(record.requiredDate),
                        safety_check: record.safetyCheck,
                        decontamination_cert: record.decontaminationCert,
                        lsa_check: record.lsaCheck,
                        seized_mid_stroke: record.seizedMidStroke,
                        model_no: record.modelNo,
                        valve_type: record.valveType,
                        size_class: sanitizeVal(record.sizeClass), // Often mixed type, safest to treat as string or null if empty
                        packing_type: record.packingType,
                        flange_type: record.flangeType,
                        mawp: sanitizeNum(record.mawp), // Likely numeric
                        body_material: record.bodyMaterial,
                        seat_material: record.seatMaterial,
                        trim_material: record.trimMaterial,
                        obturator_material: record.obturatorMaterial,
                        actuator: record.actuator,
                        gear_operator: record.gearOperator,
                        fail_mode: record.failMode,
                        body_test_spec: record.bodyTestSpec,
                        seat_test_spec: record.seat_test_spec,
                        body_pressure: sanitizeNum(record.bodyPressure), // Likely numeric
                        body_pressure_unit: record.bodyPressureUnit,
                        tested_by: record.testedBy,
                        test_date: sanitizeVal(record.testDate),
                        test_medium: record.testMedium,
                        latitude: sanitizeNum(record.latitude),
                        longitude: sanitizeNum(record.longitude),
                        // last_viewed_at: sanitizeVal(record.lastViewedAt), // Removed: Column missing in DB, preventing sync. Local only feature for now.
                        valve_photo: record.valvePhoto,
                        file_urls: record.files || []
                    });

                // verify write
                const { data, error } = await response.select();

                if (error || (data && data.length === 0)) {
                    failedRecords.push(record.id);
                    if (data && data.length === 0) {
                        lastError = { message: "Write ignored by database. Check Supabase RLS Policies." };
                        console.warn(`Record ${record.serialNumber} sync ignored (RLS blocked?)`);
                    } else {
                        lastError = error;
                        console.error(`Failed to sync record ${record.serialNumber}. Error: ${error.message} (Code: ${error.code})`, error);
                    }
                } else {
                    syncedCount++;
                    // 4. Update Local Storage if we successfully uploaded files (converted Base64 -> URL)
                    if (recordModified) {
                        localRecords[i] = record;
                    }
                }

            } catch (err) {
                console.error(`Exception syncing record ${localRecords[i].serialNumber}:`, err);
                failedRecords.push(localRecords[i].id);
                lastError = err;
            }
        }

        // Save back any URL updates to local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));

        if (failedRecords.length > 0) {
            // Return detailed error for the user
            const errorMsg = lastError ? (lastError.message || JSON.stringify(lastError)) : 'Unknown error';
            return { success: false, count: syncedCount, error: `Failed to sync ${failedRecords.length} records. Last Error: ${errorMsg}` };
        }

        // Final Verify: Get total count from cloud
        let cloudTotal = 'unknown';
        if (supabase) {
            const { count } = await supabase.from('valve_records').select('*', { count: 'exact', head: true });
            cloudTotal = count;
        }

        return { success: true, count: syncedCount, cloudTotal };
    }
};
