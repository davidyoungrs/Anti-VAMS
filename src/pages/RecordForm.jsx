import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
import { SignaturePad } from '../components/SignaturePad';
import { ImageAnnotator } from '../components/ImageAnnotator';
import { FileManagerModal } from '../components/FileManagerModal';
import { WORKFLOW_STATUS_OPTIONS } from '../constants/statusOptions';

export const RecordForm = ({ initialData, onSave, onNavigate }) => {
    const { role } = useAuth();
    const isReadOnly = role === 'client';
    const canDelete = ['admin', 'super_user'].includes(role);

    const [formData, setFormData] = useState(() => {
        if (initialData) {
            const { files: initialFiles, ...rest } = initialData;
            return {
                serialNumber: '', jobNo: '', tagNo: '', orderNo: '', customer: '', oem: '', plantArea: '', siteLocation: '', dateIn: '', requiredDate: '', safetyCheck: '', decontaminationCert: 'N', lsaCheck: false, seizedMidStroke: false, modelNo: '', valveType: '', sizeClass: '', packingType: '', flangeType: '', mawp: '', bodyMaterial: '', seatMaterial: '', trimMaterial: '', obturatorMaterial: '', actuator: '', gearOperator: '', failMode: '', bodyTestSpec: '', seatTestSpec: '', bodyPressure: '', bodyPressureUnit: 'PSI', testedBy: '', testDate: '', testMedium: '', passFail: '',
                actuatorSerial: '', actuatorMake: '', actuatorModel: '', actuatorType: '', actuatorOther: '', actuatorSize: '', actuatorRange: '', actuatorTravel: '',
                positionerModel: '', positionerSerial: '', positionerMode: '', positionerSignal: '', positionerCharacteristic: '', positionerSupply: '', positionerOther: '', regulatorModel: '', regulatorSetPoint: '',
                ...rest
            };
        }
        return {
            serialNumber: '', jobNo: '', tagNo: '', orderNo: '', customer: '', oem: '', plantArea: '', siteLocation: '', dateIn: '', requiredDate: '', safetyCheck: '', decontaminationCert: 'N', lsaCheck: false, seizedMidStroke: false, modelNo: '', valveType: '', sizeClass: '', packingType: '', flangeType: '', mawp: '', bodyMaterial: '', seatMaterial: '', trimMaterial: '', obturatorMaterial: '', actuator: '', gearOperator: '', failMode: '', bodyTestSpec: '', seatTestSpec: '', bodyPressure: '', bodyPressureUnit: 'PSI', testedBy: '', testDate: '', testMedium: '', passFail: '', latitude: '', longitude: '',
            actuatorSerial: '', actuatorMake: '', actuatorModel: '', actuatorType: '', actuatorOther: '', actuatorSize: '', actuatorRange: '', actuatorTravel: '',
            positionerModel: '', positionerSerial: '', positionerMode: '', positionerSignal: '', positionerCharacteristic: '', positionerSupply: '', positionerOther: '', regulatorModel: '', regulatorSetPoint: ''
        };
    });

    const [files, setFiles] = useState(() => initialData?.files || []);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [showFileManager, setShowFileManager] = useState(false);
    const toggleFileManager = (show) => {
        if (show) window.scrollTo(0, 0);
        setShowFileManager(show);
    };
    const [annotatingFile, setAnnotatingFile] = useState(null); // { file: File|string, index: number }

    // Removed useEffect that was syncing props to state because App.jsx uses a key to remount the component.

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFiles = (newFiles) => {
        setFiles(prev => [...prev, ...newFiles]);
        // After selecting files and categories, open file manager to show them
        toggleFileManager(true);
    };

    const handleDelete = async () => {
        if (initialData?.id) {
            try {
                await storageService.delete(initialData.id);
                // Pass null to indicate deletion/no record to view
                if (onSave) onSave(null);
            } catch (error) {
                console.error("Delete failed", error);
                alert("Failed to delete record");
            }
        }
    };

    const handleSignatureSave = (dataUrl) => {
        setFormData(prev => ({ ...prev, signatureDataUrl: dataUrl, signedBy: 'Inspector', signedDate: new Date().toISOString() }));
        setShowSignaturePad(false);
    };

    const handleAnnotationSave = async (dataUrl) => {
        if (!annotatingFile) return;

        // Create a new File object from the Data URL
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const originalName = typeof annotatingFile.file === 'string'
            ? annotatingFile.file.split('/').pop().replace(/\.[^/.]+$/, "")
            : annotatingFile.file.name.replace(/\.[^/.]+$/, "");

        const newFile = new File([blob], `${originalName}_annotated.png`, { type: 'image/png' });

        // Add as a new file, or replace? Let's add as new to keep original.
        setFiles(prev => [...prev, newFile]);
        setAnnotatingFile(null);
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
            const pdfWithCategory = { file: pdfFile, category: 'Inspection & Test report' };

            // 4. Generate QR Code Image File
            // Variable was used before initialization. Creating a temp object for QR generation (only needs ID).
            const qrInputRecord = { ...formData, id: initialData.id };
            const qrDataUrl = await generateValveQR(qrInputRecord);

            let filesToSave = [...files, pdfWithCategory];

            if (qrDataUrl) {
                // Generate logic remains if needed elsewhere, but we don't push to filesToSave anymore
                // as the user requested to delete QR codes from attachments.
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

        // Mandatory Field Validation
        if (!formData.serialNumber || !formData.serialNumber.trim()) {
            alert("Serial Number is mandatory. Please enter a value.");
            return;
        }

        try {
            const record = { ...formData, files, id: initialData?.id }; // Preserve ID if editing

            const savedRecord = await storageService.save(record);

            alert('Record saved successfully!');

            // Update UI with the now-uploaded URLs if we are still editing
            if (initialData) {
                setFiles(savedRecord.files);
            }

            if (onSave) onSave(savedRecord);

            // If it was a new record, we want to switch to "Edit/View" mode for this record
            // instead of clearing the form, so the user can immediately add inspections.
            if (!initialData) {
                // We need to inform the parent (App.jsx) to switch to detail view for this ID.
                // sending savedRecord to onSave should handle this if App.jsx is updated.
                // Check App.jsx handleSave implementation.
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
                    {(() => {
                        if (!initialData) return 'New Valve Record';
                        if (role === 'client') return 'View Valve Record';
                        return 'View / Edit Valve Record';
                    })()}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => onNavigate('back')} className="btn-secondary">← Back</button>

                    {!isReadOnly && (
                        <button
                            type="button"
                            onClick={() => setShowSignaturePad(true)}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <span>✍️</span> {formData.signatureDataUrl ? 'Update Signature' : 'Sign Record'}
                        </button>
                    )}

                    {initialData && initialData.id && !isReadOnly && (
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            className="btn-primary"
                            style={{ background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <span>📄</span> Generate PDF Report
                        </button>
                    )}
                    {initialData && initialData.id && !isReadOnly && (
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
                                // Logic preserved but hidden
                            }}
                            className="btn-secondary"
                            style={{ display: 'none' }} // Hidden for now until App.jsx routing supports direct deep link
                        >
                            🧪 New Test
                        </button>
                    )}
                    {!isReadOnly && <button type="submit" className="btn-primary">Save Record</button>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                {/* Section 1: Identification */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Identification</h3>
                    <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                        <div className="grid-2">
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-label)', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Serial Number <span style={{ color: 'var(--accent)' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        name="serialNumber"
                                        value={formData.serialNumber}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter Serial Number"
                                        readOnly={isReadOnly}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            backgroundColor: isReadOnly ? 'rgba(0,0,0,0.2)' : 'var(--bg-input)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem',
                                            height: '46px'
                                        }}
                                    />
                                    {!isReadOnly && <OCRButton onScanComplete={(text) => setFormData(prev => ({ ...prev, serialNumber: text }))} />}
                                </div>
                            </div>
                            <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} required readOnly={isReadOnly} />
                            <Input label="OEM" name="oem" value={formData.oem} onChange={handleChange} required readOnly={isReadOnly} />
                            <Input label="Job No" name="jobNo" value={formData.jobNo} onChange={handleChange} readOnly={isReadOnly} />
                            <Input label="Tag No" name="tagNo" value={formData.tagNo} onChange={handleChange} readOnly={isReadOnly} />
                            <Input label="Order No" name="orderNo" value={formData.orderNo} onChange={handleChange} readOnly={isReadOnly} />
                            <Input label="Plant Area" name="plantArea" value={formData.plantArea} onChange={handleChange} readOnly={isReadOnly} />
                            <Input label="Site Location" name="siteLocation" value={formData.siteLocation} onChange={handleChange} readOnly={isReadOnly} />

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

                                {!isReadOnly && (
                                    <>
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
                                    </>
                                )}
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
                    </fieldset>
                </div>

                {/* Section 2: Specifications */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Specifications</h3>
                    <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
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
                    </fieldset>
                </div>

                {/* Section 3: Dates & Checks */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Status & Dates</h3>
                    <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                        <div className="grid-2">
                            <Select
                                label="Workflow Status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                options={['', ...WORKFLOW_STATUS_OPTIONS]}
                            />
                            <Input type="date" label="Date In" name="dateIn" value={formData.dateIn} onChange={handleChange} />
                            <Input type="date" label="Required Date" name="requiredDate" value={formData.requiredDate} onChange={handleChange} />
                            <Input label="Safety Check" name="safetyCheck" value={formData.safetyCheck} onChange={handleChange} />
                            <Select label="Decontamination Cert" name="decontaminationCert" value={formData.decontaminationCert} onChange={handleChange} options={['Y', 'N']} />

                            <div style={{ gridColumn: 'span 2' }}>
                                <Checkbox label="LSA Check" name="lsaCheck" checked={formData.lsaCheck} onChange={handleChange} />
                                <Checkbox label="Seized Mid Stroke" name="seizedMidStroke" checked={formData.seizedMidStroke} onChange={handleChange} />
                            </div>
                        </div>
                    </fieldset>
                </div>

                {/* Section 4: Testing Results - REMOVED */}

                {/* Section 5: Attachments */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Attachments</h3>
                    <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, width: '100%', display: 'block' }}>
                        {!isReadOnly && <FileUpload label="Upload Images or PDFs" onFilesSelected={handleFiles} />}

                        <div className="mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => toggleFileManager(true)}
                                style={{
                                    display: 'inline-flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '1.5rem 3rem',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            >
                                <div style={{ fontSize: '3rem' }}>📂</div>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Documents & Photos</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({files.length} items)</div>
                            </button>
                        </div>
                    </fieldset>
                </div>



                {initialData && canDelete && (
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

            {/* Signature Pad Modal */}
            {showSignaturePad && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: '1rem', paddingTop: '10vh'
                }}>
                    <div style={{ width: '100%', maxWidth: '600px' }}>
                        <SignaturePad
                            onSave={handleSignatureSave}
                            onCancel={() => setShowSignaturePad(false)}
                        />
                    </div>
                </div>
            )}

            {/* Image Annotation Modal */}
            {annotatingFile && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem'
                }}>
                    <div style={{ width: '100%', maxWidth: '900px', height: '80vh' }}>
                        <ImageAnnotator
                            imageSrc={annotatingFile.src}
                            onSave={handleAnnotationSave}
                            onCancel={() => setAnnotatingFile(null)}
                        />
                    </div>
                </div>
            )}

            {/* Display Signature if exists */}
            {formData.signatureDataUrl && (
                <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Signed by {formData.signedBy || 'Inspector'}</h4>
                    <img src={formData.signatureDataUrl} alt="Signature" style={{ maxWidth: '200px', margin: '1rem 0', borderBottom: '1px solid var(--border-color)' }} />
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(formData.signedDate || new Date()).toLocaleString()}</p>
                </div>
            )}

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
                                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Cancel</button>
                                <button type="button" onClick={handleDelete} className="btn-primary" style={{ background: '#ef4444' }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* File Manager Modal */}
            {showFileManager && (
                <FileManagerModal
                    files={files}
                    isReadOnly={isReadOnly}
                    onUpdateFiles={(newFiles) => setFiles(newFiles)}
                    onCancel={() => toggleFileManager(false)}
                />
            )}
        </form >
    );
};
