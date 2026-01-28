import React, { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { OCRButton } from '../components/OCRButton';
import { generateValveQR } from '../utils/qrCode';
import { FileUpload } from '../components/ui/FileUpload';
import { storageService } from '../services/storage';
import { generateFullReport } from '../services/reportGenerator';
import { inspectionService } from '../services/inspectionService';
import { testReportService } from '../services/testReportService';

export const RecordForm = ({ initialData, onSave, onNavigate }) => {
    const [formData, setFormData] = useState({
        serialNumber: '',
        jobNo: '',
        tagNo: '',
        orderNo: '',
        customer: '',
        oem: '',
        plantArea: '',
        siteLocation: '',
        dateIn: '',
        requiredDate: '',
        safetyCheck: '',
        decontaminationCert: 'N',
        lsaCheck: false,
        seizedMidStroke: false,
        modelNo: '',
        valveType: '',
        sizeClass: '',
        packingType: '',
        flangeType: '',
        mawp: '',
        bodyMaterial: '',
        seatMaterial: '',
        trimMaterial: '',
        obturatorMaterial: '',
        actuator: '',
        gearOperator: '',
        failMode: '',
        bodyTestSpec: '',
        seatTestSpec: '',
        bodyPressure: '',
        bodyPressureUnit: 'PSI',
        testedBy: '',
        testDate: '',
        testMedium: '',
        passFail: '',
        latitude: '',
        longitude: '',
        // Globe Control Valve Specifics
        actuatorSerial: '',
        actuatorMake: '',
        actuatorModel: '',
        actuatorType: '',
        actuatorOther: '',
        actuatorSize: '',
        actuatorRange: '',
        actuatorTravel: '',
        positionerModel: '',
        positionerSerial: '',
        positionerMode: '',
        positionerSignal: '',
        positionerCharacteristic: '',
        positionerSupply: '',
        positionerOther: '',
        regulatorModel: '',
        regulatorSetPoint: ''
    });

    const [files, setFiles] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (initialData) {
            const { files: initialFiles, ...rest } = initialData;
            setFormData(prev => ({ ...prev, ...rest }));
            if (initialFiles) {
                setFiles(initialFiles);
            }
        } else {
            // Reset to defaults if initialData is null (essential for "New Record" switch if component is reused)
            setFormData({
                serialNumber: '', jobNo: '', tagNo: '', orderNo: '', customer: '', oem: '', plantArea: '', siteLocation: '', dateIn: '', requiredDate: '', safetyCheck: '', decontaminationCert: 'N', lsaCheck: false, seizedMidStroke: false, modelNo: '', valveType: '', sizeClass: '', packingType: '', flangeType: '', mawp: '', bodyMaterial: '', seatMaterial: '', trimMaterial: '', obturatorMaterial: '', actuator: '', gearOperator: '', failMode: '', bodyTestSpec: '', seatTestSpec: '', bodyPressure: '', bodyPressureUnit: 'PSI', testedBy: '', testDate: '', testMedium: '', passFail: '',
                actuatorSerial: '', actuatorMake: '', actuatorModel: '', actuatorType: '', actuatorOther: '', actuatorSize: '', actuatorRange: '', actuatorTravel: '',
                positionerModel: '', positionerSerial: '', positionerMode: '', positionerSignal: '', positionerCharacteristic: '', positionerSupply: '', positionerOther: '', regulatorModel: '', regulatorSetPoint: ''
            });
            setFiles([]);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFiles = (newFiles) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDelete = () => {
        if (initialData?.id) {
            storageService.delete(initialData.id);
            if (onSave) onSave();
        }
    };

    const handleGenerateReport = async () => {
        if (!initialData?.id) {
            alert('Please save the record first before generating a report.');
            return;
        }

        try {
            // 1. Fetch related data
            const inspections = await inspectionService.getByValveId(initialData.id);
            const tests = await testReportService.getByValveId(initialData.id);

            // 2. Generate PDF Blob
            const pdfBlob = await generateFullReport(formData, inspections, tests);

            // 3. Create PDF File object
            const fileName = `Report_${formData.serialNumber || 'Valve'}_${new Date().toISOString().split('T')[0]}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            // 4. Generate QR Code Image File
            // Variable was used before initialization. Creating a temp object for QR generation (only needs ID).
            const qrInputRecord = { ...formData, id: initialData.id };
            const qrDataUrl = await generateValveQR(qrInputRecord);

            let filesToSave = [...files, pdfFile];

            if (qrDataUrl) {
                // Convert Data URL to File
                const res = await fetch(qrDataUrl);
                const blob = await res.blob();
                const qrFile = new File([blob], `QR_${formData.serialNumber || 'Valve'}.png`, { type: 'image/png' });
                filesToSave.push(qrFile);
            }

            // 5. Upload via storageService
            // Create a temporary record object to save
            // Use initialData.id specifically
            const recordToSave = { ...formData, id: initialData.id, files: filesToSave };
            const savedRecord = await storageService.save(recordToSave);

            setFiles(savedRecord.files); // Update local state with new URLs
            alert(`Report generated and attached: ${fileName}\nQR Code also saved to attachments.`);

        } catch (error) {
            console.error('Report generation failed:', error);
            alert(`Failed to generate report: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const record = { ...formData, files, id: initialData?.id }; // Preserve ID if editing

            const savedRecord = await storageService.save(record);

            alert('Record saved successfully!');

            // Update UI with the now-uploaded URLs if we are still editing
            if (initialData) {
                setFiles(savedRecord.files);
            }

            if (onSave) onSave();

            if (!initialData) {
                setFormData({
                    serialNumber: '', jobNo: '', tagNo: '', orderNo: '', customer: '', oem: '', plantArea: '', siteLocation: '', dateIn: '', requiredDate: '', safetyCheck: '', decontaminationCert: 'N', lsaCheck: false, seizedMidStroke: false, modelNo: '', valveType: '', sizeClass: '', packingType: '', flangeType: '', mawp: '', bodyMaterial: '', seatMaterial: '', trimMaterial: '', obturatorMaterial: '', actuator: '', gearOperator: '', failMode: '', bodyTestSpec: '', seatTestSpec: '', bodyPressure: '', bodyPressureUnit: 'PSI', testedBy: '', testDate: '', testMedium: '', passFail: ''
                });
                setFiles([]);
            }
        } catch (error) {
            console.error(error);
            alert('Error saving record');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0, border: 'none' }}>
                    {initialData ? 'Edit Valve Record' : 'New Valve Record'}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => onNavigate('dashboard')} className="btn-secondary">← Back</button>
                    {initialData && initialData.id && (
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            className="btn-primary"
                            style={{ background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <span>📄</span> Generate PDF Report
                        </button>
                    )}
                    {initialData && initialData.id && (
                        <button
                            type="button"
                            onClick={() => {
                                if (onNavigate) {
                                    onNavigate('inspection-list', initialData);
                                }
                            }}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            <span>🔍</span> Inspections & Tests
                        </button>
                    )}
                    {/* Direct Test Access */}
                    {initialData && initialData.id && (
                        <button
                            type="button"
                            onClick={() => {
                                if (onNavigate) {
                                    // We need to pass a special flag or handle this via App.jsx to jump straight to a new test
                                    // For now, let's navigate to inspection-list but with a "new test" intent if possible, 
                                    // OR simpler: App.jsx needs to support jumping to 'test-report-form' with a null reportId
                                    // Looking at App.jsx, it has 'onNewReport' prop passed to InspectionList, but here we only have 'onNavigate'.
                                    // Let's check App.jsx again. It handles 'data' arg in 'handleNavigate'.
                                    // We might need to update App.jsx to handle a 'new-test' action, OR just route to inspection-list and let them click 'New Test' there (which we just made easier).
                                    // Actually, let's try to be clever. App.jsx: handleNavigate('test-report-form', { valveId: initialData.id, reportId: null })
                                    // But wait, App.jsx 'handleNavigate' sets 'selectedRecord' with data. It doesn't set 'inspectionData'.
                                    // We might need to stick to "Inspections & Tests" being the hub for now to avoid App.jsx refactor.
                                    // BUT the user asked for "make suggestions for updates".
                                    // I'll stick to renaming the button for now as it solves the clarity issue, and later we can add direct deep linking if needed.
                                    // Wait, I can trigger a new report via InspectionList if I pass a param? No.
                                    // Let's stick to the plan: Rename button + Add 'New Test' button to RECORD FORM?
                                    // If I add 'New Test' button here, I need to know how to trigger it.
                                    // App.jsx doesn't seem to expose a direct "create test" route nicely without `inspectionData` state.
                                    // I'll stick to just renaming "View Inspections" -> "Inspections & Tests" as the PRIMARY improvement for now.
                                    // It reduces clutter.
                                }
                            }}
                            className="btn-secondary"
                            style={{ display: 'none' }} // Hidden for now until App.jsx routing supports direct deep link
                        >
                            🧪 New Test
                        </button>
                    )}
                    <button type="submit" className="btn-primary">Save Record</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                {/* Section 1: Identification */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Identification</h3>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Serial Number</label>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    name="serialNumber"
                                    value={formData.serialNumber}
                                    onChange={handleChange}
                                    required
                                    className="input-field"
                                    style={{ flex: 1 }}
                                />
                                <OCRButton onScanComplete={(text) => setFormData(prev => ({ ...prev, serialNumber: text }))} />
                            </div>
                        </div>
                        <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} required />
                        <Input label="OEM" name="oem" value={formData.oem} onChange={handleChange} required />
                        <Input label="Job No" name="jobNo" value={formData.jobNo} onChange={handleChange} />
                        <Input label="Tag No" name="tagNo" value={formData.tagNo} onChange={handleChange} />
                        <Input label="Order No" name="orderNo" value={formData.orderNo} onChange={handleChange} />
                        <Input label="Plant Area" name="plantArea" value={formData.plantArea} onChange={handleChange} />
                        <Input label="Site Location" name="siteLocation" value={formData.siteLocation} onChange={handleChange} />

                        {/* Valve Photo Section */}
                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>📸 Valve Identification Photo</h4>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Upload a photo of the valve for visual identification on the map and record.
                            </p>

                            {formData.valvePhoto && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <img
                                        src={typeof formData.valvePhoto === 'string' ? formData.valvePhoto : URL.createObjectURL(formData.valvePhoto)}
                                        alt="Valve preview"
                                        style={{
                                            width: '100%',
                                            maxWidth: '300px',
                                            height: '200px',
                                            objectFit: 'cover',
                                            borderRadius: 'var(--radius-md)',
                                            border: '2px solid var(--primary)'
                                        }}
                                    />
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                id="valve-photo-input"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setFormData(prev => ({ ...prev, valvePhoto: e.target.files[0] }));
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => document.getElementById('valve-photo-input').click()}
                                style={{ width: '100%' }}
                            >
                                {formData.valvePhoto ? '📷 Change Photo' : '📷 Upload Photo'}
                            </button>
                        </div>

                        <Input type="number" step="any" label="Latitude (GPS)" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="e.g. 51.505" />
                        <Input type="number" step="any" label="Longitude (GPS)" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="e.g. -0.09" />

                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition((position) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                latitude: position.coords.latitude,
                                                longitude: position.coords.longitude
                                            }));
                                        }, (err) => alert("Could not get location: " + err.message));
                                    } else {
                                        alert("Geolocation is not supported by your browser");
                                    }
                                }}
                            >
                                📍 Get Precise Location
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={() => onNavigate('single-map', formData)}
                            >
                                🗺️ View on Site Map
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 2: Specifications */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Specifications</h3>
                    <div className="grid-3">
                        <Input label="Make (Model No)" name="modelNo" value={formData.modelNo} onChange={handleChange} />
                        <Select
                            label="Valve Type"
                            name="valveType"
                            value={formData.valveType}
                            onChange={handleChange}
                            options={[
                                'Ball Valve',
                                'Gate Valve',
                                'Globe Control Valve',
                                'Butterfly Valve',
                                'Check Valve',
                                'Plug Valve',
                                'Pressure Relief Valve'
                            ]}
                        />
                        <Input label="Valve Size" name="sizeClass" value={formData.sizeClass} onChange={handleChange} />
                        <Input label="Packing Type" name="packingType" value={formData.packingType} onChange={handleChange} />
                        <Select
                            label="End Connection"
                            name="flangeType"
                            value={formData.flangeType}
                            onChange={handleChange}
                            options={['FF', 'RF', 'RTJ', 'BW', 'SW', 'Threaded', 'Hub / Clamp', 'Compression']}
                        />
                        <Input label="Pressure Class" name="mawp" value={formData.mawp} onChange={handleChange} />

                        <Input label="Body Material" name="bodyMaterial" value={formData.bodyMaterial} onChange={handleChange} />
                        <Input label="Seat Material" name="seatMaterial" value={formData.seatMaterial} onChange={handleChange} />
                        <Input label="Trim Material" name="trimMaterial" value={formData.trimMaterial} onChange={handleChange} />
                        <Input label="Obturator Material" name="obturatorMaterial" value={formData.obturatorMaterial} onChange={handleChange} />
                    </div>

                    <h4 className="mt-4 mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Actuation</h4>
                    {formData.valveType === 'Globe Control Valve' ? (
                        <div className="grid-2 manual-grid" style={{ gap: '2rem' }}>
                            {/* Actuator Column */}
                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                <h5 style={{ color: 'var(--primary)', margin: '0 0 1rem 0' }}>Actuator</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                    <Input label="Serial" name="actuatorSerial" value={formData.actuatorSerial} onChange={handleChange} />
                                    <Input label="Make" name="actuatorMake" value={formData.actuatorMake} onChange={handleChange} />
                                    <Input label="Model" name="actuatorModel" value={formData.actuatorModel} onChange={handleChange} />
                                    <Input label="Type" name="actuatorType" value={formData.actuatorType} onChange={handleChange} />
                                    <Input label="Other" name="actuatorOther" value={formData.actuatorOther} onChange={handleChange} />
                                    <Input label="Size" name="actuatorSize" value={formData.actuatorSize} onChange={handleChange} />
                                    <Input label="Range/Bench" name="actuatorRange" value={formData.actuatorRange} onChange={handleChange} />
                                    <Input label="Travel" name="actuatorTravel" value={formData.actuatorTravel} onChange={handleChange} />
                                    <Input label="Fail Mode" name="failMode" value={formData.failMode} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Instrumentation Column */}
                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                <h5 style={{ color: 'var(--primary)', margin: '0 0 1rem 0' }}>Instrumentation</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                    <Input label="Posit. Model Number" name="positionerModel" value={formData.positionerModel} onChange={handleChange} />
                                    <Input label="Posit. Serial Number" name="positionerSerial" value={formData.positionerSerial} onChange={handleChange} />
                                    <Input label="Posit. Characteristic" name="positionerCharacteristic" value={formData.positionerCharacteristic} onChange={handleChange} />
                                    <Input label="Posit. Supply" name="positionerSupply" value={formData.positionerSupply} onChange={handleChange} />
                                    <Input label="Posit. Mode" name="positionerMode" value={formData.positionerMode} onChange={handleChange} />
                                    <Input label="Posit. Signal" name="positionerSignal" value={formData.positionerSignal} onChange={handleChange} />
                                    <Input label="Regulator Model" name="regulatorModel" value={formData.regulatorModel} onChange={handleChange} />
                                    <Input label="Regulator Set Point" name="regulatorSetPoint" value={formData.regulatorSetPoint} onChange={handleChange} />
                                    <Input label="Other" name="positionerOther" value={formData.positionerOther} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid-3">
                            <Input label="Actuator" name="actuator" value={formData.actuator} onChange={handleChange} />
                            <Input label="Gear Operator" name="gearOperator" value={formData.gearOperator} onChange={handleChange} />
                            <Input label="Fail Mode" name="failMode" value={formData.failMode} onChange={handleChange} />
                        </div>
                    )}
                </div>

                {/* Section 3: Dates & Checks */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Status & Dates</h3>
                    <div className="grid-2">
                        <Input type="date" label="Date In" name="dateIn" value={formData.dateIn} onChange={handleChange} />
                        <Input type="date" label="Required Date" name="requiredDate" value={formData.requiredDate} onChange={handleChange} />
                        <Input label="Safety Check" name="safetyCheck" value={formData.safetyCheck} onChange={handleChange} />
                        <Select label="Decontamination Cert" name="decontaminationCert" value={formData.decontaminationCert} onChange={handleChange} options={['Y', 'N']} />

                        <div style={{ gridColumn: 'span 2' }}>
                            <Checkbox label="LSA Check" name="lsaCheck" checked={formData.lsaCheck} onChange={handleChange} />
                            <Checkbox label="Seized Mid Stroke" name="seizedMidStroke" checked={formData.seizedMidStroke} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* Section 4: Testing Results - REMOVED */}

                {/* Section 5: Attachments */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Attachments</h3>
                    <FileUpload label="Upload Images or PDFs" onFilesSelected={handleFiles} />

                    <div className="mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            📎 Attached Files ({files.length})
                        </h4>

                        {files.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                No attachments found for this record.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {files.map((f, i) => {
                                    const isUrl = typeof f === 'string';
                                    let name = isUrl ? f.split('/').pop() : (f.name || `File ${i + 1}`);

                                    // Remove auto-generated timestamp prefix for cleaner display (e.g., "12345_Report.pdf" -> "Report.pdf")
                                    if (name.match(/^\d+_.+/)) {
                                        name = name.replace(/^\d+_/, '');
                                    }

                                    const size = isUrl ? '' : (f.size ? `(${Math.round(f.size / 1024)} KB)` : '');

                                    return (
                                        <div key={i} className="glass-panel" style={{ padding: '0.75rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--primary-light)' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }} title={name}>
                                                {name}
                                            </div>
                                            {size && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{size}</div>}
                                            <div className="flex-row" style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                                                {isUrl ? (
                                                    <a href={f} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', textAlign: 'center', flex: 1 }}>
                                                        Browse File
                                                    </a>
                                                ) : (
                                                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.8rem', flex: 1 }}>Pending Save</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles(prev => prev.filter((_, index) => index !== i))}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0.35rem', borderRadius: '4px' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>



                {initialData && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            🗑️ Delete Record
                        </button>
                    </div>
                )}
            </div>

            {
                showDeleteConfirm && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center', background: 'var(--bg-surface)' }}>
                            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Confirm Deletion</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete this record? This action cannot be undone.</p>
                            <div className="flex-row" style={{ justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: '#ef4444',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </form >
    );
};
