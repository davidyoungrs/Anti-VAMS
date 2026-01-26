import React, { useState } from 'react';
import '../../styles/InspectionForm.css';

export const ValveTypeSelector = ({ onSelect, onCancel }) => {
    const valveTypes = [
        'Gate Valve',
        'Ball Valve',
        'Globe Control Valve',
        'Butterfly Valve',
        'Check Valve',
        'Plug Valve',
        'Pressure Relief Valve'
    ];

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
            <h2 className="section-title">Select Valve Type</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Please select the type of valve to begin the inspection.
            </p>

            <div className="grid-2">
                {valveTypes.map(type => (
                    <button
                        key={type}
                        className="btn-secondary clickable-card"
                        onClick={() => onSelect(type)}
                        style={{
                            padding: '1.5rem',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>🔧</span>
                        {type}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button onClick={onCancel} className="btn-secondary">
                    Cancel
                </button>
            </div>
        </div>
    );
};
