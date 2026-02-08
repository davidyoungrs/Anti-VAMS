import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateRbiReport } from '../services/reportGenerator';

const CONVERTERS = {
    temperature: {
        units: ['Celsius', 'Fahrenheit', 'Kelvin'],
        convert: (val, from, to) => {
            let k; // Kelvin is intermediate
            if (from === 'Celsius') k = val + 273.15;
            else if (from === 'Fahrenheit') k = (val - 32) * 5 / 9 + 273.15;
            else k = val;

            if (to === 'Celsius') return k - 273.15;
            if (to === 'Fahrenheit') return (k - 273.15) * 9 / 5 + 32;
            return k;
        }
    },
    pressure: {
        units: ['PSI', 'Bar', 'MPa', 'kPa', 'Pa', 'atm', 'kg/cm2'],
        factors: { // to Pa
            'Pa': 1,
            'dPa': 10,
            'kPa': 1000,
            'MPa': 1000000,
            'Bar': 100000,
            'PSI': 6894.76,
            'atm': 101325,
            'kg/cm2': 98066.5
        }
    },
    volumetricFlow: {
        units: ['m3/h', 'm3/min', 'L/min', 'GPM (US)', 'GPM (UK)', 'CFM', 'Barrel/day'],
        factors: { // to m3/s
            'm3/h': 1 / 3600,
            'm3/min': 1 / 60,
            'L/min': 0.001 / 60,
            'GPM (US)': 0.00378541 / 60,
            'GPM (UK)': 0.00454609 / 60,
            'CFM': 0.000471947,
            'Barrel/day': 0.158987 / 86400
        }
    },
    massFlow: {
        units: ['kg/h', 'kg/min', 'kg/s', 'lb/h', 'lb/min', 'ton/h'],
        factors: { // to kg/s
            'kg/s': 1,
            'kg/min': 1 / 60,
            'kg/h': 1 / 3600,
            'lb/h': 0.453592 / 3600,
            'lb/min': 0.453592 / 60,
            'ton/h': 1000 / 3600
        }
    },
    torque: {
        units: ['Nm', 'lb-ft', 'lb-in', 'kgf-m', 'kNm'],
        factors: { // to Nm
            'Nm': 1,
            'kNm': 1000,
            'lb-ft': 1.355818,
            'lb-in': 0.112985,
            'kgf-m': 9.80665
        }
    },
    flowCoefficient: {
        units: ['Cv (US)', 'Kv (Metric)'],
        factors: { // to Kv
            'Kv (Metric)': 1,
            'Cv (US)': 0.865 // 1 Cv = 0.865 Kv. (1 Kv = 1.156 Cv)
        }
    }
};

const DENSITY_UNITS = ['kg/m3', 'g/cm3', 'lb/ft3', 'lb/gal'];
const DENSITY_FACTORS = { // to kg/m3
    'kg/m3': 1,
    'g/cm3': 1000,
    'lb/ft3': 16.0185,
    'lb/gal': 119.826
};

const FLANGE_DATA = {
    'ASME B16.5': {
        classes: ['150', '300', '600', '900', '1500'],
        data: {
            '150': {
                '1/2"': { bolts: 4, diam: '1/2"', lenRF: '2-1/4"', hex: '7/8"', od: '3.50"', pcd: '2.38"', thk: '0.44"' },
                '2"': { bolts: 4, diam: '5/8"', lenRF: '3-1/4"', hex: '1-1/16"', od: '6.00"', pcd: '4.75"', thk: '0.75"' },
                '3"': { bolts: 4, diam: '5/8"', lenRF: '3-1/2"', hex: '1-1/16"', od: '7.50"', pcd: '6.00"', thk: '0.94"' },
                '4"': { bolts: 8, diam: '5/8"', lenRF: '3-1/2"', hex: '1-1/16"', od: '9.00"', pcd: '7.50"', thk: '0.94"' },
                '6"': { bolts: 8, diam: '3/4"', lenRF: '4"', hex: '1-1/4"', od: '11.00"', pcd: '9.50"', thk: '1.00"' },
                '8"': { bolts: 8, diam: '3/4"', lenRF: '4-1/4"', hex: '1-1/4"', od: '13.50"', pcd: '11.75"', thk: '1.12"' },
                '10"': { bolts: 12, diam: '7/8"', lenRF: '4-3/4"', hex: '1-7/16"', od: '16.00"', pcd: '14.25"', thk: '1.19"' },
                '12"': { bolts: 12, diam: '7/8"', lenRF: '4-3/4"', hex: '1-7/16"', od: '19.00"', pcd: '17.00"', thk: '1.25"' },
            },
            '300': {
                '2"': { bolts: 8, diam: '5/8"', lenRF: '3-1/2"', lenRTJ: '4"', ring: 'R23', od: '6.50"', pcd: '5.00"', thk: '0.88"' },
                '3"': { bolts: 8, diam: '3/4"', lenRF: '4-1/4"', lenRTJ: '4-3/4"', ring: 'R31', od: '8.25"', pcd: '6.62"', thk: '1.12"' },
                '4"': { bolts: 8, diam: '3/4"', lenRF: '4-1/2"', lenRTJ: '5"', ring: 'R37', od: '10.00"', pcd: '7.88"', thk: '1.25"' },
                '6"': { bolts: 12, diam: '3/4"', lenRF: '4-3/4"', lenRTJ: '5-1/4"', ring: 'R45', od: '12.50"', pcd: '10.62"', thk: '1.44"' },
                '8"': { bolts: 12, diam: '7/8"', lenRF: '5-1/2"', lenRTJ: '6"', ring: 'R49', od: '15.00"', pcd: '13.00"', thk: '1.62"' },
            },
            '600': {
                '2"': { bolts: 8, diam: '5/8"', lenRF: '4-1/4"', lenRTJ: '4-1/4"', ring: 'R23', od: '6.50"', pcd: '5.00"', thk: '1.00"' },
                '3"': { bolts: 8, diam: '3/4"', lenRF: '5"', lenRTJ: '5"', ring: 'R31', od: '8.25"', pcd: '6.62"', thk: '1.25"' },
                '4"': { bolts: 8, diam: '7/8"', lenRF: '5-3/4"', lenRTJ: '5-3/4"', ring: 'R37', od: '10.75"', pcd: '8.50"', thk: '1.50"' },
                '6"': { bolts: 12, diam: '1"', lenRF: '6-3/4"', lenRTJ: '6-3/4"', ring: 'R45', od: '14.00"', pcd: '11.50"', thk: '1.88"' },
            }
        }
    },
    'API 6A': {
        classes: ['2000', '3000', '5000', '10000'],
        data: {
            '2000': {
                '2-1/16"': { bolts: 8, diam: '5/8"', len: '4-1/2"', ring: 'R23', od: '6.50"', pcd: '5.00"', thk: '1.31"' },
                '3-1/8"': { bolts: 8, diam: '3/4"', len: '5-1/4"', ring: 'R31', od: '8.25"', pcd: '6.62"', thk: '1.56"' },
                '4-1/16"': { bolts: 8, diam: '7/8"', len: '6"', ring: 'R37', od: '10.75"', pcd: '8.50"', thk: '1.81"' },
            },
            '5000': {
                '2-1/16"': { bolts: 8, diam: '7/8"', len: '6"', ring: 'R24', od: '8.50"', pcd: '6.50"', thk: '2.31"' },
                '3-1/8"': { bolts: 8, diam: '1-1/8"', len: '7-1/2"', ring: 'R35', od: '10.50"', pcd: '8.00"', thk: '2.81"' },
                '4-1/16"': { bolts: 8, diam: '1-1/4"', len: '8-1/2"', ring: 'R39', od: '12.25"', pcd: '9.62"', thk: '3.12"' },
            }
        }
    },
    'DIN / EN': {
        classes: ['PN10', 'PN16', 'PN25', 'PN40'],
        data: {
            'PN16': {
                'DN50': { bolts: 4, diam: 'M16', len: '55mm', od: '165mm', pcd: '125mm', thk: '18mm' },
                'DN80': { bolts: 8, diam: 'M16', len: '60mm', od: '200mm', pcd: '160mm', thk: '20mm' },
                'DN100': { bolts: 8, diam: 'M16', len: '60mm', od: '220mm', pcd: '180mm', thk: '20mm' },
            }
        }
    }
};

