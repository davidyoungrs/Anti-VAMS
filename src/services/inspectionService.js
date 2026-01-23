import { supabase } from './supabaseClient';

const STORAGE_KEY = 'valve_inspections';

// Define the 41 valve components
export const VALVE_COMPONENTS = [
    'bearingCap', 'capscrews', 'stemNut', 'upperBearing', 'lowerBearing',
    'greaseFitting', 'handwheelOring', 'handwheel', 'stemProtectorAssembly',
    'indicatorRod', 'rodWiper', 'bevelGearOperator', 'stemProtector',
    'pipeCap', 'indicatorRod2', 'rodWiper2', 'bodyBonnetStuds',
    'bodyBonnetNuts', 'yokeBonnetStuds', 'yokeBonnetNuts', 'body',
    'bonnet', 'yokeTube', 'packingInjection', 'ventFittings',
    'greaseFittings', 'reliefValve', 'nippleRV', 'elbow',
    'bodyBonnetSeal', 'seatRearOrings', 'yokeTubeGasket', 'packingSet',
    'gateSegmentAssembly', 'stem', 'seatAssembly', 'gateSkirt',
    'seatSkirt', 'other'
];

export const COMPONENT_LABELS = {
    bearingCap: 'Bearing Cap',
    capscrews: 'Capscrews',
    stemNut: 'Stem Nut',
    upperBearing: 'Upper Bearing',
    lowerBearing: 'Lower Bearing',
    greaseFitting: 'Grease Fitting',
    handwheelOring: 'Handwheel Operator O-ring',
    handwheel: 'Handwheel',
    stemProtectorAssembly: 'Stem Protector Assembly',
    indicatorRod: 'Indicator Rod',
    rodWiper: 'Rod Wiper',
    bevelGearOperator: 'Bevel Gear Operator',
    stemProtector: 'Stem Protector',
    pipeCap: 'Pipe Cap',
    indicatorRod2: 'Indicator Rod (2)',
    rodWiper2: 'Rod Wiper (2)',
    bodyBonnetStuds: 'Body / Bonnet Studs',
    bodyBonnetNuts: 'Body / Bonnet Nuts',
    yokeBonnetStuds: 'Yoke Tube / Bonnet Studs',
    yokeBonnetNuts: 'Yoke Tube / Bonnet Nuts',
    body: 'Body',
    bonnet: 'Bonnet',
    yokeTube: 'Yoke Tube',
    packingInjection: 'Packing Injection Assembly',
    ventFittings: 'Vent Fittings x2',
    greaseFittings: 'Grease Fittings x3',
    reliefValve: 'Relief Valve',
    nippleRV: 'Nipple (RV)',
    elbow: 'Elbow',
    bodyBonnetSeal: 'Body / Bonnet Seal',
    seatRearOrings: 'Seat Rear O-rings x2',
    yokeTubeGasket: 'Yoke Tube Gasket',
    packingSet: 'Packing Set',
    gateSegmentAssembly: 'Gate & Segment Assembly',
    stem: 'Stem',
    seatAssembly: 'Seat Assembly x2',
    gateSkirt: 'Gate Skirt',
    seatSkirt: 'Seat Skirt',
    other: 'Other'
};

export const CONDITION_OPTIONS = [
    { value: '', label: 'Select' },
    { value: 'VGood', label: 'Very Good' },
    { value: 'Good', label: 'Good' },
    { value: 'Fair', label: 'Fair' },
    { value: 'Poor', label: 'Poor' },
    { value: 'BER', label: 'BER' },
    { value: 'Contaminated', label: 'Contaminated' }
];

export const ACTION_OPTIONS = [
    { value: '', label: 'Select' },
    { value: 'Replace', label: 'Replace' },
    { value: 'Cleaned', label: 'Cleaned' },
    { value: 'Blast Cleaned', label: 'Blast Cleaned' },
    { value: 'Paint', label: 'Paint' },
    { value: 'Lapped', label: 'Lapped' },
    { value: 'Machined', label: 'Machined' },
    { value: 'Welded', label: 'Welded' },
    { value: 'New Next Time', label: 'New Next Time' }
];

