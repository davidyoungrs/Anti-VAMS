import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';

export const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('trash'); // 'trash' | 'history'
    const [deletedRecords, setDeletedRecords] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'trash') {
                // For trash, we need to find local records marked as deleted
                // AND potentially fetch from Supabase if we want to be thorough, 
                // but storageService.getDeletedRecords() currently just checks local
                // Let's rely on the service.
                const records = await storageService.getDeletedRecords();
                setDeletedRecords(records);
            } else {
                const historyData = await storageService.getGlobalHistory();
                setHistory(historyData);
            }
        } catch (e) {
            console.error("Error loading admin data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm("Are you sure you want to restore this record?")) return;
        await storageService.restore(id);
        alert("Record restored!");
        loadData(); // Refresh list
    };

    const handleRevert = async (historyItem) => {
        if (!window.confirm(`Are you sure you want to revert valve ${historyItem.serialNumber} to this version? Current data will be overwritten.`)) return;

        try {
            // "Revert" means saving the snapshot as the current record
            // The snapshot is in historyItem.snapshot
            const recordToRestore = historyItem.snapshot;
            // update timestamps
            recordToRestore.updatedAt = new Date().toISOString();
            // remove deleted_at if it was deleted
            recordToRestore.deletedAt = null;

            await storageService.save(recordToRestore);
            alert("Record reverted successfully!");
            loadData();
        } catch (e) {
            alert("Failed to revert: " + e.message);
        }
    };

    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return 5;
        const deleteDate = new Date(deletedAt);
        const expiryDate = new Date(deleteDate);
        expiryDate.setDate(deleteDate.getDate() + 5);

        const now = new Date();
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="section-title">Admin Panel</h2>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('trash')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'trash' ? 'var(--primary)' : 'var(--bg-card)',
                        color: activeTab === 'trash' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    🗑️ Trash Bin
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'history' ? 'var(--primary)' : 'var(--bg-card)',
                        color: activeTab === 'history' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    📜 Change History
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    {activeTab === 'trash' && (
                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                Deleted Records (Held for 5 Days)
                            </h3>
                            {deletedRecords.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>Trash is empty.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {deletedRecords.map(record => (
                                        <div key={record.id} className="glass-panel" style={{
                                            padding: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{record.serialNumber}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    {record.customer} | {record.oem}
                                                </div>
                                                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                    Deleted: {new Date(record.deletedAt).toLocaleDateString()} ({getDaysRemaining(record.deletedAt)} days remaining)
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRestore(record.id)}
                                                className="btn-primary"
                                                style={{ background: '#22c55e' }}
                                            >
                                                ♻️ Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                Recent Changes (Global Log)
                            </h3>
                            {history.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No history found (requires online connection).</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {history.map(item => (
                                        <div key={item.id} className="glass-panel" style={{
                                            padding: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'var(--bg-surface)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{item.serialNumber}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    Changed: {new Date(item.changedAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRevert(item)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'transparent',
                                                    border: '1px solid var(--primary)',
                                                    color: 'var(--primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ⏪ Revert to this Version
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
