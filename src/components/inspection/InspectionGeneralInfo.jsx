import React from 'react';

export const InspectionGeneralInfo = ({ inspection, onChange }) => {
    return (
        <section className="form-section">
            <h3>General Information</h3>
            <div className="form-grid">
                <div className="form-group">
                    <label>Inspection Date *</label>
                    <input
                        type="date"
                        value={inspection.inspectionDate}
                        onChange={(e) => onChange('inspectionDate', e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Inspector Name</label>
                    <input
                        type="text"
                        value={inspection.inspectorName || ''}
                        onChange={(e) => onChange('inspectorName', e.target.value)}
                        placeholder="Enter inspector name"
                    />
                </div>
                <div className="form-group full-width">
                    <label>Overall Result</label>
                    <select
                        value={inspection.overallResult || ''}
                        onChange={(e) => onChange('overallResult', e.target.value)}
                    >
                        <option value="">Select Result</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Conditional">Conditional</option>
                    </select>
                </div>
            </div>
        </section>
    );
};