const RBI_CONFIG = {
    COF: {
        temp: { multiplier: 1.2, low: -15, high: 65 },
        pressure: { critical: 20, low: 3, criticalMult: 1.5, standardMult: 1.3, lowMult: 1.0 },
        vessel: { small: 0.2, medium: 1.0, large: 2.0, smallMult: 1.0, mediumMult: 1.5, largeMult: 2.0 },
        pipe: { criticalDiam: 4, largeMult: 1.5, standardMult: 1.0 },
        fluid: {
            'Utility/Seawater': 1.0,
            'Air': 1.2,
            'N2 Gas': 1.2,
            'Drilling/Cement': 1.4,
            'Chemicals': 1.4,
            'Produced Water': 1.5,
            'HC Vapour': 2.0,
            'HC Liquid': 1.8,
            'Gas Condensate': 1.9
        },
        vp: { critical: 1, mult: 1.3 }
    },
    POF: {
        condition: { VGOOD: 0, GOOD: 1, FAIR: 15, POOR: 100, BENT: 100 },
        action: {
            'LAP AND POLISH': 0,
            'POLISHED': 1,
            'PAINTED': 0,
            'CLEAN': 1,
            'BLAST & CLEAN': 1,
            'MACHINED TRIM': 10,
            'MACHINED': 100,
            'NEW PART': 100,
            'O RING REPLACED': 1,
            'B.E.R.': 1000
        }
    },
    MATRICES: {
        CAT1: [
            [12, 24, 36], // POF High [COF High, Med, Low]
            [24, 36, 48], // POF Medium
            [36, 48, 60]  // POF Low
        ],
        CAT2: [
            [24, 36, 48],
            [36, 48, 60],
            [48, 60, 60]
        ]
    }
};


