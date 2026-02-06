import React, { useState } from 'react';

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


export const UnitConverter = () => {
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

    // Initialize defaults when tab changes
    React.useEffect(() => {
        if (CONVERTERS[activeTab]) {
            setFromUnit(CONVERTERS[activeTab].units[0]);
            setToUnit(CONVERTERS[activeTab].units[1]);
            setInputVal('');
        }
    }, [activeTab]);

    const calculateSizingResult = () => {
        // Common validations
        if (!sizingQ || !sizingDP) return { cv: '-', kv: '-' };
        const dp = parseFloat(sizingDP);
        if (isNaN(dp) || dp <= 0) return { cv: '-', kv: '-' };

        // Convert dP to PSI
        const dp_psi = (dp * CONVERTERS.pressure.factors[sizingDPUnit]) / 6894.76;

        let cv = 0;

        if (sizingType === 'liquid') {
            const q = parseFloat(sizingQ);
            const sg = parseFloat(sizingSG);
            if (isNaN(q) || isNaN(sg) || sg <= 0) return { cv: '-', kv: '-' };

            // Cv = Q(gpm) * sqrt(SG / dP(psi))
            // Convert Q to GPM
            const q_m3s = q * CONVERTERS.volumetricFlow.factors[sizingQUnit];
            const q_gpm = q_m3s / (0.00378541 / 60);

            cv = q_gpm * Math.sqrt(sg / dp_psi);
        }
        else if (sizingType === 'gas') {
            const q = parseFloat(sizingQ); // SCFM usually
            const p1 = parseFloat(sizingP1);
            const t = parseFloat(sizingTemp);
            const sg = parseFloat(sizingSG);
            if (isNaN(q) || isNaN(p1) || isNaN(t) || isNaN(sg)) return { cv: '-', kv: '-' };

            // P1 to PSI Abs
            // Assume input is Gauge? Usually Sizing requires Absolute.
            // Let's assume input is Gauge and add 14.7? Or assume Abs?
            // Safer to ask user. But for simplicity, let's assumes Gauge and add 14.7 if unit is not 'atm'?
            // Start simple: Convert to PSI. If unit is Bar/PSI, assume Gauge.
            const p1_psi_g = (p1 * CONVERTERS.pressure.factors[sizingP1Unit]) / 6894.76;
            const p1_abs = p1_psi_g + 14.7;

            // Temp to Rankine
            const t_k = CONVERTERS.temperature.convert(t, sizingTempUnit, 'Kelvin');
            const t_r = t_k * 1.8;

            // Convert Q to SCFM (Standard Cubic Feet per Minute)
            // 1 SCFM approx 0.0004719 m3/s
            // If unit is GPM ?? Gas usually measured in SCFM or m3/h.
            // We'll use vol flow factor.
            const q_m3s = q * CONVERTERS.volumetricFlow.factors[sizingQUnit];
            const q_scfm = q_m3s / 0.000471947;

            // Simplified Gas Formula (Subcritical)
            // Cv = Q_scfm * sqrt(SG * T_r) / (1360 * sqrt(dP * P1_abs))
            // Note: This is valid for dP < P1/2.
            // Check Critical Flow
            const x = dp_psi / p1_abs;
            if (x >= 0.5) {
                // Critical Flow
                // Cv = Q_scfm * sqrt(SG * T_r) / (963 * P1_abs)
                cv = (q_scfm * Math.sqrt(sg * t_r)) / (963 * p1_abs);
            } else {
                cv = (q_scfm * Math.sqrt(sg * t_r)) / (1360 * Math.sqrt(dp_psi * p1_abs));
            }
        }
        else if (sizingType === 'steam') {
            const w = parseFloat(sizingQ); // Mass Flow lb/hr
            const p1 = parseFloat(sizingP1);
            if (isNaN(w) || isNaN(p1)) return { cv: '-', kv: '-' };

            // Convert W to lb/hr
            const w_kgs = w * CONVERTERS.massFlow.factors[sizingQUnit];
            const w_lbhr = w_kgs * 3600 * 2.20462;

            const p1_psi_g = (p1 * CONVERTERS.pressure.factors[sizingP1Unit]) / 6894.76;
            const p1_abs = p1_psi_g + 14.7;
            const p2_abs = p1_abs - dp_psi;

            // Sat Steam Formula (FCI 77-1)
            // Cv = W / (2.1 * sqrt(dP * (P1 + P2)))
            // Assuming no superheat correction K=1

            // Check critical
            if (dp_psi > p1_abs / 2) {
                // Critical
                // Cv = W / (1.83 * P1)
                cv = w_lbhr / (1.83 * p1_abs);
            } else {
                cv = w_lbhr / (2.1 * Math.sqrt(dp_psi * (p1_abs + p2_abs)));
            }
        }
        else if (sizingType === 'multiphase') {
            const w = parseFloat(sizingQ); // Mass Flow lb/hr
            const rho = parseFloat(sizingDensity); // Mixture Density
            if (isNaN(w) || isNaN(rho)) return { cv: '-', kv: '-' };

            // Convert W to lb/hr
            const w_kgs = w * CONVERTERS.massFlow.factors[sizingQUnit];
            const w_lbhr = w_kgs * 3600 * 2.20462;

            // Convert Density to lb/ft3
            const rho_kgm3 = rho * DENSITY_FACTORS[sizingDensityUnit];
            const rho_lbft3 = rho_kgm3 * 0.062428;

            // Cv = W / (63.3 * sqrt(dP * rho))
            cv = w_lbhr / (63.3 * Math.sqrt(dp_psi * rho_lbft3));
        }

        if (isNaN(cv) || !isFinite(cv) || cv < 0) return { cv: '-', kv: '-' };
        const kv = cv * 0.865;
        return {
            cv: cv.toFixed(2),
            kv: kv.toFixed(2)
        };
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
            return res.toFixed(4).replace(/\.?0+$/, "");
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
        return res.toFixed(4).replace(/\.?0+$/, "");
    };



    const sizingRes = calculateSizingResult();

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
                </div>

                <div style={{ marginTop: '2rem' }}>
                    {activeTab === 'flangeTables' ? (
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
                    ) : activeTab === 'sizing' ? (
                        <div className="grid-2">
                            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                                <label style={{ marginBottom: '0.8rem', display: 'block' }}>Fluid Type</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {['liquid', 'gas', 'steam', 'multiphase'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSizingType(type)}
                                            style={{
                                                padding: '0.8rem',
                                                background: sizingType === type ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-color)',
                                                color: sizingType === type ? 'white' : 'var(--text-muted)',
                                                borderRadius: 'var(--radius-sm)',
                                                textTransform: 'capitalize',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
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
                                        {/* Note: Logic uses CONVERTERS units list */}
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
                    ) : activeTab === 'massVol' ? (
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
                                        <div style={{ fontWeight: 'bold', color: mvMode === 'massToVol' ? '#0ea5e9' : 'inherit', fontSize: '1.1rem' }}>Mass ➔ Volume</div>
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
                    ) : (
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
                                    {CONVERTERS[activeTab].units.map(u => <option key={u} value={u}>{u}</option>)}
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
                                    {CONVERTERS[activeTab].units.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
