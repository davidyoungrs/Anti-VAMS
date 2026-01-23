import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom colored icons for Status
const getMarkerIcon = (status) => {
    let color = '#f59e0b'; // Yellow (Pending)
    if (status === 'Y') color = '#10b981'; // Green (Pass)
    if (status === 'N') color = '#ef4444'; // Red (Fail)

    const svgTemplate = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>`;

    return L.divIcon({
        className: 'custom-div-icon',
        html: svgTemplate,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

function LocationPicker({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return null;
}

export function MapView({ records, onRecordClick, onLocationSelect }) {
    const defaultCenter = [51.505, -0.09]; // Default to some center if no records

    return (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', height: '70vh', position: 'relative' }}>
            <h2 className="section-title">Site Map</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {onLocationSelect ? "Click anywhere on the map to SET the location for this valve." : "Click a pin to view valve details."}
            </p>

            <MapContainer
                center={records.find(r => r.latitude)?.latitude ? [records.find(r => r.latitude).latitude, records.find(r => r.latitude).longitude] : defaultCenter}
                zoom={13}
                style={{ height: 'calc(100% - 80px)', width: '100%', borderRadius: 'var(--radius-md)' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {onLocationSelect && <LocationPicker onLocationSelect={onLocationSelect} />}

                {records.filter(r => r.latitude && r.longitude).map(record => (
                    <Marker
                        key={record.id}
                        position={[record.latitude, record.longitude]}
                        icon={getMarkerIcon(record.passFail || record.pass_fail)}
                    >
                        <Popup>
                            <div style={{ padding: '5px' }}>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>{record.serialNumber}</h4>
                                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem' }}>
                                    {record.customer}<br />
                                    {record.valveType} | {record.sizeClass}
                                </p>
                                <button
                                    className="btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => onRecordClick(record)}
                                >
                                    Open Record
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
