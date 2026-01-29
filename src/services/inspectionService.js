import { supabase } from './supabaseClient';

const STORAGE_KEY = 'valve_inspections';

// Define the 41 valve components
// Comprehensive Component Labels Map
export const COMPONENT_LABELS = {
    // Common / Gate
    body: 'Body',
    bonnet: 'Bonnet',
    stem: 'Stem',
    actuator: 'Actuator',
    handwheel: 'Handwheel',
    seatAssembly: 'Seat Assembly',
    packingSet: 'Packing Set',
    gasket: 'Gasket',
    bolts: 'Bolts',
    nuts: 'Nuts',

    // Ball Valve
    centerSection: 'Body (Center Section)',
    endClosure: 'End Closure / End Cap',
    stemHousing: 'Bonnet / Stem Housing',
    bodyGasket: 'Body Gasket',
    bonnetGasket: 'Bonnet Gasket',
    ball: 'Ball',
    upperTrunnion: 'Upper Trunnion / Stem Journal',
    lowerTrunnion: 'Lower Trunnion',
    trunnionBearings: 'Trunnion Bearings / Bushings',
    thrustBearings: 'Thrust Bearings / Washers',
    seatRing: 'Seat Ring',
    seatInsert: 'Seat Insert (Soft)',
    seatSprings: 'Seat Energizer Springs',
    seatOrings: 'Seat O-rings',
    seatBackupRings: 'Seat Back-up Rings',
    stemPacking: 'Stem Packing Rings',
    packingFollower: 'Packing Follower / Gland',
    packingFlange: 'Packing Flange',
    packingStuds: 'Packing Flange Studs',
    packingNuts: 'Packing Flange Nuts',
    stemThrustWasher: 'Stem Thrust Washer',
    stemOrings: 'Stem O-rings',
    stemBearings: 'Stem Bearings / Bushings',
    antiBlowout: 'Anti-blowout Retainer',
    antiStatic: 'Anti-static Spring & Ball',
    graphiteRings: 'Fire-safe Graphite Rings',
    bodyBolts: 'Body Bolts',
    bodyNuts: 'Body Nuts',
    bonnetBolts: 'Bonnet Bolts',
    bonnetNuts: 'Bonnet Nuts',
    trunnionCover: 'Trunnion Cover',
    trunnionGasket: 'Trunnion Cover Gasket',
    trunnionBolts: 'Trunnion Cover Bolts & Nuts',
    drainPlug: 'Drain Plug',
    ventPlug: 'Vent Plug',
    seatInjection: 'Seat Injection Fittings',
    stemInjection: 'Stem Injection Fitting',
    greaseFittings: 'Grease Fittings',
    cavityRelief: 'Cavity Relief Valve',
    mountingPad: 'Mounting Pad (ISO 5211)',
    coupling: 'Coupling / Drive Sleeve',
    leverGearbox: 'Lever or Gearbox',
    lockingDevice: 'Locking Device',
    positionStops: 'Position Stops',

    // Globe Control Valve
    plug: 'Plug',
    cage: 'Cage',
    bodyCasting: 'Body Casting',
    bodyBonnetGktFace: 'Body / Bonnet Gasket Face',
    bodySeatGktFace: 'Body / Seat Gasket Face',
    bodyStudsNuts: 'Body Studs & Nuts',
    plugSeal: 'Plug Seal',
    bonnetPackingBore: 'Bonnet Packing Bore',
    glandFollower: 'Gland Follower',
    glandFlange: 'Gland Packing Flange',
    glandStudsNuts: 'Gland Studs & Nuts',
    yoke: 'Yoke',
    base: 'Base',
    cover: 'Cover',
    diaphragmPlate: 'Diaphragm Plate',
    diaphragm: 'Diaphragm',
    diaphragmStop: 'Diaphragm Stop',
    actuatorStem: 'Actuator Stem',
    setscrews: 'Setscrews',
    casingBolts: 'Casing Bolts',
    casingNuts: 'Casing Nuts',
    eyebolts: 'Eyebolts',
    springPlate: 'Spring Plate',
    springAdjuster: 'Spring Adjuster',
    spring: 'Spring',
    oRings: 'O-rings',
    seal: 'Seal',
    bush: 'Bush',
    connectorBlock: 'Connector Block',
    travelPointer: 'Travel Pointer',
    lockNuts: 'Lock Nuts',
    travelIndicator: 'Travel Indicator',
    selfTapScrews: 'Self Tap Screws',
    housing: 'Housing',
    thrustWasher: 'Thrust Washer',
    thrustBearing: 'Thrust Bearing',
    key: 'Key',
    retainingRing: 'Retaining Ring',
    springWasher: 'Spring Washer',
    antiRotationPlate: 'Anti Rotation Plate',
    adjustingScrew: 'Adjusting Screw',
    travelStop: 'Travel Stop',
    capscrew: 'Capscrew',
    yokeSpacer: 'Yoke Spacer',
    sealWasher: 'Seal Washer',
    positionerOverall: 'Positioner Overall',
    gauges: 'Gauges',
    tubingFittings: 'Tubing / Fittings',
    softGoods: 'Soft Goods Kit',
    relayAssy: 'Relay Assembly',
    nozzleFlapper: 'Nozzle / Flapper',
    travelPinAssy: 'Travel Pin Assy',
    feedbackArm: 'Feedback Arm',
    magneticArray: 'Magnetic Array',
    mountingBracket: 'Mounting Bracket',
    regulator: 'Regulator',
    booster: 'Booster',
    ipTransducer: 'I/P Transducer',
    handjack: 'Handjack',
    solenoid: 'Solenoid',
    tripValve: 'Trip Valve',
    quickExhaust: 'Quick Exhaust',
    glandPacking: 'Gland Packing',
    gaskets: 'Gaskets',
    packing: 'Packing',
    bolt: 'Bolt',
    nut: 'Nut',

    // Butterfly
    disc: 'Disc',
    shaft: 'Stem / Shaft',
    liner: 'Seat / Liner',
    bodyLiner: 'Body Liner',
    upperBushing: 'Upper Stem Bushing',
    lowerBushing: 'Lower Stem Bushing',
    packingGland: 'Packing Gland / Follower',
    discPin: 'Disc Pin / Taper Pin',
    topCover: 'Top Cover / Stem Retainer',
    topCoverGasket: 'Top Cover Gasket',
    nameplate: 'Nameplate',
    laminatedSeat: 'Laminated Seat',
    metalSeat: 'Metal Seat Ring',
    sealRetainer: 'Seal Ring Retainer',
    liveLoadedPacking: 'Live-loaded Packing',
    bodySealRing: 'Body Seal Ring',

    // Check Valve
    swingClapper: 'Disc (Swing Clapper)',
    discSeating: 'Disc Seating Surface',
    hingeArm: 'Hinge Arm',
    hingePin: 'Hinge Pin',
    hingeBushings: 'Hinge Pin Bushings',
    hingeCover: 'Hinge Pin Cover Plate',
    hingeCoverGasket: 'Hinge Pin Cover Gasket',
    hingeCoverBolts: 'Hinge Pin Cover Bolts',
    discStop: 'Disc Stop',
    discNut: 'Disc Nut',
    discWasher: 'Disc Washer',
    counterweightArm: 'Counterweight Arm',
    counterweight: 'Counterweight',
    dashpotAssy: 'Dashpot Assembly',

    // Plug Valve
    twinSealPlug: 'Twin Seal Plug',
    plugSeals: 'Plug Seal Rings',
    sealRetainers: 'Seal Ring Retainers',
    secondarySeals: 'Secondary Seals',
    plugStem: 'Plug Stem / Drive Shaft',
    lowerBearing: 'Lower Plug Bearing',
    upperBearing: 'Upper Plug Bearing',
    balancePorts: 'Pressure Balance Ports',
    bleedPort: 'Bleed Port Connection',
    bleedValve: 'Bleed Valve',
    sealantInjection: 'Sealant Injection Fittings',
    sealantCheck: 'Sealant Check Valves',
    sealantGrooves: 'Sealant Distribution Grooves',

    // Relief Valve
    inletNozzle: 'Valve Body / Inlet Nozzle',
    outletBody: 'Outlet Body / Cap',
    discHolder: 'Disc Holder',
    nozzleSeat: 'Nozzle Seat',
    guide: 'Guide',
    spindle: 'Spindle / Stem',
    blowdownRing: 'Blowdown Ring',
    guideBushing: 'Guide Bushing',
    cap: 'Cap',
    capGasket: 'Cap Gasket',
    testLever: 'Test Lever Assembly',
    leverPin: 'Lever Pin',
    packedLeverPacking: 'Packed Lever Packing',
    liftingFork: 'Lifting Fork / Yoke',
    bellows: 'Bellows',
    bellowsFlange: 'Bellows Flange',
    liftIndicator: 'Lift Indicator',
    remoteSolenoid: 'Remote Lift Solenoid',

    // Existing Gate/Generic
    bearingCap: 'Bearing Cap',
    capscrews: 'Capscrews',
    stemNut: 'Stem Nut',
    greaseFitting: 'Grease Fitting',
    handwheelOring: 'Handwheel Operator O-ring',
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
    yokeTube: 'Yoke Tube',
    packingInjection: 'Packing Injection Assembly',
    ventFittings: 'Vent Fittings x2',
    nippleRV: 'Nipple (RV)',
    elbow: 'Elbow',
    bodyBonnetSeal: 'Body / Bonnet Seal',
    seatRearOrings: 'Seat Rear O-rings x2',
    yokeTubeGasket: 'Yoke Tube Gasket',
    gateSegmentAssembly: 'Gate & Segment Assembly',
    gateSkirt: 'Gate Skirt',
    seatSkirt: 'Seat Skirt',
    other: 'Other'
};

