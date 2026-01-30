import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { supabase } from '../services/supabaseClient';

export const AdminPanel = () => {
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState('trash'); // 'trash' | 'history' | 'users'
    const [deletedRecords, setDeletedRecords] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentRecords, setCurrentRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (role === 'admin') {
            loadData();
        }
    }, [activeTab, role]);

    if (role !== 'admin') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
                <p>You need Administrator privileges to view this page.</p>
            </div>
        );
    }

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
            } else if (activeTab === 'users') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('email');
                if (error) throw error;
                setUsers(data);
            } else {
                // Fetch both history and current records for comparison
                const [historyData, allRecords] = await Promise.all([
                    storageService.getGlobalHistory(),
                    storageService.getAll() // Assuming standard getAll filters out deleted, which is fine for "Live" comparison
                ]);
                setHistory(historyData);
                setCurrentRecords(allRecords);
            }
        } catch (e) {
            console.error("Error loading admin data", e);
        } finally {
            setLoading(false);
        }
    };

    const getDiff = (oldRecord, newRecord) => {
        if (!oldRecord || !newRecord) return [];
        const changes = [];
        const ignoredKeys = ['updatedAt', 'lastViewedAt', 'deletedAt', 'createdAt', 'files', 'file_urls', 'valvePhoto']; // internal/heavy fields

        // Check for specific keys
        const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

        allKeys.forEach(key => {
            if (ignoredKeys.includes(key)) return;
            const val1 = oldRecord[key];
            const val2 = newRecord[key];

            // Loose comparison (strings/numbers)
            if (val1 != val2) {
                // Handle undefined/null as empty string for display
                const oldStr = val1 === null || val1 === undefined ? '' : String(val1);
                const newStr = val2 === null || val2 === undefined ? '' : String(val2);
                if (oldStr !== newStr) {
                    changes.push({ key, oldVal: oldStr, newVal: newStr });
                }
            }
        });
        return changes;
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

    const handleRoleUpdate = async (userId, newRole) => {
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            alert('User role updated successfully!');
            loadData();
        } catch (e) {
            alert('Failed to update role: ' + e.message);
        }
    };

    const handleAllowedCustomersUpdate = async (userId, newAllowed) => {
        // Debounce or just save on blur/enter? Ideally save on blur.
        // For simplicity in this admin panel, let's use prompt or just distinct save? 
        // Or inline input with onBlur.

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ allowed_customers: newAllowed })
                .eq('id', userId);

            if (error) throw error;
            // No alert needed for smooth editing, or maybe a toast?
            // Let's reload to be safe or just update state locally
            setUsers(users.map(u => u.id === userId ? { ...u, allowed_customers: newAllowed } : u));
        } catch (e) {
            alert('Failed to update allowed customers: ' + e.message);
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
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'users' ? 'var(--primary)' : 'var(--bg-card)',
                        color: activeTab === 'users' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    👥 User Management
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
                                    {history.map(item => {
                                        // Find current live record
                                        // Note: item.valveId matches record.id
                                        const currentRecord = currentRecords.find(r => r.id === item.valveId);
                                        const diff = currentRecord ? getDiff(item.snapshot, currentRecord) : null;

                                        // Filter out items with no visible changes
                                        if (currentRecord && (!diff || diff.length === 0)) {
                                            return null;
                                        }

                                        return (
                                            <div key={item.id} className="glass-panel" style={{
                                                padding: '1rem',
                                                background: 'var(--bg-surface)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{item.serialNumber}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                            Snapshot Taken: {new Date(item.changedAt).toLocaleString()}
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

                                                {/* Comparison View */}
                                                {diff && diff.length > 0 ? (
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--accent)' }}>Changes since this snapshot:</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '0.5rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px' }}>
                                                            <div>Field</div>
                                                            <div style={{ color: 'var(--text-muted)' }}>Snapshot (Old)</div>
                                                            <div style={{ color: 'var(--primary)' }}>Current (Live)</div>
                                                        </div>
                                                        {diff.map((d, idx) => (
                                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.key}</div>
                                                                <div style={{ color: 'var(--text-muted)', wordBreak: 'break-word', fontSize: '0.85rem' }}>{d.oldVal === null || d.oldVal === undefined ? '—' : String(d.oldVal)}</div>
                                                                <div style={{ color: 'var(--primary)', wordBreak: 'break-word', fontWeight: 'bold', fontSize: '0.85rem' }}>{d.newVal === null || d.newVal === undefined ? '—' : String(d.newVal)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    !currentRecord ? (
                                                        <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                                            ⚠️ Record no longer exists (Deleted)
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                            No visible content changes (only timestamp/internal updates).
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                Manage Users & Roles
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '1rem' }}>Email</th>
                                            <th style={{ padding: '1rem' }}>Current Role</th>
                                            <th style={{ padding: '1rem' }}>Allowed Customers <br /><span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>(CSV or 'all')</span></th>
                                            <th style={{ padding: '1rem' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>{user.email}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.85rem',
                                                        background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' :
                                                            user.role === 'inspector' ? 'rgba(59, 130, 246, 0.2)' :
                                                                'rgba(107, 114, 128, 0.2)',
                                                        color: user.role === 'admin' ? '#f87171' :
                                                            user.role === 'inspector' ? '#60a5fa' :
                                                                '#9ca3af'
                                                    }}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <input
                                                        type="text"
                                                        defaultValue={user.allowed_customers || ''}
                                                        placeholder={user.role === 'client' ? "e.g. Shell, BP" : "Full Access"}
                                                        onBlur={(e) => handleAllowedCustomersUpdate(user.id, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            borderRadius: '4px',
                                                            border: '1px solid var(--border-color)',
                                                            background: 'var(--bg-input)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                        style={{
                                                            padding: '0.5rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid var(--border-color)',
                                                            background: 'var(--bg-input)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    >
                                                        <option value="client">Client</option>
                                                        <option value="inspector">Inspector</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
