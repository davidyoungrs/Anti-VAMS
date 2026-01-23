import React, { useState, useEffect } from 'react';
import {
    inspectionService,
    VALVE_COMPONENTS,
    COMPONENT_LABELS,
    CONDITION_OPTIONS,
    ACTION_OPTIONS
} from '../services/inspectionService';
import '../styles/InspectionForm.css';

export default function InspectionForm({ valveId, inspectionId, onBack, onSave }) {
    const [inspection, setInspection] = useState({
        valveId: valveId,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectorName: '',
        components: {},
        repairNotes: '',
        overallResult: '',
        inspectionPhotos: []
    });

    const [photoFiles, setPhotoFiles] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    // Load existing inspection if editing
    useEffect(() => {
        if (inspectionId) {
            loadInspection();
        }
    }, [inspectionId]);

    const loadInspection = async () => {
        const inspections = await inspectionService.getByValveId(valveId);
        const existing = inspections.find(i => i.id === inspectionId);
        if (existing) {
            setInspection(existing);
        }
    };

    const handleFieldChange = (field, value) => {
        setInspection(prev => ({ ...prev, [field]: value }));
    };

    const handleComponentChange = (componentKey, field, value) => {
        setInspection(prev => ({
            ...prev,
            components: {
                ...prev.components,
                [componentKey]: {
                    ...prev.components[componentKey],
                    [field]: value
                }
            }
        }));
    };

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files);
        setPhotoFiles(prev => [...prev, ...files]);
    };

    const removePhoto = (index) => {
        setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const finalInspection = {
                ...inspection,
                inspectionPhotos: [...(inspection.inspectionPhotos || []), ...photoFiles]
            };

            const saved = await inspectionService.save(finalInspection);
            alert('Inspection saved successfully!');
            if (onSave) onSave(saved);
            if (onBack) onBack();
        } catch (error) {
            alert('Failed to save inspection: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Group components by category for better UX
    const componentGroups = {
        'Operator Components': [
            'bearingCap', 'capscrews', 'stemNut', 'upperBearing', 'lowerBearing',
            'greaseFitting', 'handwheelOring', 'handwheel', 'stemProtectorAssembly',
            'indicatorRod', 'rodWiper', 'bevelGearOperator', 'stemProtector',
            'pipeCap', 'indicatorRod2', 'rodWiper2'
        ],
        'Body & Bonnet': [
            'bodyBonnetStuds', 'bodyBonnetNuts', 'yokeBonnetStuds', 'yokeBonnetNuts',
            'body', 'bonnet', 'yokeTube'
        ],
        'Fittings & Accessories': [
            'packingInjection', 'ventFittings', 'greaseFittings', 'reliefValve',
            'nippleRV', 'elbow'
        ],
        'Seals & Packing': [
            'bodyBonnetSeal', 'seatRearOrings', 'yokeTubeGasket', 'packingSet'
        ],
        'Internal Components': [
            'gateSegmentAssembly', 'stem', 'seatAssembly', 'gateSkirt', 'seatSkirt'
        ],
        'Other': ['other']
    };

    return (
        <div className="inspection-form">
            <div className="inspection-header">
                <button onClick={onBack} className="back-button">← Back to Inspections</button>
                <h2>{inspectionId ? 'Edit Inspection' : 'New Inspection'}</h2>
            </div>

            <form onSubmit={handleSubmit}>
                {/* General Information */}
                <section className="form-section">
                    <h3>General Information</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Inspection Date *</label>
                            <input
                                type="date"
                                value={inspection.inspectionDate}
                                onChange={(e) => handleFieldChange('inspectionDate', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Inspector Name</label>
                            <input
                                type="text"
                                value={inspection.inspectorName || ''}
                                onChange={(e) => handleFieldChange('inspectorName', e.target.value)}
                                placeholder="Enter inspector name"
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>Overall Result</label>
                            <select
                                value={inspection.overallResult || ''}
                                onChange={(e) => handleFieldChange('overallResult', e.target.value)}
                            >
                                <option value="">Select Result</option>
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                                <option value="Conditional">Conditional</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Component Inspection */}
                <section className="form-section">
                    <h3>Component Inspection</h3>
                    <p className="section-description">
                        Inspect each component and record condition, action taken, and details.
                    </p>

                    {Object.entries(componentGroups).map(([groupName, components]) => (
                        <div key={groupName} className="component-group">
                            <div
                                className="group-header"
                                onClick={() => toggleSection(groupName)}
                            >
                                <h4>{groupName}</h4>
                                <span className="toggle-icon">
                                    {expandedSections[groupName] ? '▼' : '▶'}
                                </span>
                            </div>

                            {expandedSections[groupName] && (
                                <div className="component-list">
                                    {components.map(componentKey => (
                                        <div key={componentKey} className="component-item">
                                            <div className="component-name">
                                                {COMPONENT_LABELS[componentKey]}
                                            </div>
                                            <div className="component-fields">
                                                <div className="field-group">
                                                    <label>Condition</label>
                                                    <select
                                                        value={inspection.components[componentKey]?.condition || ''}
                                                        onChange={(e) => handleComponentChange(componentKey, 'condition', e.target.value)}
                                                    >
                                                        {CONDITION_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="field-group">
                                                    <label>Action</label>
                                                    <select
                                                        value={inspection.components[componentKey]?.action || ''}
                                                        onChange={(e) => handleComponentChange(componentKey, 'action', e.target.value)}
                                                    >
                                                        {ACTION_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="field-group">
                                                    <label>Part Number</label>
                                                    <input
                                                        type="text"
                                                        value={inspection.components[componentKey]?.partNumber || ''}
                                                        onChange={(e) => handleComponentChange(componentKey, 'partNumber', e.target.value)}
                                                        placeholder="Part #"
                                                    />
                                                </div>
                                                <div className="field-group">
                                                    <label>Material</label>
                                                    <input
                                                        type="text"
                                                        value={inspection.components[componentKey]?.material || ''}
                                                        onChange={(e) => handleComponentChange(componentKey, 'material', e.target.value)}
                                                        placeholder="Material"
                                                    />
                                                </div>
                                                <div className="field-group full-width">
                                                    <label>Comments</label>
                                                    <input
                                                        type="text"
                                                        value={inspection.components[componentKey]?.comments || ''}
                                                        onChange={(e) => handleComponentChange(componentKey, 'comments', e.target.value)}
                                                        placeholder="Additional notes"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </section>

                {/* Repair Notes */}
                <section className="form-section">
                    <h3>Repair Notes</h3>
                    <textarea
                        value={inspection.repairNotes || ''}
                        onChange={(e) => handleFieldChange('repairNotes', e.target.value)}
                        placeholder="Enter detailed repair notes, observations, or recommendations..."
                        rows="6"
                    />
                </section>

                {/* Photos */}
                <section className="form-section">
                    <h3>Inspection Photos</h3>
                    <div className="photo-upload">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                            id="inspection-photos"
                        />
                        <label htmlFor="inspection-photos" className="upload-button">
                            📷 Add Photos
                        </label>
                    </div>

                    {photoFiles.length > 0 && (
                        <div className="photo-previews">
                            {photoFiles.map((file, index) => (
                                <div key={index} className="photo-preview">
                                    <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="remove-photo"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {inspection.inspectionPhotos && inspection.inspectionPhotos.length > 0 && (
                        <div className="existing-photos">
                            <h4>Existing Photos</h4>
                            <div className="photo-previews">
                                {inspection.inspectionPhotos.map((url, index) => (
                                    <div key={index} className="photo-preview">
                                        <img src={url} alt={`Inspection ${index + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Actions */}
                <div className="form-actions">
                    <button type="button" onClick={onBack} className="cancel-button">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="save-button">
                        {isSaving ? 'Saving...' : 'Save Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
}