export const UnitConverter = ({ records = [], role = '' }) => {
    const [activeTab, setActiveTab] = useState('sizing');

    // General Converter State
    const [inputVal, setInputVal] = useState('');
    const [fromUnit, setFromUnit] = useState('');
    const [toUnit, setToUnit] = useState('');

    // Mass/Vol Converter State
    const [mvMode, setMvMode] = useState('massToVol'); // massToVol or volToMass
    const [mvInput, setMvInput] = useState('');
    const [mvDensity, setMvDensity] = useState('');
    const [mvInputUnit, setMvInputUnit] = useState('kg/h');
    const [mvDensityUnit, setMvDensityUnit] = useState('kg/m3');
    const [mvOutputUnit, setMvOutputUnit] = useState('m3/h');

    // Valve Sizing (Cv) State
    const [sizingType, setSizingType] = useState('liquid'); // liquid, gas, steam, multiphase
    const [sizingQ, setSizingQ] = useState(''); // Volumetric (Liquid/Gas) or Mass (Steam/Multi)
    const [sizingDP, setSizingDP] = useState('');
    const [sizingP1, setSizingP1] = useState(''); // Inlet Pressure (Required for Gas/Steam)
    const [sizingTemp, setSizingTemp] = useState(''); // Temp C (Required for Gas)
    const [sizingSG, setSizingSG] = useState('1.0'); // Liquid/Gas SG
    const [sizingDensity, setSizingDensity] = useState(''); // For Multiphase (Mixture Density)

    // Units
    const [sizingQUnit, setSizingQUnit] = useState('GPM (US)'); // or SCFM or lb/h
    const [sizingDPUnit, setSizingDPUnit] = useState('PSI');
    const [sizingP1Unit, setSizingP1Unit] = useState('PSI');
    const [sizingTempUnit, setSizingTempUnit] = useState('Celsius');
    const [sizingDensityUnit, setSizingDensityUnit] = useState('kg/m3');

    // Flange Tables State
    const [flangeStandard, setFlangeStandard] = useState('ASME B16.5');
    const [flangeClass, setFlangeClass] = useState('150');
    const [flangeSearch, setFlangeSearch] = useState('');

    // PRV RBI State - Valve Metadata
    const [rbiSelectedValveId, setRbiSelectedValveId] = useState('');
    const [rbiCustomer, setRbiCustomer] = useState('');
    const [rbiOem, setRbiOem] = useState('');
    const [rbiSerialNumber, setRbiSerialNumber] = useState('');
    const [rbiTagNumber, setRbiTagNumber] = useState('');
    const [rbiModelNumber, setRbiModelNumber] = useState('');
    const [rbiSetPressure, setRbiSetPressure] = useState('');
    const [rbiSetPressureUnit, setRbiSetPressureUnit] = useState('Bar');

    // PRV RBI State - Calculation 
    const [rbiTemp, setRbiTemp] = useState('');
    const [rbiTempUnit, setRbiTempUnit] = useState('Celsius');
    const [rbiPressure, setRbiPressure] = useState('');
    const [rbiPressureUnit, setRbiPressureUnit] = useState('Bar');
    const [rbiContainmentType, setRbiContainmentType] = useState('Pipe'); // Pipe or Vessel
    const [rbiVesselSize, setRbiVesselSize] = useState('Small'); // Small, Medium, Large
    const [rbiPipeDiam, setRbiPipeDiam] = useState('');
    const [rbiPipeDiamUnit, setRbiPipeDiamUnit] = useState('Inches');
    const [rbiFluidType, setRbiFluidType] = useState('Utility/Seawater');
    const [rbiVapourPressure, setRbiVapourPressure] = useState(''); // Only for HC Liquid/Condensate
    const [rbiRepairCost, setRbiRepairCost] = useState('');
    const [rbiRepairCostCurrency, setRbiRepairCostCurrency] = useState('£');

    const [rbiHistoryCount, setRbiHistoryCount] = useState('0'); // <2 or >=2
    const [rbiServiceType, setRbiServiceType] = useState('1'); // 1: Clean, 2: Dirty
    const [rbiCurrentPrePop, setRbiCurrentPrePop] = useState('Pass'); // Pass or Fail
    const [rbiPrevInspections, setRbiPrevInspections] = useState('Pass'); // Pass or Fail
    const [rbiProblemCorrected, setRbiProblemCorrected] = useState('Yes');
    const [rbiSimilarHistory, setRbiSimilarHistory] = useState('Good'); // Good or Poor
    const [rbiCondition, setRbiCondition] = useState('VGOOD');
    const [rbiActions, setRbiActions] = useState(['LAP AND POLISH']); // Multiple selections
    const [rbiLeakTest, setRbiLeakTest] = useState('Pass');
    const [rbiCurrentInterval, setRbiCurrentInterval] = useState('12');

    // PRV Filtering
    const prvRecords = records.filter(r => r.valveType === 'Pressure Relief Valve');

    const handleValveSelect = (valveId) => {
        setRbiSelectedValveId(valveId);
        const valve = records.find(r => r.id === valveId);
        if (valve) {
            setRbiCustomer(valve.customer || '');
            setRbiOem(valve.oem || '');
            setRbiSerialNumber(valve.serialNumber || '');
            setRbiTagNumber(valve.tagNo || '');
            setRbiModelNumber(valve.modelNo || '');
            setRbiSetPressure(valve.bodyPressure || valve.mawp || '');
            setRbiSetPressureUnit(valve.bodyPressureUnit || 'Bar');

            // Auto-populate calculation fields if context is clear
            if (valve.mawp) setRbiPressure(valve.mawp);
            if (valve.tagNo) setRbiTagNumber(valve.tagNo);
        }
    };

    // Initialize defaults when tab changes
    React.useEffect(() => {
        if (CONVERTERS[activeTab]) {
            setFromUnit(CONVERTERS[activeTab].units[0]);
            setToUnit(CONVERTERS[activeTab].units[1]);
            setInputVal('');
        }
    }, [activeTab]);

    const calculateSizingResult = () => {
        if (!sizingQ || !sizingDP) return { cv: '-', kv: '-' };
        const dp = parseFloat(sizingDP);
        if (isNaN(dp) || dp <= 0) return { cv: '-', kv: '-' };

        const dp_psi = (dp * CONVERTERS.pressure.factors[sizingDPUnit]) / 6894.76;
        let cv = 0;

        try {
            switch (sizingType) {
                case 'liquid':
                    cv = calculateLiquidSizing(dp_psi);
                    break;
                case 'gas':
                    cv = calculateGasSizing(dp_psi);
                    break;
                case 'steam':
                    cv = calculateSteamSizing(dp_psi);
                    break;
                case 'multiphase':
                    cv = calculateMultiphaseSizing(dp_psi);
                    break;
                default:
                    return { cv: '-', kv: '-' };
            }
        } catch (e) {
            return { cv: '-', kv: '-' };
        }

        if (isNaN(cv) || !isFinite(cv) || cv < 0) return { cv: '-', kv: '-' };
        return {
            cv: cv.toFixed(2),
            kv: (cv * 0.865).toFixed(2)
        };
    };

    const calculateLiquidSizing = (dp_psi) => {
        const q = parseFloat(sizingQ);
        const sg = parseFloat(sizingSG);
        if (isNaN(q) || isNaN(sg) || sg <= 0) throw new Error('Invalid input');
        const q_m3s = q * CONVERTERS.volumetricFlow.factors[sizingQUnit];
        const q_gpm = q_m3s / (0.00378541 / 60);
        return q_gpm * Math.sqrt(sg / dp_psi);
    };

    const calculateGasSizing = (dp_psi) => {
        const q = parseFloat(sizingQ);
        const p1 = parseFloat(sizingP1);
        const t = parseFloat(sizingTemp);
        const sg = parseFloat(sizingSG);
        if (isNaN(q) || isNaN(p1) || isNaN(t) || isNaN(sg)) throw new Error('Invalid input');

        const p1_abs = ((p1 * CONVERTERS.pressure.factors[sizingP1Unit]) / 6894.76) + 14.7;
        const t_r = CONVERTERS.temperature.convert(t, sizingTempUnit, 'Kelvin') * 1.8;
        const q_m3s = q * CONVERTERS.volumetricFlow.factors[sizingQUnit];
        const q_scfm = q_m3s / 0.000471947;

        const x = dp_psi / p1_abs;
        return x >= 0.5
            ? (q_scfm * Math.sqrt(sg * t_r)) / (963 * p1_abs)
            : (q_scfm * Math.sqrt(sg * t_r)) / (1360 * Math.sqrt(dp_psi * p1_abs));
    };

    const calculateSteamSizing = (dp_psi) => {
        const w = parseFloat(sizingQ);
        const p1 = parseFloat(sizingP1);
        if (isNaN(w) || isNaN(p1)) throw new Error('Invalid input');

        const w_lbhr = w * CONVERTERS.massFlow.factors[sizingQUnit] * 3600 * 2.20462;
        const p1_abs = ((p1 * CONVERTERS.pressure.factors[sizingP1Unit]) / 6894.76) + 14.7;
        const p2_abs = p1_abs - dp_psi;

        return dp_psi > p1_abs / 2
            ? w_lbhr / (1.83 * p1_abs)
            : w_lbhr / (2.1 * Math.sqrt(dp_psi * (p1_abs + p2_abs)));
    };

    const calculateMultiphaseSizing = (dp_psi) => {
        const w = parseFloat(sizingQ);
        const rho = parseFloat(sizingDensity);
        if (isNaN(w) || isNaN(rho)) throw new Error('Invalid input');

        const w_lbhr = w * CONVERTERS.massFlow.factors[sizingQUnit] * 3600 * 2.20462;
        const rho_lbft3 = rho * DENSITY_FACTORS[sizingDensityUnit] * 0.062428;
        return w_lbhr / (63.3 * Math.sqrt(dp_psi * rho_lbft3));
    };

    const calculateResult = () => { // ... (restore original calc logic)
        if (inputVal === '' || isNaN(inputVal)) return '-';
        const val = parseFloat(inputVal);

        if (activeTab === 'temperature') {
            const res = CONVERTERS.temperature.convert(val, fromUnit, toUnit);
            return res.toFixed(2);
        } else {
            const factors = CONVERTERS[activeTab].factors;
            const base = val * factors[fromUnit];
            const res = base / factors[toUnit];
            // Format check: if very small or large, use exp?
            if (res === 0) return '0';
            if (Math.abs(res) < 0.001 || Math.abs(res) > 100000) return res.toExponential(4);
            return Number(res.toFixed(4)).toString(); // Fixes slow regex
        }
    };

    const calculateMassVolResult = () => {
        if (!mvInput || !mvDensity || isNaN(mvInput) || isNaN(mvDensity)) return '-';
        const val = parseFloat(mvInput);
        const rho = parseFloat(mvDensity) * DENSITY_FACTORS[mvDensityUnit]; // convert to kg/m3

        if (rho <= 0) return 'Invalid Density';

        let res;
        if (mvMode === 'massToVol') {
            // Mass Flow -> kg/s
            const massRateKgS = val * CONVERTERS.massFlow.factors[mvInputUnit];
            // Vol Rate m3/s = kg/s / (kg/m3)
            const volRateM3S = massRateKgS / rho;
            // Convert to output unit
            res = volRateM3S / CONVERTERS.volumetricFlow.factors[mvOutputUnit];
        } else {
            // Vol Flow -> m3/s
            const volRateM3S = val * CONVERTERS.volumetricFlow.factors[mvInputUnit];
            // Mass Rate kg/s = m3/s * kg/m3
            const massRateKgS = volRateM3S * rho;
            // Convert to output unit
            res = massRateKgS / CONVERTERS.massFlow.factors[mvOutputUnit];
        }

        if (res === 0) return '0';
        if (Math.abs(res) < 0.001 || Math.abs(res) > 100000) return res.toExponential(4);
        return Number(res.toFixed(4)).toString(); // Fixes slow regex
    };



    const sizingRes = calculateSizingResult();

    const calculateRbiResults = () => {
        // 1. Calculate COF (F)
        let F = 1.0;

        // Step 1: Temp
        const tempC = rbiTempUnit === 'Celsius' ? parseFloat(rbiTemp) : (parseFloat(rbiTemp) - 32) * 5 / 9;
        if (!isNaN(tempC) && (tempC < RBI_CONFIG.COF.temp.low || tempC > RBI_CONFIG.COF.temp.high)) {
            F *= RBI_CONFIG.COF.temp.multiplier;
        }

        // Step 2: Pressure
        const pressBar = rbiPressureUnit === 'Bar' ? parseFloat(rbiPressure) :
            rbiPressureUnit === 'PSI' ? parseFloat(rbiPressure) * 0.0689476 :
                parseFloat(rbiPressure) * 0.01;
        if (!isNaN(pressBar)) {
            if (pressBar > RBI_CONFIG.COF.pressure.critical) F *= RBI_CONFIG.COF.pressure.criticalMult;
            else if (pressBar < RBI_CONFIG.COF.pressure.low) F *= RBI_CONFIG.COF.pressure.lowMult;
            else F *= RBI_CONFIG.COF.pressure.standardMult;
        }

        // Step 3: Containment
        if (rbiContainmentType === 'Vessel') {
            if (rbiVesselSize === 'Small') F *= RBI_CONFIG.COF.vessel.smallMult;
            else if (rbiVesselSize === 'Medium') F *= RBI_CONFIG.COF.vessel.mediumMult;
            else F *= RBI_CONFIG.COF.vessel.largeMult;
        } else {
            const diamIn = rbiPipeDiamUnit === 'Inches' ? parseFloat(rbiPipeDiam) : parseFloat(rbiPipeDiam) / 25.4;
            if (!isNaN(diamIn) && diamIn > RBI_CONFIG.COF.pipe.criticalDiam) F *= RBI_CONFIG.COF.pipe.largeMult;
            else F *= RBI_CONFIG.COF.pipe.standardMult;
        }

        // Step 4: Fluid
        F *= (RBI_CONFIG.COF.fluid[rbiFluidType] || 1.0);

        // Step 5: Vapour Pressure
        if (rbiFluidType === 'HC Liquid' || rbiFluidType === 'Gas Condensate') {
            const vpBar = parseFloat(rbiVapourPressure);
            if (!isNaN(vpBar) && vpBar >= RBI_CONFIG.COF.vp.critical) {
                F *= RBI_CONFIG.COF.vp.mult;
            }
        }

        // Step 6: Consequence Rank
        let cofRank = 'LOW';
        const cost = parseFloat(rbiRepairCost) || 0;
        if (F > 3.5) {
            cofRank = 'HIGH';
        } else if (F > 1.8) {
            if (cost > 250000) cofRank = 'HIGH';
            else if (cost < 50000) cofRank = 'LOW';
            else cofRank = 'MEDIUM';
        } else {
            if (cost >= 50000) cofRank = 'MEDIUM';
            else cofRank = 'LOW';
        }

        // 2. Calculate POF
        let pofRank = 'HIGH';
        const condScore = RBI_CONFIG.POF.condition[rbiCondition] || 0;

        // VC Score (CUMULATIVE for multiple actions)
        const actionScore = rbiActions.reduce((total, action) => total + (RBI_CONFIG.POF.action[action] || 0), 0);

        const totalScore = condScore + actionScore + 1;

        if (rbiHistoryCount === '0') {
            // New Application logic
            pofRank = rbiSimilarHistory === 'Good' ? 'MEDIUM' : 'HIGH';
        } else {
            // Existing Valve logic
            if (rbiCurrentPrePop === 'Pass') {
                if (rbiServiceType === '1' || rbiPrevInspections === 'Pass') {
                    if (totalScore >= 250) pofRank = 'MEDIUM';
                    else pofRank = rbiLeakTest === 'Pass' ? 'LOW' : 'MEDIUM';
                } else {
                    pofRank = 'MEDIUM';
                }
            } else {
                pofRank = rbiProblemCorrected === 'Yes' ? (rbiSimilarHistory === 'Good' ? 'MEDIUM' : 'HIGH') : 'HIGH';
            }
        }

        // 3. Matrix lookup
        const matrix = rbiHistoryCount === 'Category 2' ? RBI_CONFIG.MATRICES.CAT2 : RBI_CONFIG.MATRICES.CAT1;
        const rankIdxMap = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
        const recommendedInterval = matrix[rankIdxMap[pofRank]][rankIdxMap[cofRank]];

        // 4. Safety Override (50% Rule)
        const currentPeriod = parseInt(rbiCurrentInterval) || 12;
        let finalInterval = recommendedInterval;
        let intermediateRequired = false;
        let intermediateInterval = null;

        if (recommendedInterval > 2 * currentPeriod) {
            intermediateRequired = true;
            intermediateInterval = Math.min(30, recommendedInterval * 0.5);
        }

        // 5. OLSPV Recommendation
        let nextAction = 'Bench Test';
        if (cofRank === 'LOW') {
            nextAction = 'Bench / OLSPV';
        } else if (rbiHistoryCount === 'Category 2' && rbiCurrentPrePop === 'Pass') {
            nextAction = 'OLSPV (In-situ)';
        }

        return {
            cofFactor: F.toFixed(2),
            cofRank,
            pofRank,
            recommendedInterval,
            intermediateRequired,
            intermediateInterval,
            nextAction,
            metadata: {
                customer: rbiCustomer,
                oem: rbiOem,
                serialNumber: rbiSerialNumber,
                tagNumber: rbiTagNumber,
                modelNumber: rbiModelNumber,
                setPressure: `${rbiSetPressure} ${rbiSetPressureUnit}`
            }
        };
    };

    const handleGenerateReport = async () => {
        try {
            const results = calculateRbiResults();

            const inputs = {
                temp: rbiTemp,
                tempUnit: rbiTempUnit,
                pressure: rbiPressure,
                pressureUnit: rbiPressureUnit,
                containmentType: rbiContainmentType,
                containmentValue: rbiContainmentType === 'Vessel' ? rbiVesselSize : `${rbiPipeDiam} ${rbiPipeDiamUnit}`,
                fluidType: rbiFluidType,
                repairCost: rbiRepairCost,
                repairCostCurrency: rbiRepairCostCurrency,
                historyCount: rbiHistoryCount === 'Category 2' ? ">= 2 Tests" : "< 2 Tests",
                serviceType: rbiServiceType,
                currentPrePop: rbiCurrentPrePop,
                problemCorrected: rbiProblemCorrected,
                condition: rbiCondition,
                actions: rbiActions,
                leakTest: rbiLeakTest,
                currentInterval: rbiCurrentInterval
            };

            const pdfBlob = await generateRbiReport(results, inputs);

            // 1. Download locally
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `RBI_Report_${rbiSerialNumber || 'Export'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            // 2. Save to Cloud if valve is selected
            if (supabase && rbiSelectedValveId) {
                const fileName = `RBI_Report_${new Date().toISOString().split('T')[0]}_${crypto.randomUUID().substring(0, 5)}.pdf`;
                const filePath = `${rbiSelectedValveId}/Inspection & Test report/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('valve-attachment')
                    .upload(filePath, pdfBlob);

                if (uploadError) {
                    console.error("Cloud upload failed", uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('valve-attachment')
                        .getPublicUrl(filePath);

                    // Update the valve record's file list
                    const valve = records.find(r => r.id === rbiSelectedValveId);
                    if (valve) {
                        const newFile = {
                            url: publicUrl,
                            category: 'Inspection & Test report',
                            originalName: fileName,
                            uploadDate: new Date().toISOString()
                        };
                        const updatedFiles = [...(valve.files || []), newFile].map(f => {
                            if (f.file) {
                                return {
                                    url: f.url,
                                    category: f.category,
                                    originalName: f.originalName,
                                    uploadDate: f.uploadDate
                                };
                            }
                            return f;
                        });

                        const { error: updateError } = await supabase
                            .from('records')
                            .update({
                                file_urls: updatedFiles,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', rbiSelectedValveId);

                        if (updateError) {
                            console.error("Failed to update record with new file URL", updateError);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error generating RBI report:", err);
            alert("Failed to generate report. Check console for details.");
        }
    };

    const rbiResults = calculateRbiResults();

    const renderTabContent = () => {
        switch (activeTab) {
            case 'flangeTables':
                return renderFlangeTables();
            case 'sizing':
                return renderSizing();
            case 'massVol':
                return renderMassVol();
            case 'rbi':
                return renderRbi();
            default:
                return renderGeneralConverter();
        }
    };

    const renderRbi = () => {
        if (role === 'client') {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                    <h3>Access Restricted</h3>
                    <p>The RBI Module is reserved for engineering and inspection personnel.</p>
                </div>
            );
        }

        return (
            <div className="grid-2">
                {/* Header / Info */}
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', padding: '1rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #0ea5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0ea5e9' }}>Pressure Relief Valve RBI Module</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
                            Calculates intervals based on Consequence and Probability of Failure flowcharts (SV-ENG-0002).
                        </p>
                    </div>
                </div>

                {/* Valve Selection & Metadata */}
                <div style={{ gridColumn: '1 / -1', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="field-group">
                            <label>Lookup Valve from Database (SN / Tag)</label>
                            <select
                                value={rbiSelectedValveId}
                                onChange={e => handleValveSelect(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderColor: '#0ea5e9',
                                    color: rbiSelectedValveId === '' ? 'rgba(255,255,255,0.4)' : 'white'
                                }}
                            >
                                <option value="">-- Manual Entry / Custom --</option>
                                {prvRecords.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.serialNumber} {r.tagNo ? `[${r.tagNo}]` : ''} - {r.customer}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>&nbsp;</label>
                            <button
                                onClick={() => {
                                    setRbiSelectedValveId('');
                                    setRbiCustomer('');
                                    setRbiOem('');
                                    setRbiSerialNumber('');
                                    setRbiTagNumber('');
                                    setRbiModelNumber('');
                                    setRbiSetPressure('');
                                }}
                                style={{ width: '100%', padding: '0.65rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                Reset Metadata
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div className="field-group">
                            <label>Customer</label>
                            <input value={rbiCustomer} onChange={e => setRbiCustomer(e.target.value)} placeholder="Cust Name" />
                        </div>
                        <div className="field-group">
                            <label>OEM / Manufacturer</label>
                            <input value={rbiOem} onChange={e => setRbiOem(e.target.value)} placeholder="e.g. Crosby" />
                        </div>
                        <div className="field-group">
                            <label>Serial Number</label>
                            <input value={rbiSerialNumber} onChange={e => setRbiSerialNumber(e.target.value)} placeholder="S/N" />
                        </div>
                        <div className="field-group">
                            <label>Tag Number</label>
                            <input value={rbiTagNumber} onChange={e => setRbiTagNumber(e.target.value)} placeholder="Tag ID" />
                        </div>
                        <div className="field-group">
                            <label>Model Number</label>
                            <input value={rbiModelNumber} onChange={e => setRbiModelNumber(e.target.value)} placeholder="Model" />
                        </div>
                        <div className="field-group">
                            <label>Set Pressure</label>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <input value={rbiSetPressure} onChange={e => setRbiSetPressure(e.target.value)} placeholder="e.g. 15.5" style={{ flex: 1 }} />
                                <select value={rbiSetPressureUnit} onChange={e => setRbiSetPressureUnit(e.target.value)} style={{ width: 'auto' }}>
                                    <option value="Bar">Bar</option>
                                    <option value="PSI">PSI</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1: Consequence Factors */}
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h5 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Consequence of Failure</h5>

                    <div className="field-group">
                        <label>Temperature</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" value={rbiTemp} onChange={e => setRbiTemp(e.target.value)} placeholder="Operating Temp" />
                            <select value={rbiTempUnit} onChange={e => setRbiTempUnit(e.target.value)}>
                                {CONVERTERS.temperature.units.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Operating Pressure</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" value={rbiPressure} onChange={e => setRbiPressure(e.target.value)} placeholder="Max Op Pressure" />
                            <select value={rbiPressureUnit} onChange={e => setRbiPressureUnit(e.target.value)}>
                                {['Bar', 'PSI', 'kPa'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Containment Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {['Pipe', 'Vessel'].map(t => (
                                <button key={t} onClick={() => setRbiContainmentType(t)} style={{ padding: '0.5rem', background: rbiContainmentType === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{t}</button>
                            ))}
                        </div>
                    </div>

                    {rbiContainmentType === 'Vessel' ? (
                        <div className="field-group">
                            <label>Vessel Size ($m^3$)</label>
                            <select value={rbiVesselSize} onChange={e => setRbiVesselSize(e.target.value)}>
                                <option value="Small">Small (&lt; 0.2)</option>
                                <option value="Medium">Medium (0.2 - 2.0)</option>
                                <option value="Large">Large (&gt; 2.0)</option>
                            </select>
                        </div>
                    ) : (
                        <div className="field-group">
                            <label>Pipe Diameter</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" value={rbiPipeDiam} onChange={e => setRbiPipeDiam(e.target.value)} placeholder="Diameter" />
                                <select value={rbiPipeDiamUnit} onChange={e => setRbiPipeDiamUnit(e.target.value)}>
                                    <option value="Inches">Inches</option>
                                    <option value="mm">mm</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="field-group">
                        <label>Fluid Type</label>
                        <select value={rbiFluidType} onChange={e => setRbiFluidType(e.target.value)}>
                            {Object.keys(RBI_CONFIG.COF.fluid).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {(rbiFluidType === 'HC Liquid' || rbiFluidType === 'Gas Condensate') && (
                        <div className="field-group">
                            <label>Vapour Pressure (Bar)</label>
                            <input type="number" value={rbiVapourPressure} onChange={e => setRbiVapourPressure(e.target.value)} placeholder="VP in Bar" />
                        </div>
                    )}

                    <div className="field-group">
                        <label>Estimated Repair Cost</label>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <select
                                value={rbiRepairCostCurrency}
                                onChange={e => setRbiRepairCostCurrency(e.target.value)}
                                style={{ width: 'auto', minWidth: '3.5rem' }}
                            >
                                <option value="£">£</option>
                                <option value="$">$</option>
                                <option value="€">€</option>
                            </select>
                            <input type="number" value={rbiRepairCost} onChange={e => setRbiRepairCost(e.target.value)} placeholder="e.g. 75000" style={{ flex: 1 }} />
                        </div>
                    </div>
                </div>

                {/* Section 2: Probability Factors */}
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h5 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Probability of Failure</h5>

                    <div className="field-group">
                        <label>History Availability</label>
                        <select value={rbiHistoryCount} onChange={e => setRbiHistoryCount(e.target.value)}>
                            <option value="0">New / &lt; 2 Tests (Cat 1)</option>
                            <option value="Category 2">&ge; 2 Recent Shop Reports (Cat 2)</option>
                        </select>
                    </div>

                    <div className="field-group">
                        <label>Service Condition</label>
                        <select value={rbiServiceType} onChange={e => setRbiServiceType(e.target.value)}>
                            <option value="1">Clean, Non-Corrosive</option>
                            <option value="2">Dirty, Corrosive, Cyclic</option>
                        </select>
                    </div>

                    {rbiHistoryCount === 'Category 2' && (
                        <div className="field-group">
                            <label>Current Pre-Pop Test Result</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {['Pass', 'Fail'].map(r => (
                                    <button key={r} onClick={() => setRbiCurrentPrePop(r)} style={{ padding: '0.4rem', background: rbiCurrentPrePop === r ? '#10b981' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', fontSize: '0.85rem', cursor: 'pointer' }}>{r}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {rbiCurrentPrePop === 'Fail' && (
                        <div className="field-group">
                            <label>Problem Corrected?</label>
                            <select value={rbiProblemCorrected} onChange={e => setRbiProblemCorrected(e.target.value)}>
                                <option value="Yes">Yes, Action Taken</option>
                                <option value="No">No / Not Identified</option>
                            </select>
                        </div>
                    )}

                    <div className="field-group">
                        <label>In-Service Inspection Condition</label>
                        <select value={rbiCondition} onChange={e => setRbiCondition(e.target.value)}>
                            {Object.keys(RBI_CONFIG.POF.condition).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="field-group">
                        <label>Latest Repair Actions (Select all that apply)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            {Object.keys(RBI_CONFIG.POF.action).map(a => {
                                const isSelected = rbiActions.includes(a);
                                return (
                                    <button
                                        key={a}
                                        onClick={() => {
                                            if (isSelected) setRbiActions(rbiActions.filter(x => x !== a));
                                            else setRbiActions([...rbiActions, a]);
                                        }}
                                        style={{
                                            padding: '0.3rem 0.6rem',
                                            background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                                            fontSize: '0.75rem',
                                            borderRadius: '1rem',
                                            color: isSelected ? 'black' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {a}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Final Leak Test</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {['Pass', 'Fail'].map(r => (
                                <button key={r} onClick={() => setRbiLeakTest(r)} style={{ padding: '0.4rem', background: rbiLeakTest === r ? '#10b981' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', fontSize: '0.85rem', cursor: 'pointer' }}>{r}</button>
                            ))}
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Current Inspection Period (Months)</label>
                        <input type="number" value={rbiCurrentInterval} onChange={e => setRbiCurrentInterval(e.target.value)} placeholder="e.g. 12" />
                    </div>

                </div>

                {/* Results Report */}
                <div style={{ gridColumn: '1 / -1', marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h5 style={{ margin: 0, fontSize: '1.1rem' }}>Assessment Summary</h5>
                        <div style={{ padding: '0.25rem 0.75rem', background: rbiHistoryCount === 'Category 2' ? '#10b981' : '#6b7280', color: 'white', borderRadius: '1rem', fontSize: '0.75rem' }}>
                            {rbiHistoryCount === 'Category 2' ? 'Category 2 Protocol' : 'Category 1 Protocol'}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>COF Factor</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rbiResults.cofFactor}</div>
                            <div style={{ fontSize: '0.8rem', color: rbiResults.cofRank === 'HIGH' ? '#ef4444' : rbiResults.cofRank === 'MEDIUM' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>{rbiResults.cofRank}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Probability Rank</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-</div>
                            <div style={{ fontSize: '0.8rem', color: rbiResults.pofRank === 'HIGH' ? '#ef4444' : rbiResults.pofRank === 'MEDIUM' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>{rbiResults.pofRank}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suggested Interval</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0ea5e9' }}>{rbiResults.recommendedInterval} mo</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Primary Action</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', height: '2.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rbiResults.nextAction}</div>
                        </div>
                    </div>

                    {rbiResults.intermediateRequired && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b', color: '#f59e0b' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>⚠️ Safety Override: 50% Rule Applied</div>
                            <div style={{ fontSize: '0.85rem' }}>
                                The suggested interval is &gt;2x the previous period. An **intermediate examination (OLSPV)** is recommended at **{rbiResults.intermediateInterval} months**.
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={() => handleGenerateReport()}
                            className="btn-primary"
                            disabled={!rbiCustomer || !rbiOem || !rbiSerialNumber || !rbiTagNumber || !rbiModelNumber || !rbiSetPressure || !rbiTemp || !rbiPressure || !rbiRepairCost}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '1rem',
                                opacity: (!rbiCustomer || !rbiOem || !rbiSerialNumber || !rbiTagNumber || !rbiModelNumber || !rbiSetPressure || !rbiTemp || !rbiPressure || !rbiRepairCost) ? 0.5 : 1,
                                cursor: (!rbiCustomer || !rbiOem || !rbiSerialNumber || !rbiTagNumber || !rbiModelNumber || !rbiSetPressure || !rbiTemp || !rbiPressure || !rbiRepairCost) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <span>📄</span> Generate RBI Report
                        </button>
                        {(!rbiCustomer || !rbiOem || !rbiSerialNumber || !rbiTagNumber || !rbiModelNumber || !rbiSetPressure || !rbiTemp || !rbiPressure || !rbiRepairCost) && (
                            <div style={{ fontSize: '0.7rem', color: '#ef4444', textAlign: 'center', marginTop: '0.5rem' }}>
                                * All identification and process fields are mandatory
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderFlangeTables = () => (
        <div className="grid-2" style={{ display: 'block' }}>
            <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="field-group">
                    <label>Standard</label>
                    <select value={flangeStandard} onChange={e => { setFlangeStandard(e.target.value); setFlangeClass(FLANGE_DATA[e.target.value].classes[0]); }}>
                        {Object.keys(FLANGE_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="field-group">
                    <label>Pressure Class</label>
                    <select value={flangeClass} onChange={e => setFlangeClass(e.target.value)}>
                        {FLANGE_DATA[flangeStandard]?.classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="field-group">
                    <label>Search Size</label>
                    <input
                        type="text"
                        value={flangeSearch}
                        onChange={e => setFlangeSearch(e.target.value)}
                        placeholder="Filter (e.g. 2)..."
                    />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Size</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>OD</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>PCD</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>Thk</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>Bolts</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>Stud Ø</th>
                            {flangeStandard.includes('ASME') ? (
                                <>
                                    <th style={{ padding: '0.8rem', textAlign: 'center' }}>Len (RF)</th>
                                    <th style={{ padding: '0.8rem', textAlign: 'center' }}>Len (RTJ)</th>
                                    <th style={{ padding: '0.8rem', textAlign: 'center' }}>Ring</th>
                                </>
                            ) : (
                                <th style={{ padding: '0.8rem', textAlign: 'center' }}>Length</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {FLANGE_DATA[flangeStandard]?.data[flangeClass] && Object.keys(FLANGE_DATA[flangeStandard].data[flangeClass])
                            .filter(size => size.includes(flangeSearch))
                            .map(size => {
                                const row = FLANGE_DATA[flangeStandard].data[flangeClass][size];
                                return (
                                    <tr key={size} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{size}</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.od}</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.pcd}</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.thk}</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--accent)' }}>{row.bolts}</td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.diam}</td>
                                        {flangeStandard.includes('ASME') ? (
                                            <>
                                                <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.lenRF || '-'}</td>
                                                <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.lenRTJ || '-'}</td>
                                                <td style={{ padding: '0.8rem', textAlign: 'center', color: '#f59e0b' }}>{row.ring || '-'}</td>
                                            </>
                                        ) : (
                                            <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.len || '-'}</td>
                                        )}
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSizing = () => (
        <div className="grid-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                <label style={{ marginBottom: '0.8rem', display: 'block' }}>Fluid Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {['liquid', 'gas', 'steam', 'multiphase'].map(type => {
                        const isSelected = sizingType === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setSizingType(type)}
                                style={{
                                    padding: '0.8rem',
                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    color: isSelected ? 'white' : 'var(--text-muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    textTransform: 'capitalize',
                                    cursor: 'pointer'
                                }}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>{sizingType.charAt(0).toUpperCase() + sizingType.slice(1)} Cv Calculation</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                    {sizingType === 'liquid' && "Standard incompressible flow calculation."}
                    {sizingType === 'gas' && "Compressible flow (Subcritical/Critical check included)."}
                    {sizingType === 'steam' && "Saturated Steam calculation based on Mass Flow."}
                    {sizingType === 'multiphase' && "Homogeneous model using Mixture Density."}
                </p>
            </div>

            <div className="field-group">
                <label>
                    {sizingType === 'steam' || sizingType === 'multiphase' ? 'Mass Flow Rate (W)' : 'Flow Rate (Q)'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={sizingQ} onChange={e => setSizingQ(e.target.value)} placeholder="Flow" />
                    <select value={sizingQUnit} onChange={e => setSizingQUnit(e.target.value)}>
                        {(sizingType === 'steam' || sizingType === 'multiphase' ? CONVERTERS.massFlow.units : CONVERTERS.volumetricFlow.units).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            <div className="field-group">
                <label>Pressure Drop (ΔP)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={sizingDP} onChange={e => setSizingDP(e.target.value)} placeholder="Differential Pressure" />
                    <select value={sizingDPUnit} onChange={e => setSizingDPUnit(e.target.value)}>
                        {CONVERTERS.pressure.units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            {(sizingType === 'gas' || sizingType === 'steam') && (
                <div className="field-group">
                    <label>Inlet Pressure (P1)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" value={sizingP1} onChange={e => setSizingP1(e.target.value)} placeholder="Inlet Pressure" />
                        <select value={sizingP1Unit} onChange={e => setSizingP1Unit(e.target.value)}>
                            {CONVERTERS.pressure.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <small style={{ opacity: 0.6 }}>Assumes Gauge Pressure</small>
                </div>
            )}

            {sizingType === 'gas' && (
                <div className="field-group">
                    <label>Inlet Temperature</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" value={sizingTemp} onChange={e => setSizingTemp(e.target.value)} placeholder="Temp" />
                        <select value={sizingTempUnit} onChange={e => setSizingTempUnit(e.target.value)}>
                            {CONVERTERS.temperature.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {(sizingType === 'liquid' || sizingType === 'gas') && (
                <div className="field-group">
                    <label>Specific Gravity (SG)</label>
                    <input type="number" value={sizingSG} onChange={e => setSizingSG(e.target.value)} placeholder={sizingType === 'gas' ? '1.0 (Air)' : '1.0 (Water)'} />
                </div>
            )}

            {sizingType === 'multiphase' && (
                <div className="field-group">
                    <label>Mixture Density</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" value={sizingDensity} onChange={e => setSizingDensity(e.target.value)} placeholder="Density of Mix" />
                        <select value={sizingDensityUnit} onChange={e => setSizingDensityUnit(e.target.value)}>
                            {DENSITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="field-group" style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Required Cv</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{sizingRes.cv}</div>
                </div>
                <div style={{ width: '1px', height: '50px', background: 'var(--border-color)' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Equivalent Kv</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{sizingRes.kv}</div>
                </div>
            </div>
        </div>
    );

    const renderMassVol = () => (
        <div className="grid-2">
            <div className="field-group" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                <label style={{ marginBottom: '0.8rem', display: 'block' }}>Conversion Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div
                        onClick={() => { setMvMode('massToVol'); setMvInputUnit('kg/h'); setMvOutputUnit('m3/h'); }}
                        style={{
                            padding: '1rem',
                            border: mvMode === 'massToVol' ? '2px solid #0ea5e9' : '1px solid #4b5563',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: mvMode === 'massToVol' ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                            transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: (mvMode === 'massToVol' ? '#0ea5e9' : 'inherit'), fontSize: '1.1rem' }}>Mass ➔ Volume</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Requires Fluid Density</div>
                    </div>

                    <div
                        onClick={() => { setMvMode('volToMass'); setMvInputUnit('m3/h'); setMvOutputUnit('kg/h'); }}
                        style={{
                            padding: '1rem',
                            border: mvMode === 'volToMass' ? '2px solid #0ea5e9' : '1px solid #4b5563',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: mvMode === 'volToMass' ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                            transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: mvMode === 'volToMass' ? '#0ea5e9' : 'inherit', fontSize: '1.1rem' }}>Volume ➔ Mass</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Requires Fluid Density</div>
                    </div>
                </div>
            </div>

            <div className="field-group">
                <label>Input Flow Rate</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={mvInput} onChange={e => setMvInput(e.target.value)} placeholder="Value" />
                    <select value={mvInputUnit} onChange={e => setMvInputUnit(e.target.value)}>
                        {(mvMode === 'massToVol' ? CONVERTERS.massFlow.units : CONVERTERS.volumetricFlow.units).map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="field-group">
                <label>Fluid Density</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={mvDensity} onChange={e => setMvDensity(e.target.value)} placeholder="Density" />
                    <select value={mvDensityUnit} onChange={e => setMvDensityUnit(e.target.value)}>
                        {DENSITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            <div className="field-group" style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <label style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'block' }}>Result</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{calculateMassVolResult()}</span>
                    <select
                        value={mvOutputUnit}
                        onChange={e => setMvOutputUnit(e.target.value)}
                        style={{ width: 'auto', fontSize: '1.1rem' }}
                    >
                        {(mvMode === 'massToVol' ? CONVERTERS.volumetricFlow.units : CONVERTERS.massFlow.units).map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );

    const renderGeneralConverter = () => (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            <div className="field-group">
                <label>From</label>
                <input
                    type="number"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder="Enter value..."
                    style={{ fontSize: '1.2rem', padding: '1rem' }}
                />
                <select
                    value={fromUnit}
                    onChange={e => setFromUnit(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                >
                    {CONVERTERS[activeTab]?.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>

            <div style={{ textAlign: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
                ➔
            </div>

            <div className="field-group">
                <label>To</label>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius-sm)',
                    minHeight: '52px',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {calculateResult()}
                </div>
                <select
                    value={toUnit}
                    onChange={e => setToUnit(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                >
                    {CONVERTERS[activeTab]?.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 className="section-title">Engineering Calculators</h2>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setActiveTab('sizing')}
                        className={`btn-calc ${activeTab === 'sizing' ? 'active' : ''}`}
                        style={{
                            whiteSpace: 'nowrap',
                            background: activeTab === 'sizing' ? '#f59e0b' : 'transparent', // Amber for calc
                            color: activeTab === 'sizing' ? 'black' : 'var(--text-muted)',
                            border: activeTab === 'sizing' ? '1px solid #f59e0b' : '1px solid var(--border-color)'
                        }}
                    >
                        ⚡ Valve Sizing (Cv)
                    </button>
                    {['temperature', 'pressure', 'volumetricFlow', 'massFlow', 'torque', 'flowCoefficient'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); }}
                            className={`btn-secondary ${activeTab === tab ? 'active' : ''}`}
                            style={{
                                textTransform: 'capitalize',
                                whiteSpace: 'nowrap',
                                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            {tab.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveTab('massVol')}
                        className={`btn-secondary ${activeTab === 'massVol' ? 'active' : ''}`}
                        style={{
                            whiteSpace: 'nowrap',
                            background: activeTab === 'massVol' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'massVol' ? 'white' : 'var(--text-muted)'
                        }}
                    >
                        Mass ⟷ Vol
                    </button>
                    <button
                        onClick={() => { setActiveTab('flangeTables'); setFlangeStandard('ASME B16.5'); setFlangeClass('150'); }}
                        className={`btn-calc ${activeTab === 'flangeTables' ? 'active' : ''}`}
                        style={{
                            whiteSpace: 'nowrap',
                            background: activeTab === 'flangeTables' ? '#10b981' : 'transparent', // Emerald for Tables
                            color: activeTab === 'flangeTables' ? 'white' : 'var(--text-muted)',
                            border: activeTab === 'flangeTables' ? '1px solid #10b981' : '1px solid var(--border-color)'
                        }}
                    >
                        🔩 Flange Tables
                    </button>
                    <button
                        onClick={() => setActiveTab('rbi')}
                        className={`btn-calc ${activeTab === 'rbi' ? 'active' : ''}`}
                        style={{
                            whiteSpace: 'nowrap',
                            background: activeTab === 'rbi' ? '#0ea5e9' : 'transparent', // Blue for RBI
                            color: activeTab === 'rbi' ? 'white' : 'var(--text-muted)',
                            border: activeTab === 'rbi' ? '1px solid #0ea5e9' : '1px solid var(--border-color)'
                        }}
                    >
                        PRV RBI
                    </button>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};
