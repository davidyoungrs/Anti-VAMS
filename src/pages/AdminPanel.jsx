import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { supabase } from '../services/supabaseClient';
import { inspectionService } from '../services/inspectionService';
import { testReportService } from '../services/testReportService';
import { systemSettingsService } from '../services/systemSettingsService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';




export const AdminPanel = ({ onNavigate }) => {
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState('trash'); // 'trash' | 'history' | 'users' | 'security'
    const [deletedRecords, setDeletedRecords] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentRecords, setCurrentRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [emergencyMode, setEmergencyMode] = useState(false);
    const [timeData, setTimeData] = useState(null);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        if (['admin', 'super_user'].includes(role)) {
            loadData();
        }
    }, [activeTab, role]);

    if (!['admin', 'super_user'].includes(role)) {
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
                // Switch to Secure RPC to avoid RLS issues
                const { data, error } = await supabase.rpc('get_all_profiles');

                if (error) {
                    console.error("RPC Fetch Users Error:", error);
                    throw error;
                }
                setUsers(data || []);

                setUsers(data || []);
            } else if (activeTab === 'security') {
                // Initialize settings service if needed
                await systemSettingsService.init();
                setEmergencyMode(systemSettingsService.isEmergencyMode());

                // Fetch Time Sync Status
                const tData = await systemSettingsService.getServerTime();
                setTimeData(tData);
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
            const { error } = await supabase.rpc('update_user_profile', {
                target_user_id: userId,
                new_role: newRole
            });

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
            const { error } = await supabase.rpc('update_user_profile', {
                target_user_id: userId,
                new_allowed_customers: newAllowed
            });

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

    const handleBulkDownload = async () => {
        if (!window.confirm("This will download ALL data including attachments. It may take some time. Continue?")) return;
        setLoading(true);
        try {
            const zip = new JSZip();
            // Create main folder: bulk download+DATETIMESTAMP
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const rootFolderName = `bulk download+${timestamp}`;
            const rootFolder = zip.folder(rootFolderName);

            // Fetch ALL records
            const allRecords = await storageService.getAll();

            // Loop with async concurrency control could be better, but sequential is safer for rate limits
            for (const record of allRecords) {
                // Folder for each valve: SerialNo (or ID if missing)
                const safeSerial = (record.serialNumber || 'NoSerial').replace(/[^a-z0-9]/gi, '_');
                const startId = record.id.substring(0, 6);
                const recordFolderName = `${safeSerial}_${startId}`;
                const recordFolder = rootFolder.folder(recordFolderName);

                // 1. Valve Data JSON
                recordFolder.file("valve_data.json", JSON.stringify(record, null, 2));

                // 2. Attachments
                const urls = record.file_urls || [];
                if (urls.length > 0) {
                    const attachmentsFolder = recordFolder.folder("Attachments");
                    for (const url of urls) {
                        try {
                            const fileName = url.split('/').pop().split('?')[0]; // Clean filename
                            const response = await fetch(url);
                            if (response.ok) {
                                const blob = await response.blob();
                                attachmentsFolder.file(fileName, blob);
                            } else {
                                console.warn(`Failed to fetch attachment: ${url}`);
                            }
                        } catch (err) {
                            console.error(`Error downloading attachment ${url}`, err);
                        }
                    }
                }

                // 3. Inspections & Reports
                // Fetch related data
                // Note: This is N+1 fetching, but acceptable for admin download action.
                try {
                    const inspections = await inspectionService.getByValveId(record.id);
                    const reports = await testReportService.getByValveId(record.id);

                    if (inspections && inspections.length > 0) {
                        recordFolder.file("inspections.json", JSON.stringify(inspections, null, 2));

                        // Inspection Photos
                        const photoFolder = recordFolder.folder("Inspection_Photos");
                        for (const insp of inspections) {
                            if (insp.inspectionPhotos && insp.inspectionPhotos.length > 0) {
                                for (let i = 0; i < insp.inspectionPhotos.length; i++) {
                                    const pUrl = insp.inspectionPhotos[i];
                                    try {
                                        const pName = `Insp_${insp.id.substring(0, 4)}_${i + 1}.jpg`;
                                        const res = await fetch(pUrl);
                                        if (res.ok) {
                                            const blob = await res.blob();
                                            photoFolder.file(pName, blob);
                                        }
                                    } catch (perr) { }
                                }
                            }
                        }
                    }

                    if (reports && reports.length > 0) {
                        recordFolder.file("test_reports.json", JSON.stringify(reports, null, 2));
                    }
                } catch (relatedErr) {
                    console.error(`Error fetching related data for ${record.id}`, relatedErr);
                }
            }

            // Generate Zip
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${rootFolderName}.zip`);
            alert("Download complete!");

        } catch (error) {
            console.error("Bulk download failed:", error);
            alert("Bulk download failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };





    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <button onClick={() => onNavigate('back')} className="btn-secondary">← Back</button>
                <h2 className="section-title" style={{ margin: 0 }}>Admin Panel</h2>
            </div>

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

                {role === 'super_user' && (
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
                )}
                {role === 'super_user' && (
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{
                            padding: '1rem 2rem',
                            background: activeTab === 'security' ? 'var(--primary)' : 'var(--bg-card)',
                            color: activeTab === 'security' ? 'white' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🛡️ Security Controls
                    </button>
                )}
                {role === 'super_user' && (
                    <button
                        onClick={handleBulkDownload}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginLeft: 'auto' // Push to right
                        }}
                        title="Download all records, attachments, and data as a ZIP file"
                    >
                        📦 Bulk Export
                    </button>
                )}
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
                                                        <option value="super_user">Super User</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', color: '#fca5a5' }}>
                                🚨 Incident Response Controls
                            </h3>

                            <div className="glass-panel" style={{
                                padding: '1.5rem',
                                border: '1px solid #ef4444',
                                background: 'rgba(239, 68, 68, 0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#f87171', fontSize: '1.2rem' }}>⚠️ Emergency Mode (Read-Only)</h4>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '600px' }}>
                                        Enabling this mode will <strong>IMMEDIATELY FREEZE</strong> all database write operations for ALL users.
                                        Use this only to contain an active security breach or threat.
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <label className="switch" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={emergencyMode}
                                            onChange={async (e) => {
                                                const newValue = e.target.checked;
                                                const promptMsg = newValue
                                                    ? "🔴 ACTIVATE EMERGENCY MODE? This will block all writes immediately. Are you absolutely sure?"
                                                    : "🟢 Deactivate Emergency Mode? Normal operations will resume.";

                                                if (window.confirm(promptMsg)) {
                                                    try {
                                                        await systemSettingsService.setEmergencyMode(newValue);
                                                        setEmergencyMode(newValue);
                                                        alert(newValue ? "Emergency Mode ACTIVATED." : "Emergency Mode DEACTIVATED.");
                                                    } catch (err) {
                                                        alert("Failed to update status: " + err.message);
                                                    }
                                                }
                                            }}
                                            style={{ width: '2rem', height: '2rem' }} // basic styling fallback
                                        />
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: emergencyMode ? '#ef4444' : '#10b981',
                                            fontSize: '1.2rem'
                                        }}>
                                            {emergencyMode ? 'ACTIVATED' : 'INACTIVE'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Time Assurance Panel */}
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', marginTop: '2rem' }}>
                                ⏰ Forensic Time Assurance (NTP/Server Sync)
                            </h3>
                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Clock Status</h4>
                                    {timeData ? (
                                        (() => {
                                            if (timeData.error) return <div style={{ color: '#ef4444' }}>Error: {timeData.error.message || 'Check connection'}</div>;

                                            const clientNow = new Date();
                                            // serverTime is the time AT THE SERVER when request was processed.
                                            // We add latency to estimate what server time is NOW.
                                            // drift = (ClientNow) - (ServerTime + Latency)
                                            const estimatedServerNow = new Date(timeData.serverTime.getTime() + timeData.latency);
                                            const driftMs = Math.abs(clientNow.getTime() - estimatedServerNow.getTime());
                                            const isSync = driftMs < 2000; // 2 seconds tolerance

                                            return (
                                                <div>
                                                    <div style={{
                                                        display: 'inline-block',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '4px',
                                                        background: isSync ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                        color: isSync ? '#10b981' : '#ef4444',
                                                        fontWeight: 'bold',
                                                        marginBottom: '1rem'
                                                    }}>
                                                        {isSync ? '✅ SYNCHRONIZED' : '⚠️ DRIFT DETECTED'}
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                                        <div style={{ color: 'var(--text-muted)' }}>Server Time (UTC):</div>
                                                        <div style={{ fontFamily: 'monospace' }}>{timeData.serverTime.toISOString()}</div>

                                                        <div style={{ color: 'var(--text-muted)' }}>Client Time (ISO):</div>
                                                        <div style={{ fontFamily: 'monospace' }}>{clientNow.toISOString()}</div>

                                                        <div style={{ color: 'var(--text-muted)' }}>Network Latency:</div>
                                                        <div>{Math.round(timeData.latency)} ms</div>

                                                        <div style={{ color: 'var(--text-muted)' }}>Clock Drift:</div>
                                                        <div style={{ color: isSync ? 'inherit' : '#ef4444', fontWeight: 'bold' }}>
                                                            {driftMs} ms
                                                        </div>
                                                    </div>
                                                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        * Accurate timestamping is required for forensic auditing (ISO 27032).
                                                        If drift is high, check system clock settings.
                                                    </p>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div>Loading Time Data...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
};