export const inspectionService = {
    // Get all inspections for a specific valve
    getByValveId: async (valveId) => {
        // 1. Try local storage first
        let localInspections = [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allInspections = data ? JSON.parse(data) : [];
            localInspections = allInspections.filter(i => i.valveId === valveId);
        } catch (e) {
            console.error('Error reading local inspections', e);
        }

        // 2. Try Supabase
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('valve_inspections')
                    .select('*')
                    .eq('valve_id', valveId)
                    .order('inspection_date', { ascending: false });

                if (error) {
                    console.warn('Database fetch failed, using local inspections', error);
                    return localInspections;
                }

                if (data) {
                    const cloudInspections = data.map(i => ({
                        id: i.id,
                        valveId: i.valve_id,
                        createdAt: i.created_at,
                        inspectionDate: i.inspection_date,
                        inspectorName: i.inspector_name,
                        components: i.components || {},
                        repairNotes: i.repair_notes,
                        overallResult: i.overall_result,
                        inspectionPhotos: i.inspection_photos || []
                    }));

                    // Update local storage
                    const allLocal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    const otherValves = allLocal.filter(i => i.valveId !== valveId);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherValves, ...cloudInspections]));

                    return cloudInspections;
                }
            } catch (e) {
                console.error('Database connection error', e);
            }
        }

        return localInspections;
    },

    // Save (create or update) an inspection
    save: async (inspection) => {
        let finalInspection = { ...inspection };

        // 1. Prepare ID and metadata
        if (!finalInspection.id) {
            finalInspection.id = crypto.randomUUID();
            finalInspection.createdAt = new Date().toISOString();
        }

        // 2. Save to local storage first
        const allInspections = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = allInspections.findIndex(i => i.id === finalInspection.id);
        if (index !== -1) {
            allInspections[index] = finalInspection;
        } else {
            allInspections.unshift(finalInspection);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allInspections));

        // 3. Handle photo uploads
        if (supabase && finalInspection.inspectionPhotos && finalInspection.inspectionPhotos.length > 0) {
            try {
                const uploadedUrls = await Promise.all(finalInspection.inspectionPhotos.map(async (photo) => {
                    if (typeof photo === 'string') return photo; // Already a URL

                    const fileExt = photo.name.split('.').pop();
                    const filePath = `inspections/${finalInspection.id}/${crypto.randomUUID()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('valve-attachment')
                        .upload(filePath, photo);

                    if (uploadError) {
                        console.error('Photo upload failed:', uploadError);
                        return null;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('valve-attachment')
                        .getPublicUrl(filePath);

                    return publicUrl;
                }));

                finalInspection.inspectionPhotos = uploadedUrls.filter(url => url !== null);

                // Update local storage with URLs
                const updated = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                const idx = updated.findIndex(i => i.id === finalInspection.id);
                if (idx !== -1) {
                    updated[idx].inspectionPhotos = finalInspection.inspectionPhotos;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                }
            } catch (e) {
                console.error('Error during photo upload:', e);
            }
        }

        // 4. Try online save
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_inspections')
                    .upsert({
                        id: finalInspection.id,
                        valve_id: finalInspection.valveId,
                        created_at: finalInspection.createdAt,
                        inspection_date: finalInspection.inspectionDate,
                        inspector_name: finalInspection.inspectorName,
                        components: finalInspection.components || {},
                        repair_notes: finalInspection.repairNotes,
                        overall_result: finalInspection.overallResult,
                        inspection_photos: finalInspection.inspectionPhotos || []
                    });

                if (error) {
                    console.error('Supabase DB error:', error);
                    throw error;
                }
            } catch (e) {
                console.error('Supabase connection error:', e);
            }
        }

        return finalInspection;
    },

    // Delete an inspection
    delete: async (id) => {
        if (supabase) {
            try {
                // Delete photos from storage
                const { data: files } = await supabase.storage
                    .from('valve-attachment')
                    .list(`inspections/${id}`);

                if (files && files.length > 0) {
                    await supabase.storage
                        .from('valve-attachment')
                        .remove(files.map(f => `inspections/${id}/${f.name}`));
                }

                const { error } = await supabase
                    .from('valve_inspections')
                    .delete()
                    .eq('id', id);

                if (error) console.error('Supabase delete error', error);
            } catch (e) {
                console.error('Supabase connection error during delete', e);
            }
        }

        // Delete from local storage
        const allInspections = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const filtered = allInspections.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
