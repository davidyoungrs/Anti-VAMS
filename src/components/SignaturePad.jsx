import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export const SignaturePad = ({ onSave, onCancel }) => {
    const [mode, setMode] = useState('draw'); // 'draw' | 'type'
    const [typedName, setTypedName] = useState('');
    const sigCanvas = useRef(null);

    const clear = () => {
        if (mode === 'draw' && sigCanvas.current) {
            sigCanvas.current.clear();
        } else {
            setTypedName('');
        }
    };

    const handleSave = () => {
        let dataUrl = '';
        try {
            if (mode === 'draw') {
                if (sigCanvas.current) {
                    // Safety check: is getTrimmedCanvas available?
                    if (typeof sigCanvas.current.getTrimmedCanvas === 'function') {
                        try {
                            // If empty, getTrimmedCanvas might fail or return 0x0
                            if (sigCanvas.current.isEmpty()) {
                                dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
                            } else {
                                dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
                            }
                        } catch (trimError) {
                            console.warn("Trim failed, using raw canvas", trimError);
                            dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
                        }
                    } else {
                        // Fallback
                        dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
                    }
                }
            } else {
                if (!typedName.trim()) {
                    alert('Please type your name before adopting.');
                    return;
                }
                // Convert text to image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 500;
                canvas.height = 150;

                // Background
                ctx.fillStyle = 'white'; // or transparent? Better transparent for PDF overlap but white for readability.
                // Actually, keep it transparent for signature feel.

                // Text Style
                ctx.font = 'italic 50px "Dancing Script", cursive, "Apple Chancery", sans-serif';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
                dataUrl = canvas.toDataURL('image/png');
            }
        } catch (e) {
            console.error("Signature capture failed", e);
            alert(`Error capturing signature: ${e.message}`);
            return;
        }

        onSave(dataUrl);
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Digital Signature</h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                    type="button"
                    onClick={() => setMode('draw')}
                    className={mode === 'draw' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1 }}
                >
                    ✍️ Draw
                </button>
                <button
                    type="button"
                    onClick={() => setMode('type')}
                    className={mode === 'type' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1 }}
                >
                    ⌨️ Type
                </button>
            </div>

            <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', marginBottom: '1rem', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mode === 'draw' ? (
                    <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{
                            width: 500,
                            height: 200,
                            className: 'sigCanvas',
                            style: { maxWidth: '100%', width: '100%', background: 'transparent' }
                        }}
                        penColor="black" // Use black for document contrast, or "white" if saving to dark mode? PDF usually white paper.
                        // Wait, if users sign in dark mode, they see white/light ink. If we put that on white PDF paper, it's invisible.
                        // We should FORCE a white background for the signature pad so ink is always black.
                        backgroundColor="white"
                    />
                ) : (
                    <div style={{ width: '100%', padding: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Type your full name"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            style={{
                                width: '100%',
                                fontSize: '2rem',
                                fontFamily: '"Dancing Script", cursive, "Apple Chancery", sans-serif',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                border: 'none',
                                borderBottom: '2px solid var(--primary)',
                                background: 'transparent',
                                color: 'var(--text-main)', // visible in dark mode
                                outline: 'none'
                            }}
                        />
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                            Your typed name will be converted to a stylized signature.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={clear} className="btn-secondary" style={{ marginRight: 'auto' }}>Clear</button>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleSave} className="btn-primary">Adopt & Sign</button>
            </div>
        </div>
    );
};
