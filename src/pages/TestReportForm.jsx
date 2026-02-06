import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { testReportService } from '../services/testReportService';
import { ValveDataHeader } from '../components/inspection/ValveDataHeader';
import '../styles/InspectionForm.css';

const PRESSURE_UNITS = ['PSI', 'Bar', 'MPa'];
const LEAKAGE_UNITS = ['bubbles/min', 'ml/min', 'cc/min', 'drops/min'];
const SIGNAL_TYPES = ['mA', 'PSI', 'Bar'];

import { standardsService } from '../services/standardsService';

export default function TestReportForm({ valveId, reportId, inspectionId, onBack, onSave }) {
    const [report, setReport] = useState({
        valveId: valveId,
        inspectionId: inspectionId,
        testDate: new Date().toISOString().split('T')[0],
        applicableTests: {
            hydrotest: true,
            lowPressureGas: true,
            highPressureLiquid: true
        },
        pressureTest: {
            hydrotest: { actual: '', allowable: '', unit: 'PSI', duration: '' },
            lowPressureGas: { actual: '', allowable: '', unit: 'PSI', duration: '', actualLeakage: '', allowableLeakage: '', leakageUnit: 'bubbles/min' },
            highPressureLiquid: { actual: '', allowable: '', unit: 'PSI', duration: '', actualLeakage: '', allowableLeakage: '', leakageUnit: 'ml/min' }
        },
        strokeTest: {
            signalType: 'mA',
            minSignal: '',
            maxSignal: '',
            details: [
                { signal: '4', expectedTravel: '0%', actual: '' },
                { signal: '8', expectedTravel: '25%', actual: '' },
                { signal: '12', expectedTravel: '50%', actual: '' },
                { signal: '16', expectedTravel: '75%', actual: '' },
                { signal: '20', expectedTravel: '100%', actual: '' }
            ]
        },
        equipment: {
            pressureGauge: { serialNo: '', certNo: '', dueDate: '' },
            chartRecorder: { serialNo: '', certNo: '', dueDate: '' },
            source: { unit: 'mA', serialNo: '', range: '', dueDate: '' },
            gaugesUsed: { serialNo: '', range: '', dueDate: '' }
        },
        approvals: {
            tester: { name: '', signature: '', date: new Date().toISOString().split('T')[0] },
            approver: { name: '', signature: '', date: '' },
            witness: { name: '', signature: '', date: '' }
        }
    });

    const [valveData, setValveData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Auto-calculate stroke test signals when min/max change
        const minVal = parseFloat(report.strokeTest.minSignal);
        const maxVal = parseFloat(report.strokeTest.maxSignal);

        if (!isNaN(minVal) && !isNaN(maxVal)) {
            const range = maxVal - minVal;
            const newDetails = report.strokeTest.details.map((row, index) => {
                // index 0 = 0%, 1=25%, 2=50%, 3=75%, 4=100%
                const calculatedSignal = minVal + (range * (index * 0.25));
                return { ...row, signal: Number.isInteger(calculatedSignal) ? calculatedSignal.toString() : calculatedSignal.toFixed(2) };
            });

            // Check if signals need update to prevent infinite loops (though dependency array handles it well)
            const currentSignals = report.strokeTest.details.map(d => d.signal).join(',');
            const newSignals = newDetails.map(d => d.signal).join(',');

            if (currentSignals !== newSignals) {
                setReport(prev => ({
                    ...prev,
                    strokeTest: { ...prev.strokeTest, details: newDetails }
                }));
            }
        }
    }, [report.strokeTest.minSignal, report.strokeTest.maxSignal]);

    const handleCalculateStandards = () => {
        if (!valveData) {
            alert("No valve data available to calculate standards.");
            return;
        }

        const standards = standardsService.calculate(valveData.sizeClass, valveData.mawp);

        if (standards.notes.length > 0) {
            // Show notes but proceed if possible
            alert(`Calculation Notes:\n- ${standards.notes.join('\n- ')}\n\nProceeding with available data...`);
        }

        if (standards.shell.pressure === 0 && standards.seatHP.pressure === 0) {
            alert("Could not calculate pressures. Please check Valve Size and Pressure Class inputs.");
            return;
        }

        if (!window.confirm(`Apply API 598 Standards?\n\nShell: ${standards.shell.pressure} ${standards.shell.unit} (${standards.shell.duration}s)\nSeat (HP): ${standards.seatHP.pressure} ${standards.seatHP.unit} (${standards.seatHP.duration}s)\nSeat (LP): ${standards.seatLP.pressure} ${standards.seatLP.unit}\n\nThis will overwrite current 'Allowable' fields.`)) {
            return;
        }

        setReport(prev => ({
            ...prev,
            pressureTest: {
                ...prev.pressureTest,
                hydrotest: {
                    ...prev.pressureTest.hydrotest,
                    allowable: standards.shell.pressure,
                    unit: standards.shell.unit,
                    duration: (standards.shell.duration / 60).toString() // Convert seconds to mins
                },
                lowPressureGas: {
                    ...prev.pressureTest.lowPressureGas,
                    allowable: standards.seatLP.pressure,
                    unit: standards.seatLP.unit,
                    duration: (standards.seatLP.duration / 60).toString(),
                    allowableLeakage: '0', // ISO 5208 Rate A default? Or user must specify? API 598 usually "No visible leakage" for gas depending on size/type.
                    // Let's leave leakage empty or set '0' for strict.
                },
                highPressureLiquid: {
                    ...prev.pressureTest.highPressureLiquid,
                    allowable: standards.seatHP.pressure,
                    unit: standards.seatHP.unit,
                    duration: (standards.seatHP.duration / 60).toString(),
                    allowableLeakage: '0'
                }
            }
        }));
    };

    useEffect(() => {
        const loadData = async () => {

            if (valveId) {
                const records = await storageService.getAll();
                const valve = records.find(r => r.id === valveId);
                if (valve) setValveData(valve);
            }

            if (reportId) {
                const reports = await testReportService.getByValveId(valveId);
                const existing = reports.find(r => r.id === reportId);
                if (existing) {
                    // Merge with defaults to ensure all fields exist
                    setReport(prev => ({
                        ...prev,
                        ...existing,
                        applicableTests: { ...prev.applicableTests, ...(existing.applicableTests || {}) },
                        pressureTest: { ...prev.pressureTest, ...(existing.pressureTest || {}) },
                        strokeTest: { ...prev.strokeTest, ...(existing.strokeTest || {}) },
                        // Ensure legacy reports have 'actual' field instead of 'allowable' if needed, or initialized
                        equipment: { ...prev.equipment, ...(existing.equipment || {}) },
                        approvals: { ...prev.approvals, ...(existing.approvals || {}) }
                    }));
                }
            } else {
                // Initialize default stroke test points based on signal type if needed
                // For now, default is mA (4-20)
            }
        };
        loadData();
    }, [valveId, reportId]);

    const handlePressureChange = (testType, field, value) => {
        setReport(prev => ({
            ...prev,
            pressureTest: {
                ...prev.pressureTest,
                [testType]: {
                    ...prev.pressureTest[testType],
                    [field]: value
                }
            }
        }));
    };

    const handleEquipmentChange = (equipType, field, value) => {
        setReport(prev => ({
            ...prev,
            equipment: {
                ...prev.equipment,
                [equipType]: {
                    ...prev.equipment[equipType],
                    [field]: value
                }
            }
        }));
    };

    const handleApprovalChange = (role, field, value) => {
        setReport(prev => ({
            ...prev,
            approvals: {
                ...prev.approvals,
                [role]: {
                    ...prev.approvals[role],
                    [field]: value
                }
            }
        }));
    };

    const updateStrokeRow = (index, field, value) => {
        const newDetails = [...report.strokeTest.details];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setReport(prev => ({
            ...prev,
            strokeTest: { ...prev.strokeTest, details: newDetails }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await testReportService.save(report);
            alert('Test Report saved successfully!');
            if (onBack) onBack();
        } catch (error) {
            alert('Failed to save report: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const isControlValve = valveData?.valveType === 'Globe Control Valve'; // Or other control types

    const renderPassFail = (actual, limit, type) => {
        if (!actual || !limit) return null;
        const a = parseFloat(actual);
        const l = parseFloat(limit);
        if (isNaN(a) || isNaN(l)) return null;

        let passed = false;
        if (type === 'pressure') passed = a >= l; // Pressure Test: Must hold at least Required Pressure
        if (type === 'leakage') passed = a <= l; // Leakage: Must be less than Max Allowed

        return (
            <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7em',
                padding: '1px 4px',
                borderRadius: '4px',
                background: passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: passed ? '#22c55e' : '#ef4444',
                border: `1px solid ${passed ? '#22c55e' : '#ef4444'}`,
                fontWeight: 'bold',
                verticalAlign: 'middle'
            }}>
                {passed ? 'PASS' : 'FAIL'}
            </span>
        );
    };

    return (
        <div className="inspection-form">
            <div className="inspection-header">
                <button type="button" onClick={onBack} className="back-button">← Back</button>
                <h2>{reportId ? 'Edit Test Report' : 'New Test Report'}</h2>
            </div>

            <ValveDataHeader valveData={valveData} />

            <form onSubmit={handleSubmit}>
                {/* Pressure Test Section */}
                <section className="form-section pressure-test-section">
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3>Pressure Test</h3>
                        <button
                            type="button"
                            onClick={handleCalculateStandards}
                            className="btn-secondary"
                            style={{
                                fontSize: '0.9rem',
                                padding: '0.4rem 0.8rem',
                                gap: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                background: '#4b5563', // Gray-600
                                color: 'white',
                                border: '1px solid #374151'
                            }}
                            title="Auto-calculate Shell/Seat pressures based on Valve Size & Class (API 598)"
                        >
                            ⚡ Calculate API 598 Params
                        </button>
                    </div>

                    <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                        {/* Hydrotest */}
                        <div className="glass-panel" style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            opacity: report.applicableTests?.hydrotest !== false ? 1 : 0.5,
                            pointerEvents: report.applicableTests?.hydrotest !== false ? 'auto' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', pointerEvents: 'auto' }}>
                                <input
                                    type="checkbox"
                                    checked={report.applicableTests?.hydrotest !== false}
                                    onChange={e => setReport(prev => ({ ...prev, applicableTests: { ...prev.applicableTests, hydrotest: e.target.checked } }))}
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                                <h4 style={{ margin: 0, color: 'var(--accent)' }}>Hydrotest</h4>
                            </div>
                            <div className="grid-2">
                                <div className="field-group">
                                    <label>
                                        Actual Pressure
                                        {renderPassFail(report.pressureTest.hydrotest.actual, report.pressureTest.hydrotest.allowable, 'pressure')}
                                    </label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.hydrotest.actual}
                                        onChange={e => handlePressureChange('hydrotest', 'actual', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Allowable Pressure</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.hydrotest.allowable}
                                        onChange={e => handlePressureChange('hydrotest', 'allowable', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Unit</label>
                                    <select
                                        value={report.pressureTest.hydrotest.unit}
                                        onChange={e => handlePressureChange('hydrotest', 'unit', e.target.value)}
                                    >
                                        {PRESSURE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>Duration (mins)</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.hydrotest.duration}
                                        onChange={e => handlePressureChange('hydrotest', 'duration', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Low Pressure Gas */}
                        <div className="glass-panel" style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            opacity: report.applicableTests?.lowPressureGas !== false ? 1 : 0.5,
                            pointerEvents: report.applicableTests?.lowPressureGas !== false ? 'auto' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', pointerEvents: 'auto' }}>
                                <input
                                    type="checkbox"
                                    checked={report.applicableTests?.lowPressureGas !== false}
                                    onChange={e => setReport(prev => ({ ...prev, applicableTests: { ...prev.applicableTests, lowPressureGas: e.target.checked } }))}
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                                <h4 style={{ margin: 0, color: 'var(--accent)' }}>Low Pressure Gas Seat Leak</h4>
                            </div>
                            <div className="grid-2">
                                <div className="field-group">
                                    <label>
                                        Actual Pressure
                                        {renderPassFail(report.pressureTest.lowPressureGas.actual, report.pressureTest.lowPressureGas.allowable, 'pressure')}
                                    </label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.lowPressureGas.actual}
                                        onChange={e => handlePressureChange('lowPressureGas', 'actual', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Allowable Pressure</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.lowPressureGas.allowable}
                                        onChange={e => handlePressureChange('lowPressureGas', 'allowable', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Pressure Unit</label>
                                    <select
                                        value={report.pressureTest.lowPressureGas.unit}
                                        onChange={e => handlePressureChange('lowPressureGas', 'unit', e.target.value)}
                                    >
                                        {PRESSURE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>Duration (mins)</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.lowPressureGas.duration}
                                        onChange={e => handlePressureChange('lowPressureGas', 'duration', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>
                                        Actual Leakage
                                        {renderPassFail(report.pressureTest.lowPressureGas.actualLeakage, report.pressureTest.lowPressureGas.allowableLeakage, 'leakage')}
                                    </label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.lowPressureGas.actualLeakage || ''}
                                        onChange={e => handlePressureChange('lowPressureGas', 'actualLeakage', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Allowable Leakage</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.lowPressureGas.allowableLeakage || ''}
                                        onChange={e => handlePressureChange('lowPressureGas', 'allowableLeakage', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Leakage Unit</label>
                                    <select
                                        value={report.pressureTest.lowPressureGas.leakageUnit || 'bubbles/min'}
                                        onChange={e => handlePressureChange('lowPressureGas', 'leakageUnit', e.target.value)}
                                    >
                                        {LEAKAGE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* High Pressure Liquid */}
                        <div className="glass-panel" style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            opacity: report.applicableTests?.highPressureLiquid !== false ? 1 : 0.5,
                            pointerEvents: report.applicableTests?.highPressureLiquid !== false ? 'auto' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', pointerEvents: 'auto' }}>
                                <input
                                    type="checkbox"
                                    checked={report.applicableTests?.highPressureLiquid !== false}
                                    onChange={e => setReport(prev => ({ ...prev, applicableTests: { ...prev.applicableTests, highPressureLiquid: e.target.checked } }))}
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                                <h4 style={{ margin: 0, color: 'var(--accent)' }}>High Pressure Liquid Seat Leak</h4>
                            </div>
                            <div className="grid-2">
                                <div className="field-group">
                                    <label>
                                        Actual Pressure
                                        {renderPassFail(report.pressureTest.highPressureLiquid.actual, report.pressureTest.highPressureLiquid.allowable, 'pressure')}
                                    </label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.highPressureLiquid.actual}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'actual', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Allowable Pressure</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.highPressureLiquid.allowable}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'allowable', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Pressure Unit</label>
                                    <select
                                        value={report.pressureTest.highPressureLiquid.unit}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'unit', e.target.value)}
                                    >
                                        {PRESSURE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>Duration (mins)</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.highPressureLiquid.duration}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'duration', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>
                                        Actual Leakage
                                        {renderPassFail(report.pressureTest.highPressureLiquid.actualLeakage, report.pressureTest.highPressureLiquid.allowableLeakage, 'leakage')}
                                    </label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.highPressureLiquid.actualLeakage || ''}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'actualLeakage', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Allowable Leakage</label>
                                    <input
                                        type="text"
                                        value={report.pressureTest.highPressureLiquid.allowableLeakage || ''}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'allowableLeakage', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Leakage Unit</label>
                                    <select
                                        value={report.pressureTest.highPressureLiquid.leakageUnit || 'ml/min'}
                                        onChange={e => handlePressureChange('highPressureLiquid', 'leakageUnit', e.target.value)}
                                    >
                                        {LEAKAGE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stroke Test - Conditional */}
                {isControlValve && (
                    <section className="form-section">
                        <h3>Stroke Test</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                            <div className="field-group">
                                <label>Signal Type</label>
                                <select
                                    value={report.strokeTest.signalType}
                                    onChange={e => {
                                        setReport(prev => ({
                                            ...prev,
                                            strokeTest: { ...prev.strokeTest, signalType: e.target.value }
                                        }));
                                    }}
                                >
                                    {SIGNAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="field-group">
                                <label>Min Signal</label>
                                <input
                                    type="text"
                                    value={report.strokeTest.minSignal}
                                    onChange={e => setReport(prev => ({ ...prev, strokeTest: { ...prev.strokeTest, minSignal: e.target.value } }))}
                                    placeholder="e.g. 4 mA"
                                />
                            </div>
                            <div className="field-group">
                                <label>Max Signal</label>
                                <input
                                    type="text"
                                    value={report.strokeTest.maxSignal}
                                    onChange={e => setReport(prev => ({ ...prev, strokeTest: { ...prev.strokeTest, maxSignal: e.target.value } }))}
                                    placeholder="e.g. 20 mA"
                                />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#2c3e50' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#2c3e50' }}>Stroke Signal</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#2c3e50' }}>Expect Stroke %</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#2c3e50' }}>Actual stroke %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.strokeTest.details.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.signal}
                                                    readOnly
                                                    className="table-input"
                                                    style={{ background: 'transparent', border: 'none', color: '#2c3e50' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.expectedTravel}
                                                    readOnly
                                                    className="table-input"
                                                    style={{ background: 'transparent', border: 'none', color: '#2c3e50' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.actual}
                                                    onChange={e => updateStrokeRow(idx, 'actual', e.target.value)}
                                                    className="table-input"
                                                    placeholder="Enter actual..."
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Equipment Section */}
                <section className="form-section">
                    <h3>Test Equipment Used</h3>

                    {/* Standard Equipment */}
                    <div className="grid-responsive mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0' }}>Pressure Gauge</h4>
                            <div className="field-group">
                                <label>Serial No</label>
                                <input
                                    type="text"
                                    value={report.equipment.pressureGauge.serialNo}
                                    onChange={e => handleEquipmentChange('pressureGauge', 'serialNo', e.target.value)}
                                />
                            </div>
                            <div className="field-group">
                                <label>Calibration Cert No</label>
                                <input
                                    type="text"
                                    value={report.equipment.pressureGauge.certNo}
                                    onChange={e => handleEquipmentChange('pressureGauge', 'certNo', e.target.value)}
                                />
                            </div>
                            <div className="field-group">
                                <label>Calibration Due Date</label>
                                <input
                                    type="date"
                                    value={report.equipment.pressureGauge.dueDate}
                                    onChange={e => handleEquipmentChange('pressureGauge', 'dueDate', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0' }}>Chart Recorder</h4>
                            <div className="field-group">
                                <label>Serial No</label>
                                <input
                                    type="text"
                                    value={report.equipment.chartRecorder.serialNo}
                                    onChange={e => handleEquipmentChange('chartRecorder', 'serialNo', e.target.value)}
                                />
                            </div>
                            <div className="field-group">
                                <label>Calibration Cert No</label>
                                <input
                                    type="text"
                                    value={report.equipment.chartRecorder.certNo}
                                    onChange={e => handleEquipmentChange('chartRecorder', 'certNo', e.target.value)}
                                />
                            </div>
                            <div className="field-group">
                                <label>Calibration Due Date</label>
                                <input
                                    type="date"
                                    value={report.equipment.chartRecorder.dueDate}
                                    onChange={e => handleEquipmentChange('chartRecorder', 'dueDate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Control Valve Specific Equipment */}
                    {isControlValve && (
                        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0' }}>Source</h4>
                                <div className="field-group">
                                    <label>Unit/Type</label>
                                    <select
                                        value={report.equipment.source.unit}
                                        onChange={e => handleEquipmentChange('source', 'unit', e.target.value)}
                                    >
                                        {SIGNAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>Serial No</label>
                                    <input
                                        type="text"
                                        value={report.equipment.source.serialNo}
                                        onChange={e => handleEquipmentChange('source', 'serialNo', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Range</label>
                                    <input
                                        type="text"
                                        value={report.equipment.source.range}
                                        onChange={e => handleEquipmentChange('source', 'range', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        value={report.equipment.source.dueDate}
                                        onChange={e => handleEquipmentChange('source', 'dueDate', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0' }}>Gauges Used</h4>
                                <div className="field-group">
                                    <label>Serial No</label>
                                    <input
                                        type="text"
                                        value={report.equipment.gaugesUsed.serialNo}
                                        onChange={e => handleEquipmentChange('gaugesUsed', 'serialNo', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Range</label>
                                    <input
                                        type="text"
                                        value={report.equipment.gaugesUsed.range}
                                        onChange={e => handleEquipmentChange('gaugesUsed', 'range', e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        value={report.equipment.gaugesUsed.dueDate}
                                        onChange={e => handleEquipmentChange('gaugesUsed', 'dueDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Signatures */}
                <section className="form-section">
                    <h3>Approvals</h3>
                    <div className="grid-3" style={{ gap: '1.5rem' }}>
                        <div className="signature-block">
                            <label>Tester Name & Signature</label>
                            <input
                                type="text"
                                placeholder="Name / Signature"
                                value={report.approvals.tester.name}
                                onChange={e => handleApprovalChange('tester', 'name', e.target.value)}
                                className="mb-2"
                            />
                            <input
                                type="date"
                                value={report.approvals.tester.date}
                                onChange={e => handleApprovalChange('tester', 'date', e.target.value)}
                            />
                        </div>
                        <div className="signature-block">
                            <label>Technical Authority / Approver</label>
                            <input
                                type="text"
                                placeholder="Name / Signature"
                                value={report.approvals.approver.name}
                                onChange={e => handleApprovalChange('approver', 'name', e.target.value)}
                                className="mb-2"
                            />
                            <input
                                type="date"
                                value={report.approvals.approver.date}
                                onChange={e => handleApprovalChange('approver', 'date', e.target.value)}
                            />
                        </div>
                        <div className="signature-block">
                            <label>Inspector / Customer Witness</label>
                            <input
                                type="text"
                                placeholder="Name / Signature"
                                value={report.approvals.witness.name}
                                onChange={e => handleApprovalChange('witness', 'name', e.target.value)}
                                className="mb-2"
                            />
                            <input
                                type="date"
                                value={report.approvals.witness.date}
                                onChange={e => handleApprovalChange('witness', 'date', e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" onClick={onBack} className="cancel-button">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="save-button">
                        {isSaving ? 'Saving...' : 'Save Test Report'}
                    </button>
                </div>
            </form>
        </div>
    );
}
