import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { testReportService } from '../services/testReportService';
import { ValveDataHeader } from '../components/inspection/ValveDataHeader';
import '../styles/InspectionForm.css';

const PRESSURE_UNITS = ['PSI', 'Bar', 'MPa'];
const SIGNAL_TYPES = ['mA', 'PSI', 'Bar'];

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
            lowPressureGas: { actual: '', allowable: '', unit: 'PSI', duration: '' },
            highPressureLiquid: { actual: '', allowable: '', unit: 'PSI', duration: '' }
        },
        strokeTest: {
            signalType: 'mA',
            minSignal: '',
            maxSignal: '',
            details: [
                { signal: '4', expectedTravel: '0%', allowable: '' },
                { signal: '8', expectedTravel: '25%', allowable: '' },
                { signal: '12', expectedTravel: '50%', allowable: '' },
                { signal: '16', expectedTravel: '75%', allowable: '' },
                { signal: '20', expectedTravel: '100%', allowable: '' }
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

    return (
        <div className="inspection-form">
            <div className="inspection-header">
                <button type="button" onClick={onBack} className="back-button">← Back</button>
                <h2>{reportId ? 'Edit Test Report' : 'New Test Report'}</h2>
            </div>

            <ValveDataHeader valveData={valveData} />

            <form onSubmit={handleSubmit}>
                {/* Pressure Test Section */}
                <section className="form-section">
                    <div style={{ marginBottom: '1rem' }}>
                        <h3>Pressure Test</h3>
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
                                    <label>Actual Pressure</label>
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
                                    <label>Actual Pressure</label>
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
                                    <label>Unit</label>
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
                                    <label>Actual Pressure</label>
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
                                    <label>Unit</label>
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
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Signal</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>% Valve Travel</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Allowable Valve Travel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.strokeTest.details.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.signal}
                                                    onChange={e => updateStrokeRow(idx, 'signal', e.target.value)}
                                                    className="table-input"
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.expectedTravel}
                                                    readOnly
                                                    className="table-input"
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.allowable}
                                                    onChange={e => updateStrokeRow(idx, 'allowable', e.target.value)}
                                                    className="table-input"
                                                    placeholder="Enter allowable..."
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