export const VALVE_COMPONENT_CONFIGS = {
    'Gate Valve': {
        'Body & Bonnet': ['bonnet', 'body', 'bodyBonnetStuds', 'bodyBonnetNuts', 'yokeBonnetStuds', 'yokeBonnetNuts', 'yokeTube'],
        'Internal Components': ['gateSegmentAssembly', 'stem', 'seatAssembly', 'gateSkirt', 'seatSkirt'],
        'Fittings & Accessories': ['packingInjection', 'ventFittings', 'greaseFittings', 'reliefValve', 'nippleRV', 'elbow'],
        'Seals & Packing': ['bodyBonnetSeal', 'seatRearOrings', 'yokeTubeGasket', 'packingSet'],
        'Operator Components': ['bearingCap', 'capscrews', 'stemNut', 'upperBearing', 'lowerBearing', 'greaseFitting', 'handwheelOring', 'handwheel', 'stemProtectorAssembly', 'indicatorRod', 'rodWiper', 'bevelGearOperator', 'stemProtector', 'pipeCap', 'indicatorRod2', 'rodWiper2'],
        'Other': ['other']
    },
    'Ball Valve': {
        'Body': ['centerSection', 'endClosure', 'stemHousing', 'bodyGasket', 'bonnetGasket', 'bodyBolts', 'bodyNuts', 'bonnetBolts', 'bonnetNuts', 'drainPlug', 'ventPlug'],
        'Trim': ['ball', 'upperTrunnion', 'lowerTrunnion', 'trunnionBearings', 'thrustBearings', 'seatRing', 'seatInsert', 'seatSprings', 'seatOrings', 'seatBackupRings'],
        'Stem & Packing': ['stem', 'stemPacking', 'packingFollower', 'packingFlange', 'packingStuds', 'packingNuts', 'stemThrustWasher', 'stemOrings', 'stemBearings', 'antiBlowout', 'antiStatic', 'graphiteRings'],
        'Trunnion': ['trunnionCover', 'trunnionGasket', 'trunnionBolts'],
        'Fittings': ['seatInjection', 'stemInjection', 'greaseFittings', 'cavityRelief'],
        'Operator': ['mountingPad', 'coupling', 'leverGearbox', 'lockingDevice', 'positionStops']
    },
    'Globe Control Valve': {
        'Valve Body': ['plug', 'stem', 'seatRing', 'cage', 'bodyCasting', 'bodyBonnetGktFace', 'bodySeatGktFace', 'bodyStudsNuts', 'plugSeal', 'gaskets', 'packing', 'bonnetPackingBore', 'glandFollower', 'glandFlange', 'glandStudsNuts', 'glandPacking'],
        'Actuator': ['yoke', 'base', 'cover', 'diaphragmPlate', 'diaphragm', 'diaphragmStop', 'actuatorStem', 'gaskets', 'setscrews', 'casingBolts', 'casingNuts', 'eyebolts', 'springPlate', 'springAdjuster', 'spring', 'oRings', 'seal', 'bush', 'connectorBlock', 'travelPointer', 'lockNuts', 'travelIndicator', 'selfTapScrews', 'housing', 'stem', 'handwheel', 'thrustWasher', 'thrustBearing', 'key', 'retainingRing', 'bolt', 'springWasher', 'nut', 'antiRotationPlate', 'adjustingScrew', 'travelStop', 'capscrew', 'yokeSpacer', 'sealWasher'],
        'Positioner': ['positionerOverall', 'gauges', 'tubingFittings', 'softGoods', 'relayAssy', 'nozzleFlapper', 'cover', 'travelPinAssy', 'feedbackArm', 'magneticArray', 'mountingBracket'],
        'Ancillaries': ['regulator', 'gauges', 'booster', 'ipTransducer', 'handjack', 'reliefValve', 'solenoid', 'tripValve', 'quickExhaust']
    },
    'Butterfly Valve': {
        'Body & Stem': ['body', 'disc', 'shaft', 'liner', 'bodyLiner', 'upperBushing', 'lowerBushing', 'stemOrings', 'stemPacking', 'packingGland', 'packingStuds', 'packingNuts', 'discPin', 'bodyGasket', 'bodyBolts', 'bodyNuts', 'mountingPad', 'topCover', 'topCoverGasket', 'nameplate'],
        'High Performance': ['laminatedSeat', 'metalSeat', 'sealRetainer', 'thrustBearing', 'liveLoadedPacking', 'bodySealRing'],
        'Control Accessories': ['actuator', 'positionerOverall', 'ipTransducer', 'solenoid', 'regulator', 'booster', 'lockingDevice']
    },
    'Check Valve': {
        'Body': ['body', 'bonnet', 'bodyGasket', 'bodyBonnetStuds', 'bodyBonnetNuts', 'drainPlug', 'ventPlug'],
        'Internals': ['swingClapper', 'discSeating', 'seatRing', 'hingeArm', 'hingePin', 'hingeBushings', 'hingeCover', 'hingeCoverGasket', 'hingeCoverBolts', 'discStop', 'discNut', 'discWasher'],
        'Accessories': ['counterweightArm', 'counterweight', 'dashpotAssy']
    },
    'Plug Valve': {
        'Body': ['body', 'bonnet', 'bodyGasket', 'bodyBolts', 'bodyNuts', 'drainPlug', 'ventPlug'],
        'Plug & Seals': ['twinSealPlug', 'plugSeals', 'sealRetainers', 'secondarySeals', 'plugStem', 'stemThrustWasher', 'stemPacking', 'packingFollower', 'packingFlange', 'packingStuds', 'packingNuts'],
        'Bearings': ['lowerBearing', 'upperBearing'],
        'Fittings': ['balancePorts', 'bleedPort', 'bleedValve', 'sealantInjection', 'sealantCheck', 'sealantGrooves'],
        'Operator': ['mountingPad', 'gearOperator', 'coupling', 'lockingDevice', 'travelStop']
    },
    'Pressure Relief Valve': {
        'Body & Nozzle': ['inletNozzle', 'outletBody', 'bodyGasket', 'nozzleSeat', 'drainPlug'],
        'Bonnet & Spring': ['bonnet', 'bonnetBolts', 'bonnetNuts', 'spring', 'springWashers', 'adjustingScrew', 'nut', 'bonnetGasket', 'cap', 'capGasket'],
        'Trim': ['disc', 'discHolder', 'guide', 'spindle', 'blowdownRing', 'guideBushing', 'stemOrings', 'softGoods'],
        'Lifting Gear': ['testLever', 'leverPin', 'packedLeverPacking', 'liftingFork'],
        'Accessories': ['bellows', 'bellowsFlange', 'liftIndicator', 'remoteSolenoid']
    }
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
