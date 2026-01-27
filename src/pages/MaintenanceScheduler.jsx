import React from 'react';

export const MaintenanceScheduler = () => {
    return (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
            <h2 className="section-title">Maintenance Scheduler</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem' }}>
                This feature is currently under development.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>
                Coming soon: Scheduling automated maintenance tasks, assigning inspectors, and calendar views.
            </p>
        </div>
    );
};
