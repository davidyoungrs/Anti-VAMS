import React, { useState, useEffect } from 'react';
import { jobService } from '../services/jobService';

export const JobSelectionModal = ({ selectedCount, onCancel, onConfirm }) => {
    const [jobs, setJobs] = useState([]);
    const [mode, setMode] = useState('existing'); // 'existing' or 'new'
    const [selectedJobId, setSelectedJobId] = useState('');
    const [newJobName, setNewJobName] = useState('');
    const [newClientName, setNewClientName] = useState('');
    const [newLat, setNewLat] = useState('');
    const [newLng, setNewLng] = useState('');
    const [newRadius, setNewRadius] = useState('500');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        const allJobs = await jobService.getAllJobs();
        setJobs(allJobs);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let finalJobId = selectedJobId;

            if (mode === 'new') {
                if (!newJobName) {
                    alert('Please enter a job name');
                    setLoading(false);
                    return;
                }
                const newJob = await jobService.saveJob({
                    name: newJobName,
                    clientName: newClientName,
                    latitude: newLat ? parseFloat(newLat) : null,
                    longitude: newLng ? parseFloat(newLng) : null,
                    radius: newRadius ? parseInt(newRadius) : 500,
                    status: 'Active'
                });
                finalJobId = newJob.id;
            } else {
                if (!finalJobId) {
                    alert('Please select a job');
                    setLoading(false);
                    return;
                }
            }

            await onConfirm(finalJobId);
        } catch (error) {
            console.error(error);
            alert('Failed to assign job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                padding: '2rem', width: '500px', maxWidth: '90%',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)'
            }}>
                <h3 style={{ marginTop: 0 }}>Assign {selectedCount} Valves to Job</h3>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                    <button
                        onClick={() => setMode('existing')}
                        style={{
                            flex: 1, padding: '0.5rem', border: 'none', borderRadius: '4px',
                            background: mode === 'existing' ? 'var(--primary)' : 'transparent',
                            color: mode === 'existing' ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                    >
                        Select Existing
                    </button>
                    <button
                        onClick={() => setMode('new')}
                        style={{
                            flex: 1, padding: '0.5rem', border: 'none', borderRadius: '4px',
                            background: mode === 'new' ? 'var(--primary)' : 'transparent',
                            color: mode === 'new' ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                    >
                        Create New
                    </button>
                </div>

                {mode === 'existing' ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Job</label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                        >
                            <option value="">-- Choose a Job --</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>
                                    {job.name} {job.clientName ? `(${job.clientName})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Job Name</label>
                            <input
                                type="text"
                                value={newJobName}
                                onChange={(e) => setNewJobName(e.target.value)}
                                placeholder="e.g. Spring Shutdown 2026"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Client Name (Optional)</label>
                            <input
                                type="text"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="e.g. Shell"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', marginBottom: '1rem' }}
                            />
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>📍 Job Site Geofence</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition((pos) => {
                                                setNewLat(pos.coords.latitude.toFixed(6));
                                                setNewLng(pos.coords.longitude.toFixed(6));
                                            });
                                        }
                                    }}
                                    style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Use Current Location
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Latitude"
                                        value={newLat}
                                        onChange={(e) => setNewLat(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Longitude"
                                        value={newLng}
                                        onChange={(e) => setNewLng(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Radius (meters)</label>
                                <input
                                    type="number"
                                    value={newRadius}
                                    onChange={(e) => setNewRadius(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to remove these valves from their current jobs?')) {
                                onConfirm(null);
                            }
                        }}
                        style={{ padding: '0.75rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        Unlink from Job
                    </button>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            {loading ? 'Saving...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
