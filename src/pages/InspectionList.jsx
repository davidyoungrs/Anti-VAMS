import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { inspectionService, COMPONENT_LABELS } from '../services/inspectionService';
import { testReportService } from '../services/testReportService';
import '../styles/InspectionList.css';

import { storageService } from '../services/storage';
import { generateFullReport } from '../services/reportGenerator';

export default function InspectionList({ valveId, onEdit, onNewInspection, onEditReport, onNewReport }) {
    const { role } = useAuth();
    const isClient = role === 'client';
    const [inspections, setInspections] = useState([]);
    const [testReports, setTestReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        loadData();
    }, [valveId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [inspData, reportData] = await Promise.all([
                inspectionService.getByValveId(valveId),
                testReportService.getByValveId(valveId)
            ]);
            setInspections(inspData);
            setTestReports(reportData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!valveId) return;

        try {
            // 1. Fetch Valve Record
            const allRecords = await storageService.getAll();
            const valveRecord = allRecords.find(r => r.id === valveId);

            if (!valveRecord) {
                alert('Error: Could not find valve record.');
                return;
            }

            // 2. Generate PDF Blob
            const pdfBlob = await generateFullReport(valveRecord, inspections, testReports);

            // 3. Create File Object
            const fileName = `Report_${valveRecord.serialNumber || 'Valve'}_${new Date().toISOString().split('T')[0]}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            // 4. Save (Append to files)
            const currentFiles = valveRecord.files || valveRecord.file_urls || [];
            const updatedFiles = [...currentFiles, pdfFile];
            const recordToSave = { ...valveRecord, files: updatedFiles };

            await storageService.save(recordToSave);
            alert(`Report generated and attached: ${fileName}`);

        } catch (error) {
            console.error('Report generation failed:', error);
            alert(`Failed to generate report: ${error.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inspection? This action cannot be undone.')) {
            return;
        }

        try {
            await inspectionService.delete(id);
            await loadData();
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

    const getLinkedReport = (inspectionId) => {
        return testReports.find(r => r.inspectionId === inspectionId);
    };

    if (loading) {
        return (
            <div className="inspection-list">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inspection-list">
            <div className="list-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Access onNavigate from context or if passed down? InspectionList is child of App so passed down via renderContent but we defined props in function */}
                    {/* Wait, App.jsx uses renderContent which calls InspectionList. I need to make sure onNavigate is passed to it in App.jsx */}
                    {/* Checking App.jsx: 'inspection-list' case passes onEdit etc but NOT onNavigate. I need to update App.jsx too! */}
                    {/* However, the Back button should probably go back to Record Detail? Or Dashboard? */}
                    {/* Ideally 'Back' returns to wherever we came from. */}
                    {/* If I add onNavigate prop here, I must update App.jsx */}
                </div>
                <h3>Inspection History</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={handleGenerateReport}
                        className="btn-primary"
                        style={{
                            background: 'var(--accent)',
                            fontSize: '0.9rem',
                            padding: '0.5rem 1rem',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span>📄</span> Generate PDF Report
                    </button>
                    {!isClient && (
                        <button onClick={onNewReport} className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                            📄 New Test Report (Standalone)
                        </button>
                    )}
                    {!isClient && (
                        <button onClick={onNewInspection} className="new-inspection-button">
                            ➕ New Inspection
                        </button>
                    )}
                </div>
            </div>

            {inspections.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h4>No Inspections Yet</h4>
                    <p>Start by creating your first inspection record for this valve.</p>
                    <p>Start by creating your first inspection record for this valve.</p>
                    {!isClient && (
                        <button onClick={onNewInspection} className="empty-action-button">
                            Create First Inspection
                        </button>
                    )}
                </div>
            ) : (
                <div className="inspections-grid">
                    {inspections.map((inspection) => {
                        const linkedReport = getLinkedReport(inspection.id);
                        return (
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
                                        {linkedReport && (
                                            <span className="result-badge badge-pass" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                Tested
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
                                                        .filter(([, data]) => data && (data.condition || data.action))
                                                        .map(([key, data]) => (
                                                            <div key={key} className="component-row">
                                                                <span className="component-key">{COMPONENT_LABELS[key] || key}</span>
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

                                        <div className="card-actions" style={{ justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {linkedReport ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditReport(linkedReport.id); }}
                                                        className="btn-secondary"
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: '#3b82f6' }}
                                                    >
                                                        📄 View Test Report
                                                    </button>
                                                ) : (
                                                    !isClient && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onNewReport(inspection.id); }}
                                                            className="btn-secondary"
                                                        >
                                                            ➕ Create Test Record
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => onEdit(inspection.id)}
                                                    className="edit-button"
                                                >
                                                    {isClient ? '👁️ View' : '✏️ Edit'}
                                                </button>
                                                {!isClient && (
                                                    <button
                                                        onClick={() => handleDelete(inspection.id)}
                                                        className="delete-button"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
