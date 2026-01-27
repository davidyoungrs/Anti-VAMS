import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

export const OCRButton = ({ onScanComplete }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        // Simple mobile detection check
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            // Regex for generic mobile devices
            if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
                return true;
            }
            // Also check screen width for responsiveness as fallback
            if (window.innerWidth <= 768) {
                return true;
            }
            return false;
        };
        setIsMobile(checkMobile());
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const result = await Tesseract.recognize(
                file,
                'eng',
                {
                    // logger: m => console.log(m) // Uncomment for debug progress
                }
            );

            const text = result.data.text;
            // Basic cleanup: remove newlines, excess whitespace
            const cleanText = text.replace(/\n/g, ' ').trim();

            console.log('scanned: ', cleanText);
            onScanComplete(cleanText);
        } catch (err) {
            console.error('OCR Error:', err);
            alert('Failed to scan text. Please try again or type manually.');
        } finally {
            setIsScanning(false);
        }
    };

    if (!isMobile) return null;

    return (
        <div style={{ display: 'inline-block', marginLeft: '0.5rem' }}>
            <label
                style={{
                    cursor: isScanning ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    height: '38px', // Match standard input height usually
                    width: '38px',
                    opacity: isScanning ? 0.7 : 1
                }}
                title="Scan Nameplate"
            >
                <input
                    type="file"
                    accept="image/*"
                    capture="environment" // Forces rear camera on mobile
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={isScanning}
                />
                {isScanning ? (
                    // Simple spinner
                    <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--primary)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                ) : (
                    <span style={{ fontSize: '1.2rem' }}>📷</span> // Camera Icon
                )}
            </label>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};
