import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useMap } from 'react-leaflet';

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

function MapViewHeader({
    onLocationSelect,
    hasUnsavedChanges,
    onSave,
    isFollowing,
    setIsFollowing,
    mapType,
    setMapType,
    showHeatmap,
    setShowHeatmap,
    zoneFilter,
    setZoneFilter,
    availableZones
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Site Map</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                    {onLocationSelect ? "Click anywhere on the map to SET the location for this valve." : "Filter by zone or toggle heatmap to analyze performance."}
                </p>

                {!onLocationSelect && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter Zone:</label>
                        <select
                            value={zoneFilter}
                            onChange={(e) => setZoneFilter(e.target.value)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem'
                            }}
                        >
                            <option value="all">All Plant Areas</option>
                            {availableZones.map(zone => (
                                <option key={zone} value={zone}>{zone}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {hasUnsavedChanges && (
                    <button
                        className="btn-primary"
                        onClick={onSave}
                        style={{
                            padding: '8px 20px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        Confirm & Save Location
                    </button>
                )}

                <button
                    className="btn-secondary"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    style={{
                        padding: '8px 15px',
                        background: showHeatmap ? 'var(--accent)' : 'var(--bg-card)',
                        color: showHeatmap ? 'white' : 'var(--text-primary)',
                        border: showHeatmap ? 'none' : '1px solid var(--border-color)'
                    }}
                >
                    {showHeatmap ? '🔥 Hide Heatmap' : '📉 Show Failure Heatmap'}
                </button>

                <button
                    className="btn-secondary"
                    onClick={() => setIsFollowing(!isFollowing)}
                    style={{
                        padding: '8px 15px',
                        background: isFollowing ? 'var(--primary)' : 'var(--bg-card)',
                        color: isFollowing ? 'white' : 'var(--text-primary)',
                        border: isFollowing ? 'none' : '1px solid var(--border-color)'
                    }}
                >
                    {isFollowing ? '🛑 Stop Following' : '🛰️ Follow Me'}
                </button>

                <button
                    className="btn-secondary"
                    onClick={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
                    style={{ padding: '8px 15px' }}
                >
                    {mapType === 'standard' ? '🛰️ Satellite View' : '🗺️ Standard View'}
                </button>
            </div>
        </div>
    );
}

function HeatmapLayer({ points }) {
    const map = useMap();

    React.useEffect(() => {
        if (!points || points.length === 0) return;

        const heatmapLayer = L.heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 17,
            gradient: { 0.4: 'red', 0.6: 'orange', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(heatmapLayer);
        };
    }, [map, points]);

    return null;
}

function UserLocationTracker({ isFollowing, onLocationUpdate }) {
    const map = useMapEvents({});

    React.useEffect(() => {
        if (!navigator.geolocation) return;

        let watchId;
        const success = (pos) => {
            const { latitude, longitude } = pos.coords;
            const latlng = [latitude, longitude];
            onLocationUpdate(latlng);
            if (isFollowing) {
                map.flyTo(latlng, map.getZoom());
            }
        };

        const error = (err) => {
            console.error("GPS Tracking Error:", err);
        };

        watchId = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        });

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isFollowing, map, onLocationUpdate]);

    return null;
}

function SearchControl({ onLocationFound }) {
    const [query, setQuery] = React.useState('');
    const map = useMapEvents({});

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                map.flyTo([lat, lon], 16);
                onLocationFound?.({ lat: parseFloat(lat), lng: parseFloat(lon) });
            } else {
                alert("Location not found");
            }
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    return (
        <div style={{ position: 'absolute', top: '10px', left: '50px', zIndex: 1000, display: 'flex', gap: '5px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px' }}>
                <input
                    type="text"
                    placeholder="Search site/address..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '250px' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 15px' }}>🔍</button>
            </form>
        </div>
    );
}

export function MapView({ records, onRecordClick, onLocationSelect, hasUnsavedChanges, onSave }) {
    const [mapType, setMapType] = React.useState('standard');
    const [userLocation, setUserLocation] = React.useState(null);
    const [isFollowing, setIsFollowing] = React.useState(false);
    const [showHeatmap, setShowHeatmap] = React.useState(false);
    const [zoneFilter, setZoneFilter] = React.useState('all');

    const defaultCenter = [51.505, -0.09];

    // Extraction of unique zones
    const availableZones = [...new Set(records.map(r => r.plantArea || r.plant_area).filter(z => z))].sort();

    // Data Filtering
    const filteredRecords = records.filter(record => {
        const matchesZone = zoneFilter === 'all' || (record.plantArea || record.plant_area) === zoneFilter;
        return matchesZone && record.latitude && record.longitude;
    });

    // Heatmap Data (only failed valves)
    const heatmapPoints = records
        .filter(r => (r.passFail === 'N' || r.pass_fail === 'N') && r.latitude && r.longitude)
        .map(r => [r.latitude, r.longitude, 1]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', minHeight: '80vh', position: 'relative' }}>
            <MapViewHeader
                onLocationSelect={onLocationSelect}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={onSave}
                isFollowing={isFollowing}
                setIsFollowing={setIsFollowing}
                mapType={mapType}
                setMapType={setMapType}
                showHeatmap={showHeatmap}
                setShowHeatmap={setShowHeatmap}
                zoneFilter={zoneFilter}
                setZoneFilter={setZoneFilter}
                availableZones={availableZones}
            />

            <div style={{ position: 'relative', height: 'calc(100% - 100px)', minHeight: '500px' }}>
                <MapContainer
                    center={records.length === 1 && records[0].latitude ? [records[0].latitude, records[0].longitude] : (records.find(r => r.latitude)?.latitude ? [records.find(r => r.latitude).latitude, records.find(r => r.latitude).longitude] : defaultCenter)}
                    zoom={13}
                    style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)', zIndex: 1 }}
                >
                    <SearchControl />
                    <UserLocationTracker isFollowing={isFollowing} onLocationUpdate={setUserLocation} />

                    {mapType === 'standard' ? (
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                    ) : (
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                        />
                    )}

                    {onLocationSelect && <LocationPicker onLocationSelect={onLocationSelect} />}
                    {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

                    {userLocation && (
                        <Marker
                            position={userLocation}
                            icon={L.divIcon({
                                className: 'user-location-marker',
                                html: `
                                    <div style="position: relative;">
                                        <div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>
                                        <div style="position: absolute; top: -4px; left: -4px; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>
                                    </div>
                                    <style>
                                        @keyframes pulse {
                                            0% { transform: scale(1); opacity: 1; }
                                            100% { transform: scale(2); opacity: 0; }
                                        }
                                    </style>
                                `,
                                iconSize: [24, 24],
                                iconAnchor: [12, 12]
                            })}
                        >
                            <Popup>You are here</Popup>
                        </Marker>
                    )}

                    {filteredRecords.map(record => (
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
        </div>
    );
}
