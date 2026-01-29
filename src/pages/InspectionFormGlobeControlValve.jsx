import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    inspectionService,
    VALVE_COMPONENT_CONFIGS,
    COMPONENT_LABELS,
    CONDITION_OPTIONS,
    ACTION_OPTIONS
} from '../services/inspectionService';
import { storageService } from '../services/storage';
import { ValveDataHeader } from '../components/inspection/ValveDataHeader';
import { InspectionGeneralInfo } from '../components/inspection/InspectionGeneralInfo';
import { InspectionPhotos } from '../components/inspection/InspectionPhotos';
import '../styles/InspectionForm.css';

export default function InspectionFormGlobeControlValve({ valveId, inspectionId, onBack, onSave }) {
    const { role } = useAuth();
    const isReadOnly = role === 'client';
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
    const [valveData, setValveData] = useState(null);

    // Load valve data
    useEffect(() => {
        if (valveId) {
            loadValveData();
        }
    }, [valveId]);

    const loadValveData = async () => {
        const records = await storageService.getAll();
        const valve = records.find(r => r.id === valveId);
        if (valve) {
            setValveData(valve);
        }
    };

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

    const componentGroups = VALVE_COMPONENT_CONFIGS['Globe Control Valve'];

    return (
        <div className="inspection-form">
            <div className="inspection-header">
                <button onClick={onBack} className="back-button">← Back to Inspections</button>
                <h2>{inspectionId ? 'Edit Globe Control Valve Inspection' : 'New Globe Control Valve Inspection'}</h2>
            </div>

            <ValveDataHeader valveData={valveData} />

            <form onSubmit={handleSubmit}>
                <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                    <InspectionGeneralInfo
                        inspection={inspection}
                        onChange={handleFieldChange}
                    />

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
                                                    {COMPONENT_LABELS[componentKey] || componentKey}
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

                    <section className="form-section">
                        <h3>Repair Notes</h3>
                        <textarea
                            value={inspection.repairNotes || ''}
                            onChange={(e) => handleFieldChange('repairNotes', e.target.value)}
                            placeholder="Enter detailed repair notes, observations, or recommendations..."
                            rows="6"
                        />
                    </section>

                    <InspectionPhotos
                        photoFiles={photoFiles}
                        existingPhotos={inspection.inspectionPhotos}
                        onAddPhotos={handlePhotoChange}
                        onRemoveNewPhoto={removePhoto}
                        readOnly={isReadOnly}
                    />
                </fieldset>

                <div className="form-actions">
                    <button type="button" onClick={onBack} className="cancel-button">
                        {isReadOnly ? 'Back' : 'Cancel'}
                    </button>
                    {!isReadOnly && (
                        <button type="submit" disabled={isSaving} className="save-button">
                            {isSaving ? 'Saving...' : 'Save Inspection'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
