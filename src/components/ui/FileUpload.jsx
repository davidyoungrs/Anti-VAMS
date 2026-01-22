import React, { useState } from 'react';

export const FileUpload = ({ onFilesSelected, label }) => {
    const [isDragging, setIsDragging] = useState(false);

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

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div className="mb-4">
            {label && <label>{label}</label>}
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
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                        Drag & Drop files here, or click to select
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Supports Images and PDF
                    </p>
                </div>
            </div>
        </div>
    );
};
