import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../services/jobService';
import { SearchableJobSelect } from '../components/SearchableJobSelect';

export const Jobs = ({ onNavigate }) => {
    const { role, allowedCustomers } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Search & Valve View State
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobValves, setJobValves] = useState([]);

    useEffect(() => {
        loadJobs();
    }, [role, allowedCustomers]); // Reload if auth details change

    const loadJobs = async () => {
        setLoading(true);
        try {
            let [allJobs, activeJobIds] = await Promise.all([
                jobService.getAllJobs(),
                jobService.getActiveJobIds()
            ]);

            // Filter out jobs with NO valves (Empty Jobs)
            // Ensure we handle case where user might want to see empty jobs they just created? 
            // - The requirement states "if there are no valves linked ... the job should not be on the inline valve list"
            // - And "dropdowns ... should only show jobs with assigned valve"
            // So we strictly filter.
            allJobs = allJobs.filter(job => activeJobIds.includes(job.id));

            // Client Filtering Logic
            if (role === 'client') {
                if (!allowedCustomers) {
                    // Safety: If no customers assigned, show nothing
                    allJobs = [];
                } else {
                    const normalizedAllowed = allowedCustomers.toLowerCase();
                    if (normalizedAllowed !== 'all') {
                        const allowedList = normalizedAllowed.split(',').map(c => c.trim());
                        allJobs = allJobs.filter(job =>
                            job.clientName && allowedList.includes(job.clientName.toLowerCase())
                        );
                    }
                }
            }

            setJobs(allJobs);
        } catch (e) {
            console.error("Error loading jobs", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (jobId, jobName) => {
        if (!window.confirm(`Are you sure you want to delete job "${jobName}"?`)) return;

        try {
            await jobService.deleteJob(jobId);
            // Refresh list
            await loadJobs();
            // Deselect if currently selected
            if (selectedJob?.id === jobId) {
                setSelectedJob(null);
                setJobValves([]);
            }
        } catch (error) {
            console.error('Failed to delete job:', error);
            alert('Failed to delete job');
        }
    };

    const handleViewValves = async (job) => {
        setSelectedJob(job);
        setLoading(true);
        try {
            // Updated to use the service method that handles both local and cloud
            const valves = await jobService.getValvesByJobId(job.id);
            setJobValves(valves);
        } catch (error) {
            console.error('Failed to fetch valves:', error);
            setJobValves([]); // Clear valves on error
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => onNavigate('back')} className="btn-secondary">← Back</button>
                    <h2 className="section-title" style={{ margin: 0 }}>Job Management</h2>
                </div>
                {/* Potentially Add "Create Job" button here if not handled elsewhere or via dropdown */}
            </div>

            {/* Search Dropdown */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <SearchableJobSelect
                        jobs={jobs}
                        selectedJobId={selectedJob?.id}
                        onChange={(jobId) => {
                            if (!jobId) {
                                setSelectedJob(null);
                                setJobValves([]);
                            } else {
                                const job = jobs.find(j => j.id === jobId);
                                handleViewValves(job);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Job Details & Valves */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {selectedJob ? (
                    <div key={selectedJob.id}>
                        <div className="glass-panel" style={{
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--primary)',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>{selectedJob.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Client: {selectedJob.clientName || 'N/A'} | Status: {selectedJob.status}
                                    {selectedJob.updatedAt && ` | Updated: ${new Date(selectedJob.updatedAt).toLocaleDateString()}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {role !== 'client' && (
                                    <button
                                        onClick={() => handleDeleteJob(selectedJob.id, selectedJob.name)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid #ef4444',
                                            color: '#ef4444',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Inline Valve List */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>Assigned Valves</span>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{jobValves.length} found</span>
                            </h3>

                            {loading ? (
                                <p style={{ color: 'var(--text-muted)' }}>Loading valves...</p>
                            ) : jobValves.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No valves assigned to this job.</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                                <th style={{ padding: '0.75rem' }}>Serial No</th>
                                                <th style={{ padding: '0.75rem' }}>Description</th>
                                                <th style={{ padding: '0.75rem' }}>Location</th>
                                                <th style={{ padding: '0.75rem' }}>Required Date</th>
                                                <th style={{ padding: '0.75rem' }}>Status</th>
                                                <th style={{ padding: '0.75rem' }}>Last Update</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...jobValves]
                                                .sort((a, b) => {
                                                    const dateA = a.requiredDate ? new Date(a.requiredDate).getTime() : Infinity;
                                                    const dateB = b.requiredDate ? new Date(b.requiredDate).getTime() : Infinity;
                                                    return dateA - dateB;
                                                })
                                                .map(valve => (
                                                    <tr key={valve.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '0.75rem' }}>
                                                            <span
                                                                onClick={() => { if (onNavigate) onNavigate('record-detail', valve); }}
                                                                style={{
                                                                    color: 'var(--primary)',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline'
                                                                }}
                                                                title="Click to view full record"
                                                            >
                                                                {valve.serialNumber || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem' }}>{valve.description || '-'}</td>
                                                        <td style={{ padding: '0.75rem' }}>{valve.location || '-'}</td>
                                                        <td style={{
                                                            padding: '0.75rem',
                                                            fontWeight: 'bold',
                                                            color: (valve.requiredDate && new Date(valve.requiredDate) < new Date()) ? '#ef4444' : 'var(--accent)'
                                                        }}>
                                                            {valve.requiredDate ? new Date(valve.requiredDate).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem' }}>
                                                            <span style={(() => {
                                                                const status = valve.status;
                                                                const isShipped = status === 'Shipped';
                                                                const isWaiting = status?.includes('Hold') || status?.includes('Waiting');
                                                                return {
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '20px',
                                                                    background: isShipped ? 'rgba(16, 185, 129, 0.2)' : isWaiting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                                    color: isShipped ? '#4ade80' : isWaiting ? '#f87171' : '#60a5fa',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '700',
                                                                    border: `1px solid ${isShipped ? 'rgba(16, 185, 129, 0.3)' : isWaiting ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                                                                };
                                                            })()}>
                                                                {valve.status || 'No Status'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {valve.updatedAt ? new Date(valve.updatedAt).toLocaleDateString() : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👆</div>
                        <p>Select a job from the dropdown above to manage it.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
