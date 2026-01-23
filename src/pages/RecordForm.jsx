import React, { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { FileUpload } from '../components/ui/FileUpload';
import { storageService } from '../services/storage';

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
        longitude: ''
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
                serialNumber: '', jobNo: '', tagNo: '', orderNo: '', customer: '', oem: '', plantArea: '', siteLocation: '', dateIn: '', requiredDate: '', safetyCheck: '', decontaminationCert: 'N', lsaCheck: false, seizedMidStroke: false, modelNo: '', valveType: '', sizeClass: '', packingType: '', flangeType: '', mawp: '', bodyMaterial: '', seatMaterial: '', trimMaterial: '', obturatorMaterial: '', actuator: '', gearOperator: '', failMode: '', bodyTestSpec: '', seatTestSpec: '', bodyPressure: '', bodyPressureUnit: 'PSI', testedBy: '', testDate: '', testMedium: '', passFail: ''
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
                <button type="submit" className="btn-primary">Save Record</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                {/* Section 1: Identification */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Identification</h3>
                    <div className="grid-2">
                        <Input label="Serial Number" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required />
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
                        <Input label="Valve Type" name="valveType" value={formData.valveType} onChange={handleChange} />
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
                    <div className="grid-3">
                        <Input label="Actuator" name="actuator" value={formData.actuator} onChange={handleChange} />
                        <Input label="Gear Operator" name="gearOperator" value={formData.gearOperator} onChange={handleChange} />
                        <Input label="Fail Mode" name="failMode" value={formData.failMode} onChange={handleChange} />
                    </div>
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

                {/* Section 4: Testing */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', gridColumn: '1 / -1' }}>
                    <h3 className="section-title">Testing Results</h3>
                    <div className="grid-3">
                        <Input label="Body Test Spec" name="bodyTestSpec" value={formData.bodyTestSpec} onChange={handleChange} />
                        <Input label="Seat Test Spec" name="seatTestSpec" value={formData.seatTestSpec} onChange={handleChange} />

                        <div className="flex-row">
                            <div style={{ flex: 2 }}>
                                <Input label="Body Pressure" name="bodyPressure" value={formData.bodyPressure} onChange={handleChange} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Select label="Unit" name="bodyPressureUnit" value={formData.bodyPressureUnit} onChange={handleChange} options={['PSI', 'Bar', 'MPa']} />
                            </div>
                        </div>

                        <Input label="Tested By" name="testedBy" value={formData.testedBy} onChange={handleChange} />
                        <Input type="date" label="Test Date" name="testDate" value={formData.testDate} onChange={handleChange} />
                        <Input label="Test Medium" name="testMedium" value={formData.testMedium} onChange={handleChange} />
                        <Select label="Pass / Fail" name="passFail" value={formData.passFail} onChange={handleChange} options={['Y', 'N']} />
                    </div>
                </div>

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
                                    const name = isUrl ? f.split('/').pop() : (f.name || `File ${i + 1}`);
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
