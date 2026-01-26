import React from 'react';
import '../../styles/InspectionForm.css';

export const ValveDataHeader = ({ valveData }) => {
    if (!valveData) return null;

    return (
        <div className="valve-info-header">
            <div className="valve-info-item">
                <span className="valve-info-label">Customer Name</span>
                <span className="valve-info-value">{valveData.customer || '-'}</span>
            </div>
            <div className="valve-info-item">
                <span className="valve-info-label">Valve Type</span>
                <span className="valve-info-value">{valveData.valveType || '-'}</span>
            </div>
            <div className="valve-info-item">
                <span className="valve-info-label">Valve Size</span>
                <span className="valve-info-value">{valveData.sizeClass || '-'}</span>
            </div>
            <div className="valve-info-item">
                <span className="valve-info-label">Pressure Class</span>
                <span className="valve-info-value">{valveData.mawp || '-'}</span>
            </div>
            <div className="valve-info-item">
                <span className="valve-info-label">Serial Number</span>
                <span className="valve-info-value">{valveData.serialNumber || '-'}</span>
            </div>
            <div className="valve-info-item">
                <span className="valve-info-label">Tag Number</span>
                <span className="valve-info-value">{valveData.tagNo || '-'}</span>
            </div>
        </div>
    );
};
