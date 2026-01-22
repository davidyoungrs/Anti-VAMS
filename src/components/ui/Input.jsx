import React from 'react';

export const Input = ({ label, type = 'text', required, ...props }) => {
    return (
        <div className="mb-4">
            {label && (
                <label>
                    {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
                </label>
            )}
            <input type={type} required={required} {...props} />
        </div>
    );
};
