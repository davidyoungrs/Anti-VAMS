import QRCode from 'qrcode';

export const generateValveQR = async (valveRecord) => {
    if (!valveRecord || !valveRecord.id) return null;

    // URL that points to this specific record
    const deepLink = `${window.location.origin}/?valveId=${valveRecord.id}`;

    try {
        // Generate Data URL (image/png)
        const dataUrl = await QRCode.toDataURL(deepLink, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        return dataUrl;
    } catch (err) {
        console.error('Error generating QR code', err);
        return null;
    }
};
