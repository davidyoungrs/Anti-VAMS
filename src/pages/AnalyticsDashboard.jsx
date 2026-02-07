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

export const AnalyticsDashboard = ({ records = [], onNavigate }) => {
    const [drillDown, setDrillDown] = useState(null); // { type: 'status'|'oem_pf', label: string, datasetLabel?: string }



    // --- Chart 1: Pass/Fail by OEM ---
    const passFailData = useMemo(() => {
        const stats = {};
        records.forEach(r => {
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
    }, [records]);

    // --- Chart 2: Common Failure Modes ---
    const failureModeData = useMemo(() => {
        const modes = {};
        records.forEach(r => {
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

    }, [records]);

    // --- Chart 3: WIP Status (Active Jobs) ---
    const statusData = useMemo(() => {
        const counts = {};
        // Initialize counts for all expected statuses (except Shipped)
        WORKFLOW_STATUS_OPTIONS.forEach(s => {
            if (s !== 'Shipped') counts[s] = 0;
        });

        // Add 'Other' bucket for unknown statuses if needed, or just let them be

        records.forEach(r => {
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
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',   // Red
                    'rgba(54, 162, 235, 0.7)',   // Blue
                    'rgba(255, 206, 86, 0.7)',   // Yellow
                    'rgba(75, 192, 192, 0.7)',   // Teal
                    'rgba(153, 102, 255, 0.7)',  // Purple
                    'rgba(255, 159, 64, 0.7)',   // Orange
                    'rgba(199, 199, 199, 0.7)',  // Grey
                    'rgba(83, 102, 255, 0.7)',   // Indigo
                    'rgba(40, 159, 64, 0.7)',    // Green
                    'rgba(210, 80, 200, 0.7)',   // Pink
                    'rgba(100, 200, 255, 0.7)',  // Light Blue
                    'rgba(200, 200, 50, 0.7)'    // Olive
                ],
                borderRadius: 4
            }]
        };
    }, [records]);


    const handleChartClick = (event, elements, chartType) => {
        if (!elements || elements.length === 0) return;

        const { index, datasetIndex } = elements[0];

        if (chartType === 'WIP') {
            const label = statusData.labels[index];
            setDrillDown({ type: 'status', label });
        } else if (chartType === 'OEM_PF') {
            const oem = passFailData.labels[index];
            const datasetLabel = passFailData.datasets[datasetIndex].label; // 'Pass' or 'Fail'
            setDrillDown({ type: 'oem_pf', label: oem, datasetLabel });
        }
    };

    const drillDownRecords = useMemo(() => {
        if (!drillDown) return [];

        return records.filter(r => {
            if (drillDown.type === 'status') {
                return r.status === drillDown.label;
            } else if (drillDown.type === 'oem_pf') {
                const pf = (r.passFail || r.pass_fail || '').toUpperCase();
                const matchesOEM = (r.oem || 'Unknown') === drillDown.label;
                if (drillDown.datasetLabel === 'Pass') {
                    return matchesOEM && (pf === 'PASS' || pf === 'Y');
                } else {
                    return matchesOEM && (pf === 'FAIL' || pf === 'N');
                }
            }
            return false;
        });
    }, [records, drillDown]);

    return (
        <div className="analytics-dashboard fade-in">
            <div className="glass-panel mb-4" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <h2 className="section-title">Analytics Dashboard</h2>

                {/* WIP Status Chart - Top Priority */}
                <div className="glass-panel mb-4" style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
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
                                onClick: (evt, el) => handleChartClick(evt, el, 'WIP'),
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            afterBody: () => '\nClick to view records'
                                        }
                                    }
                                },
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Drill-down Detail List - Moved below WIP chart */}
                {drillDown && (
                    <div className="glass-panel mt-4 mb-4 fade-in" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>
                                {drillDown.type === 'status' ? `Valves: ${drillDown.label}` : `Valves: ${drillDown.label} (${drillDown.datasetLabel})`}
                                <span style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>({drillDownRecords.length} found)</span>
                            </h3>
                            <button
                                onClick={() => setDrillDown(null)}
                                className="btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            >
                                Close Details
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tag No</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Serial No</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Customer</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drillDownRecords.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>{r.tagNo || '-'}</td>
                                            <td style={{ padding: '0.75rem' }}>{r.serialNumber}</td>
                                            <td style={{ padding: '0.75rem' }}>{r.customer}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => onNavigate('record-detail', r)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                                                >
                                                    View Record
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {drillDownRecords.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No records found for this selection.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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
                                    onClick: (evt, el) => handleChartClick(evt, el, 'OEM_PF'),
                                    plugins: {
                                        tooltip: {
                                            callbacks: {
                                                afterBody: () => '\nClick to view records'
                                            }
                                        }
                                    },
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
                                    No failure data available.
                                </div>
                            )}
                        </div>
                    </div>

                </div>


            </div>
        </div>
    );
};
