import React from 'react';

export const Select = ({ label, options = [], required, placeholder = "Select...", ...props }) => {
    return (
        <div className="mb-4">
            {label && (
                <label>
                    {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
                </label>
            )}
            <select required={required} {...props}>
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                        {opt.label || opt}
                    </option>
                ))}
            </select>
        </div>
    );
};
