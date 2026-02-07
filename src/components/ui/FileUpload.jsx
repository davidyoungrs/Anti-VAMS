import React, { useState } from 'react';
import { ATTACHMENT_CATEGORIES } from '../../services/storage';

export const FileUpload = ({ onFilesSelected, label }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]); // [{ file, category }]
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [bulkCategory, setBulkCategory] = useState(ATTACHMENT_CATEGORIES[ATTACHMENT_CATEGORIES.length - 1]); // Default to 'Other'

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const startFileProcessing = (files) => {
        const initialPending = files.map(f => ({
            file: f,
            category: f.name?.toLowerCase().includes('report') ? 'Inspection & Test report' : bulkCategory
        }));
        setPendingFiles(initialPending);
        setShowCategorySelector(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            startFileProcessing(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            startFileProcessing(Array.from(e.target.files));
        }
    };

    const handleConfirmUpload = () => {
        onFilesSelected(pendingFiles);
        setPendingFiles([]);
        setShowCategorySelector(false);
    };

    const updateFileCategory = (index, category) => {
        const updated = [...pendingFiles];
        updated[index].category = category;
        setPendingFiles(updated);
    };

    const updateAllCategories = (category) => {
        setBulkCategory(category);
        setPendingFiles(prev => prev.map(p => ({ ...p, category })));
    };

    return (
        <div className="mb-4">
            {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>}

            {!showCategorySelector ? (
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: isDragging ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg-input)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('file-upload-input').click()}
                >
                    <input
                        id="file-upload-input"
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileInput}
                    />
                    <div style={{ pointerEvents: 'none' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📤</div>
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                            Drag & Drop files here, or click to select
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Categorize files during upload
                        </p>
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--primary)', background: 'rgba(14, 165, 233, 0.05)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Set File Categories</h4>

                    {pendingFiles.length > 1 && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Set category for ALL files:</label>
                            <select
                                value={bulkCategory}
                                onChange={(e) => updateAllCategories(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            >
                                {ATTACHMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}

                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                        {pendingFiles.map((pf, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {pf.file.name}
                                </div>
                                <select
                                    value={pf.category}
                                    onChange={(e) => updateFileCategory(i, e.target.value)}
                                    style={{ padding: '0.3rem', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                >
                                    {ATTACHMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => { setPendingFiles([]); setShowCategorySelector(false); }}
                            className="btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmUpload}
                            className="btn-primary"
                            style={{ flex: 2 }}
                        >
                            Confirm & Upload {pendingFiles.length} {pendingFiles.length === 1 ? 'File' : 'Files'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
