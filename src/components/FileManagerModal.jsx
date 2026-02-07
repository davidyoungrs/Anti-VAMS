import React, { useState, useEffect } from 'react';
import { ATTACHMENT_CATEGORIES } from '../services/storage';

export const FileManagerModal = ({ files, onUpdateFiles, onCancel, isReadOnly }) => {
    useEffect(() => {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.scrollTop = 0;
    }, []);

    const [currentFolder, setCurrentFolder] = useState(null); // null means root (folder view)

    // Group files by category
    const groupedFiles = {};
    ATTACHMENT_CATEGORIES.forEach(cat => {
        groupedFiles[cat] = (files || []).filter(f => f.category === cat);
    });

    // Special category logic (merge uncategorized into 'Other')
    const uncategorized = (files || []).filter(f => !f.category || !ATTACHMENT_CATEGORIES.includes(f.category));
    if (uncategorized.length > 0) {
        groupedFiles['Other'] = [...(groupedFiles['Other'] || []), ...uncategorized];
    }

    const handleRemoveFile = (indexInOriginal) => {
        if (window.confirm('Are you sure you want to remove this attachment?')) {
            const newFiles = [...files];
            newFiles.splice(indexInOriginal, 1);
            onUpdateFiles(newFiles);
        }
    };

    const renderFolderView = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
            {ATTACHMENT_CATEGORIES.map(category => {
                const count = groupedFiles[category]?.length || 0;
                return (
                    <div
                        key={category}
                        onClick={() => setCurrentFolder(category)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            transition: 'transform 0.2s, background 0.2s',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'var(--bg-surface)';
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📂</div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>{category}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{count} {count === 1 ? 'file' : 'files'}</div>
                    </div>
                );
            })}
        </div>
    );

    const renderFileView = () => {
        const folderFiles = groupedFiles[currentFolder] || [];

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0 1rem' }}>
                    <button
                        onClick={() => setCurrentFolder(null)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem' }}
                    >
                        ← Folders
                    </button>
                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>{currentFolder}</h3>
                </div>

                {folderFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No files in this folder.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', padding: '1rem' }}>
                        {folderFiles.map((f, i) => {
                            const originalIndex = files.findIndex(original => original.url === f.url);
                            const name = f.originalName || 'Untitled File';
                            const date = f.uploadDate ? new Date(f.uploadDate).toLocaleDateString() : 'Unknown Date';
                            const isImage = f.url?.match(/\.(jpeg|jpg|png|webp|gif)/i) || f.url?.startsWith('data:image');

                            return (
                                <div key={i} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    {isImage ? (
                                        <div style={{ height: '120px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', background: '#000' }}>
                                            <img src={f.url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', fontSize: '2rem' }}>
                                            📄
                                        </div>
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>
                                            {name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{date}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none' }}>
                                            Open
                                        </a>
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => handleRemoveFile(originalIndex)}
                                                className="btn-secondary"
                                                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.4rem' }}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, padding: '1rem',
            paddingTop: '2rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '900px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                background: 'var(--bg-card)', padding: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        📁 Valve Documents
                    </h2>
                    <button onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Close</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {currentFolder ? renderFileView() : renderFolderView()}
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Total Files: {files?.length || 0}
                </div>
            </div>
        </div>
    );
};
