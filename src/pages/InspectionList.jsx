import React, { useState, useEffect } from 'react';
import { inspectionService } from '../services/inspectionService';
import '../styles/InspectionList.css';

export default function InspectionList({ valveId, onEdit, onNewInspection }) {
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        loadInspections();
    }, [valveId]);

    const loadInspections = async () => {
        setLoading(true);
        try {
            const data = await inspectionService.getByValveId(valveId);
            setInspections(data);
        } catch (error) {
            console.error('Failed to load inspections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inspection? This action cannot be undone.')) {
            return;
        }

        try {
            await inspectionService.delete(id);
            await loadInspections();
            alert('Inspection deleted successfully');
        } catch (error) {
            alert('Failed to delete inspection: ' + error.message);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getResultBadgeClass = (result) => {
        switch (result) {
            case 'Pass': return 'badge-pass';
            case 'Fail': return 'badge-fail';
            case 'Conditional': return 'badge-conditional';
            default: return 'badge-default';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getComponentCount = (components) => {
        if (!components) return 0;
        return Object.keys(components).filter(key =>
            components[key] && (
                components[key].condition ||
                components[key].action ||
                components[key].comments
            )
        ).length;
    };

    if (loading) {
        return (
            <div className="inspection-list">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading inspections...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inspection-list">
            <div className="list-header">
                <h3>Inspection History</h3>
                <button onClick={onNewInspection} className="new-inspection-button">
                    ➕ New Inspection
                </button>
            </div>

            {inspections.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h4>No Inspections Yet</h4>
                    <p>Start by creating your first inspection record for this valve.</p>
                    <button onClick={onNewInspection} className="empty-action-button">
                        Create First Inspection
                    </button>
                </div>
            ) : (
                <div className="inspections-grid">
                    {inspections.map((inspection) => (
                        <div key={inspection.id} className="inspection-card">
                            <div className="card-header" onClick={() => toggleExpand(inspection.id)}>
                                <div className="header-main">
                                    <div className="inspection-date">
                                        📅 {formatDate(inspection.inspectionDate)}
                                    </div>
                                    {inspection.overallResult && (
                                        <span className={`result-badge ${getResultBadgeClass(inspection.overallResult)}`}>
                                            {inspection.overallResult}
                                        </span>
                                    )}
                                </div>
                                <div className="header-meta">
                                    {inspection.inspectorName && (
                                        <span className="inspector">👤 {inspection.inspectorName}</span>
                                    )}
                                    <span className="component-count">
                                        {getComponentCount(inspection.components)} components inspected
                                    </span>
                                </div>
                                <div className="expand-icon">
                                    {expandedId === inspection.id ? '▼' : '▶'}
                                </div>
                            </div>

                            {expandedId === inspection.id && (
                                <div className="card-body">
                                    {inspection.repairNotes && (
                                        <div className="detail-section">
                                            <h5>Repair Notes</h5>
                                            <p>{inspection.repairNotes}</p>
                                        </div>
                                    )}

                                    {inspection.components && Object.keys(inspection.components).length > 0 && (
                                        <div className="detail-section">
                                            <h5>Component Details</h5>
                                            <div className="component-summary">
                                                {Object.entries(inspection.components)
                                                    .filter(([_, data]) => data && (data.condition || data.action))
                                                    .map(([key, data]) => (
                                                        <div key={key} className="component-row">
                                                            <span className="component-key">{key}</span>
                                                            <div className="component-info">
                                                                {data.condition && (
                                                                    <span className="info-tag condition">
                                                                        {data.condition}
                                                                    </span>
                                                                )}
                                                                {data.action && (
                                                                    <span className="info-tag action">
                                                                        {data.action}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {inspection.inspectionPhotos && inspection.inspectionPhotos.length > 0 && (
                                        <div className="detail-section">
                                            <h5>Photos ({inspection.inspectionPhotos.length})</h5>
                                            <div className="photo-thumbnails">
                                                {inspection.inspectionPhotos.map((url, index) => (
                                                    <img
                                                        key={index}
                                                        src={url}
                                                        alt={`Inspection photo ${index + 1}`}
                                                        className="thumbnail"
                                                        onClick={() => window.open(url, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="card-actions">
                                        <button
                                            onClick={() => onEdit(inspection.id)}
                                            className="edit-button"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inspection.id)}
                                            className="delete-button"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
