import { supabase } from './supabaseClient';
import { dbService } from './db';
import { securityService } from './security';

const STORAGE_KEY = 'global_valve_records'; // Legacy key for migration

export const storageService = {
    // 0. Migration Helper
    migrateFromLocalStorage: async () => {
        try {
            const legacyData = localStorage.getItem(STORAGE_KEY);
            if (legacyData) {
                console.log('Migrating legacy data to Encrypted IndexedDB...');
                const records = JSON.parse(legacyData);

                // Encrypt and store each record
                const encryptedRecords = records.map(r => ({
                    id: r.id, // Keep ID cleartext for indexing? dbService uses it as key. 
                    // Yes, ObjectStore keyPath 'id' needs to exist.
                    // So we store { id, data: <encrypted_blob> } OR we encrypt fields?
                    // Plan said "Encrypts JSON objects to AES strings". 
                    // If we store the whole object as a string, IDB can't index 'id'.
                    // Better pattern: Store { id: ..., _encrypted: <ciphertext> } 
                    // OR keep 'id' and 'updatedAt' cleartext, encrypt the rest.
                    // Let's stick to simple: { id: r.id, ...r } but we encrypt the WHOLE content into a blob?
                    // No, IDB needs the key. 
                    // Let's store: { id: r.id, encryptedData: securityService.encrypt(r) }
                    id: r.id,
                    encryptedData: securityService.encrypt(r)
                }));

                await dbService.bulkPut(encryptedRecords);
                localStorage.removeItem(STORAGE_KEY); // Clear legacy
                console.log('Migration complete.');
            }
        } catch (e) {
            console.error('Migration failed:', e);
        }
    },

    getAll: async () => {
        // Run migration on first load (lazy check)
        await storageService.migrateFromLocalStorage();

        // 1. Load from Encrypted IndexedDB
        let localRecords = [];
        try {
            const encryptedItems = await dbService.getAll();
            localRecords = encryptedItems.map(item => {
                try {
                    // Decrypt the payload
                    const data = securityService.decrypt(item.encryptedData);
                    // Merge with the ID just in case, enabling ID-only lookups if needed later
                    return { ...data, id: item.id };
                } catch (err) {
                    console.error('Failed to decrypt record', item.id, err);
                    return null;
                }
            }).filter(r => r !== null); // Remove failed decryptions
        } catch (e) {
            console.error('Error reading indexedDB', e);
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
                        // Globe Control Valve Specifics
                        actuatorSerial: r.actuator_serial,
                        actuatorMake: r.actuator_make,
                        actuatorModel: r.actuator_model,
                        actuatorType: r.actuator_type,
                        actuatorOther: r.actuator_other,
                        actuatorSize: r.actuator_size,
                        actuatorRange: r.actuator_range,
                        actuatorTravel: r.actuator_travel,
                        positionerModel: r.positioner_model,
                        positionerSerial: r.positioner_serial,
                        positionerMode: r.positioner_mode,
                        positionerSignal: r.positioner_signal,
                        positionerCharacteristic: r.positioner_characteristic,
                        positionerSupply: r.positioner_supply,
                        positionerOther: r.positioner_other,
                        regulatorModel: r.regulator_model,
                        regulatorSetPoint: r.regulator_set_point,

                        // Signature
                        signatureDataUrl: r.signature_data_url,
                        signedBy: r.signed_by,
                        signedDate: r.signed_date,

                        updatedAt: r.updated_at,
                        deletedAt: r.deleted_at, // Map Soft Delete timestamp
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

                        const encryptedToSave = mergedRecords.map(r => ({
                            id: r.id,
                            encryptedData: securityService.encrypt(r)
                        }));
                        await dbService.bulkPut(encryptedToSave);

                        // Filter out deleted records for the UI
                        return mergedRecords.filter(r => !r.deletedAt);
                    }
                }
            } catch (e) {
                console.error('Database connection error during getAll', e);
            }
        }

        // Filter out deleted records for the UI (Local fallthrough)
        return localRecords.filter(r => !r.deletedAt);
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
                            const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                            // User request: Show original name first. We use suffix for uniqueness.
                            const filePath = `${finalRecord.id}/${fileNameWithoutExt}_${Date.now()}.${fileExt}`;

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

        // 3. Save to Encrypted IndexedDB (Instead of Local Storage)
        try {
            const encryptedRecord = {
                id: finalRecord.id,
                encryptedData: securityService.encrypt(finalRecord)
            };
            await dbService.put(encryptedRecord);
        } catch (e) {
            console.error('Error saving to IndexedDB', e);
            throw e; // Fail hard if local save fails
        }
        // Removed: localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

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
                        updated_at: sanitizeVal(finalRecord.updatedAt), // Re-enabled: Column added by user
                        deleted_at: sanitizeVal(finalRecord.deletedAt), // Soft Delete Support
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
                        // Globe Control Valve Specifics
                        actuator_serial: finalRecord.actuatorSerial,
                        actuator_make: finalRecord.actuatorMake,
                        actuator_model: finalRecord.actuatorModel,
                        actuator_type: finalRecord.actuatorType,
                        actuator_other: finalRecord.actuatorOther,
                        actuator_size: finalRecord.actuatorSize,
                        actuator_range: finalRecord.actuatorRange,
                        actuator_travel: finalRecord.actuatorTravel,
                        positioner_model: finalRecord.positionerModel,
                        positioner_serial: finalRecord.positionerSerial,
                        positioner_mode: finalRecord.positionerMode,
                        positioner_signal: finalRecord.positionerSignal,
                        positioner_characteristic: finalRecord.positionerCharacteristic,
                        positioner_supply: finalRecord.positionerSupply,
                        positioner_other: finalRecord.positionerOther,
                        regulator_model: finalRecord.regulatorModel,
                        regulator_set_point: finalRecord.regulatorSetPoint,

                        // Signature
                        signature_data_url: finalRecord.signatureDataUrl,
                        signed_by: sanitizeVal(finalRecord.signedBy),
                        signed_date: sanitizeVal(finalRecord.signedDate),

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
        // Soft Delete: Set deleted_at timestamp
        const deletedAt = new Date().toISOString();

        if (supabase) {
            try {
                // Soft Delete in Cloud
                const { error } = await supabase
                    .from('valve_records')
                    .update({ deleted_at: deletedAt })
                    .eq('id', id);

                if (error) {
                    console.error('Supabase soft delete error', error);
                    // Fallback: If column missing (user didn't run SQL?), warn user
                    if (error.code === '42703') alert("Database error: Missing 'deleted_at' column. Please run the SQL script.");
                }
            } catch (e) {
                console.error('Supabase connection error during delete', e);
            }
        }

        // Update Encrypted IndexedDB
        try {
            const encryptedItem = await dbService.get(id);
            if (encryptedItem) {
                const record = securityService.decrypt(encryptedItem.encryptedData);
                if (record) {
                    record.deletedAt = deletedAt;
                    await dbService.put({
                        id: record.id,
                        encryptedData: securityService.encrypt(record)
                    });
                }
            }
        } catch (e) {
            console.error('Error deleting from IndexedDB', e);
        }
    },

    restore: async (id) => {
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_records')
                    .update({ deleted_at: null })
                    .eq('id', id);
                if (error) console.error('Supabase restore error', error);
            } catch (e) {
                console.error('Supabase connection error during restore', e);
            }
        }

        try {
            const encryptedItem = await dbService.get(id);
            if (encryptedItem) {
                const record = securityService.decrypt(encryptedItem.encryptedData);
                if (record) {
                    record.deletedAt = null;
                    await dbService.put({
                        id: record.id,
                        encryptedData: securityService.encrypt(record)
                    });
                }
            }
        } catch (e) {
            console.error('Error restoring from IndexedDB', e);
        }
    },

    getHistory: async (valveId) => {
        if (!supabase) return [];
        try {
            const { data, error } = await supabase
                .from('valve_history')
                .select('*')
                .eq('valve_id', valveId)
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data.map(h => ({
                id: h.id,
                changedAt: h.changed_at,
                snapshot: h.snapshot // This is the JSON record
            }));
        } catch (e) {
            console.error('Error fetching history:', e);
            return [];
        }
    },

    getDeletedRecords: async () => {
        // Return local records that are marked deleted
        // Return local records that are marked deleted
        const encryptedItems = await dbService.getAll();
        const records = encryptedItems.map(item => securityService.decrypt(item.encryptedData)).filter(r => r);
        return records.filter(r => r.deletedAt);
    },

    getGlobalHistory: async () => {
        if (!supabase) return [];
        try {
            const { data, error } = await supabase
                .from('valve_history')
                .select('*, valve_records(serial_number)')
                .order('changed_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data.map(h => ({
                id: h.id,
                valveId: h.valve_id,
                serialNumber: h.valve_records?.serial_number || 'Unknown',
                changedAt: h.changed_at,
                snapshot: h.snapshot
            }));
        } catch (e) {
            console.error('Error fetching global history:', e);
            return [];
        }
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
            const encryptedItems = await dbService.getAll();
            localRecords = encryptedItems.map(item => securityService.decrypt(item.encryptedData)).filter(r => r);
        } catch (e) {
            return { error: 'Failed to read local database' };
        }

        if (localRecords.length === 0) return { success: true, count: 0 };

        let syncedCount = 0;
        const failedRecords = [];
        let lastError = null;

        // We need to process records one by one (or in chunks) to handle file uploads
        // EMERGENCY DEBUG SYNC: Skipping ALL file uploads to isolate "AbortError"
        // If this works, the issue is DEFINITELY file size/network blocking uploads.

        const BATCH_SIZE = 1;
        const recordsToUpsert = [];

        for (let i = 0; i < localRecords.length; i++) {
            let record = { ...localRecords[i] };

            // SKIP ALL FILE PROCESSING logic for now.
            // Just ensure timestamp
            if (!record.updatedAt) {
                record.updatedAt = new Date().toISOString();
            }

            // Sanitize
            const sanitizeVal = (val) => (!val || val === '') ? null : val;
            const sanitizeNum = (val) => {
                if (val === '' || val === null || val === undefined) return null;
                return isNaN(val) ? null : val;
            };

            // STRICTLY NO FILES
            recordsToUpsert.push({
                id: record.id,
                created_at: sanitizeVal(record.createdAt),
                updated_at: sanitizeVal(record.updatedAt),
                deleted_at: sanitizeVal(record.deletedAt),
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
                size_class: sanitizeVal(record.sizeClass),
                packing_type: record.packingType,
                flange_type: record.flangeType,
                mawp: sanitizeNum(record.mawp),
                body_material: record.bodyMaterial,
                seat_material: record.seatMaterial,
                trim_material: record.trimMaterial,
                obturator_material: record.obturatorMaterial,
                actuator: record.actuator,
                gear_operator: record.gearOperator,
                fail_mode: record.failMode,
                body_test_spec: record.bodyTestSpec,
                seat_test_spec: record.seat_test_spec,
                body_pressure: sanitizeNum(record.bodyPressure),
                body_pressure_unit: record.bodyPressureUnit,
                tested_by: record.testedBy,
                test_date: sanitizeVal(record.testDate),
                test_medium: record.testMedium,
                latitude: sanitizeNum(record.latitude),
                longitude: sanitizeNum(record.longitude),
                valve_photo: null, // Force Null
                file_urls: []      // Force Empty
            });
        }

        console.log('[SyncDebug] Emergency Mode: Attempting to sync ' + recordsToUpsert.length + ' records (TEXT ONLY)');

        // 3. Batch Upsert to Supabase
        if (recordsToUpsert.length > 0) {
            try {
                for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
                    const chunk = recordsToUpsert.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('valve_records').upsert(chunk, { onConflict: 'id' });

                    if (error) {
                        console.error('Batch sync failed:', error);
                        lastError = error;
                        chunk.forEach(r => failedRecords.push(r.id));
                    } else {
                        syncedCount += chunk.length;
                    }
                }
            } catch (batchErr) {
                console.error('Batch exception:', batchErr);
                lastError = batchErr;
                failedRecords.push('batch-failure');
            }
        }

        // Skip local storage update since we didn't process files
        if (failedRecords.length > 0) {
            return { success: false, count: syncedCount, error: `Failed to sync. Last Error: ${lastError?.message}` };
        }

        let cloudTotal = 'unknown';
        if (supabase) {
            const { count } = await supabase.from('valve_records').select('*', { count: 'exact', head: true });
            cloudTotal = count;
        }

        return { success: true, count: syncedCount, cloudTotal };
    }
};
