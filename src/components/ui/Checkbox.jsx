import React from 'react';

export const Checkbox = ({ label, required, ...props }) => {
    return (
        <div className="mb-4 flex-row" style={{ alignItems: 'center' }}>
            <input
                type="checkbox"
                style={{ margin: 0, height: '1.2rem', width: '1.2rem' }}
                required={required}
                {...props}
            />
            {label && (
                <label style={{ margin: 0, cursor: 'pointer' }}>
                    {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
                </label>
            )}
        </div>
    );
};
