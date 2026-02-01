import React, { useState, useMemo } from 'react';
import { WORKFLOW_STATUS_OPTIONS } from '../constants/statusOptions';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export const AnalyticsDashboard = ({ records = [] }) => {
    const [selectedOEMs, setSelectedOEMs] = useState([]); // Empty = All

    // Extract unique OEMs for filter dropdown
    const uniqueOEMs = useMemo(() => {
        const oems = new Set(records.map(r => r.oem).filter(Boolean));
        return Array.from(oems).sort();
    }, [records]);

    // Filter records based on selection
    const filteredRecords = useMemo(() => {
        if (selectedOEMs.length === 0) return records;
        return records.filter(r => selectedOEMs.includes(r.oem));
    }, [records, selectedOEMs]);

    // --- Chart 1: Pass/Fail by OEM ---
    const passFailData = useMemo(() => {
        const stats = {};
        filteredRecords.forEach(r => {
            const oem = r.oem || 'Unknown';
            if (!stats[oem]) stats[oem] = { pass: 0, fail: 0, pending: 0 };

            const pf = (r.passFail || r.pass_fail || '').toUpperCase();
            if (pf === 'PASS' || pf === 'Y') stats[oem].pass++;
            else if (pf === 'FAIL' || pf === 'N') stats[oem].fail++;
            else stats[oem].pending++;
        });

        const labels = Object.keys(stats);

        return {
            labels,
            datasets: [
                {
                    label: 'Pass',
                    data: labels.map(l => stats[l].pass),
                    backgroundColor: 'rgba(74, 222, 128, 0.7)', // Green
                },
                {
                    label: 'Fail',
                    data: labels.map(l => stats[l].fail),
                    backgroundColor: 'rgba(248, 113, 113, 0.7)', // Red
                }
            ]
        };
    }, [filteredRecords]);

    // --- Chart 2: Common Failure Modes ---
    const failureModeData = useMemo(() => {
        const modes = {};
        filteredRecords.forEach(r => {
            const pf = (r.passFail || r.pass_fail || '').toUpperCase();
            if (pf === 'FAIL' || pf === 'N') {
                const mode = (r.failMode || 'Unspecified').trim();
                if (mode) {
                    modes[mode] = (modes[mode] || 0) + 1;
                }
            }
        });

        const sortedModes = Object.entries(modes).sort((a, b) => b[1] - a[1]).slice(0, 8); // Top 8

        return {
            labels: sortedModes.map(m => m[0]),
            datasets: [{
                label: '# of Failures',
                data: sortedModes.map(m => m[1]),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                ],
                borderWidth: 1,
            }]
        };

    }, [filteredRecords]);

    // --- Chart 3: WIP Status (Active Jobs) ---
    const statusData = useMemo(() => {
        const counts = {};
        // Initialize counts for all expected statuses (except Shipped)
        WORKFLOW_STATUS_OPTIONS.forEach(s => {
            if (s !== 'Shipped') counts[s] = 0;
        });

        // Add 'Other' bucket for unknown statuses if needed, or just let them be

        filteredRecords.forEach(r => {
            if (r.status && r.status !== 'Shipped') {
                // Determine if status is in our list, exact match
                if (counts[r.status] !== undefined) {
                    counts[r.status]++;
                } else if (r.status) {
                    // Try to match somewhat vaguely or put in 'Other'? 
                    // For now, if it's not in the official list, ignore or map?
                    // Let's assume strict adherence for now
                }
            }
        });

        const labels = Object.keys(counts);
        return {
            labels,
            datasets: [{
                label: 'Valve Count',
                data: labels.map(l => counts[l]),
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderRadius: 4
            }]
        };
    }, [filteredRecords]);

    // Handlers
    const handleSelectionChange = (e) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        if (selected.includes('ALL')) {
            setSelectedOEMs([]); // Reset to select all
        } else {
            setSelectedOEMs(selected);
        }
    };

    return (
        <div className="analytics-dashboard fade-in">
            <div className="glass-panel mb-4" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <h2 className="section-title">Analytics Dashboard</h2>

                {/* Filters */}
                <div className="mb-4">
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Filter by OEM <small>(Hold Cmd/Ctrl to select multiple)</small>:
                    </label>
                    <select
                        multiple
                        value={selectedOEMs.length === 0 ? ['ALL'] : selectedOEMs}
                        onChange={handleSelectionChange}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'inherit',
                            minHeight: '120px'
                        }}
                    >
                        <option value="ALL">-- All OEMs --</option>
                        {uniqueOEMs.map(oem => (
                            <option key={oem} value={oem}>{oem}</option>
                        ))}
                    </select>
                </div>

                {/* Charts Grid */}
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>

                    {/* Pass/Fail Chart */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Pass/Fail Rates by OEM</h3>
                        <div style={{ height: '300px' }}>
                            <Bar
                                data={passFailData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        x: { stacked: true },
                                        y: { stacked: true }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Failure Modes Chart */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Top Failure Modes</h3>
                        <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                            {failureModeData.labels.length > 0 ? (
                                <Pie
                                    data={failureModeData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'right' }
                                        }
                                    }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                    No failure data available for selection.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* WIP Status Chart */}
                <div className="glass-panel mt-4" style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', position: 'relative' }}>
                        <h3 style={{ margin: 0 }}>Work In Progress (WIP) Status</h3>
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#60a5fa',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}>
                            Total: {statusData.datasets[0].data.reduce((a, b) => a + b, 0)}
                        </div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Bar
                            data={statusData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
