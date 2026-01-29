import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';

export const ImageAnnotator = ({ imageSrc, onSave, onCancel }) => {
    const canvasRef = useRef(null);
    const [strokeColor, setStrokeColor] = useState('red');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [loaded, setLoaded] = useState(false);

    // Ensure image is loadable before showing canvas to prevent sizing issues
    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => setLoaded(true);
    }, [imageSrc]);

    const handleSave = async () => {
        try {
            const dataUrl = await canvasRef.current.exportImage('png');
            onSave(dataUrl);
        } catch (e) {
            console.error('Annotation save failed', e);
            alert('Failed to save annotation.');
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden'
        }}>
            {/* Toolbar */}
            <div style={{
                padding: '1rem', borderBottom: '1px solid var(--border-color)',
                display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Color:</span>
                    {['red', 'yellow', '#22c55e', 'white', 'black'].map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setStrokeColor(color)}
                            style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: color, border: strokeColor === color ? '2px solid var(--text-primary)' : '1px solid #ccc',
                                cursor: 'pointer', padding: 0
                            }}
                        />
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => canvasRef.current.undo()} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>↩ Undo</button>
                    <button type="button" onClick={() => canvasRef.current.redo()} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>↪ Redo</button>
                    <button type="button" onClick={() => canvasRef.current.clearCanvas()} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Clear</button>
                </div>
            </div>

            {/* Canvas Area */}
            <div style={{ flex: 1, position: 'relative', background: '#e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!loaded ? (
                    <div style={{ color: 'var(--text-muted)' }}>Loading Image...</div>
                ) : (
                    <div style={{ width: '100%', height: '100%', maxHeight: '70vh' }}>
                        <ReactSketchCanvas
                            ref={canvasRef}
                            backgroundImage={imageSrc}
                            strokeWidth={strokeWidth}
                            strokeColor={strokeColor}
                            preserveBackgroundImage={true}
                            style={{ width: '100%', height: '100%' }} // Let flexible container control size
                            exportWithBackgroundImage={true}
                        />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleSave} className="btn-primary">Save Annotation</button>
            </div>
        </div>
    );
};
