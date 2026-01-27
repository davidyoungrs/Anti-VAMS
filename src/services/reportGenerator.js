import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VALVE_COMPONENT_CONFIGS, COMPONENT_LABELS } from './inspectionService';
import { generateValveQR } from '../utils/qrCode';

const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generateFullReport = async (valveRecord, inspectionData = [], testData = []) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 50;

    // Define Header/Footer Generators
    const drawHeader = (doc) => {
        // Branding Top Right
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text("Global Valve Record", pageWidth - 14, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text([
            "TheValve.pro",
            "PO Box 212359",
            "Dubai",
            "United Arab Emirates"
        ], pageWidth - 14, 26, { align: 'right' });

        // Logo (Left of "Global Valve Record")
        if (logoImg) {
            try {
                const logoHeight = 12;
                const aspect = logoImg.width / logoImg.height;
                const logoWidth = logoHeight * aspect;
                const textWidth = doc.getTextWidth("Global Valve Record");
                const logoX = pageWidth - 14 - textWidth - logoWidth - 5;
                doc.addImage(logoImg, 'PNG', logoX, 12, logoWidth, logoHeight);
            } catch (e) {
                // Ignore drawing error
            }
        }
    };

    const drawFooter = (doc, pageNumber, totalPages) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        const dateStr = new Date().toLocaleString();
        doc.text(`Generated on: ${dateStr} | Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Load Logo with retry/check
    let logoImg = null;
    try {
        logoImg = await loadImage('/logo.png');
    } catch (e) {
        console.warn("Could not load logo.png", e);
    }



    // Header Helper
    const addSectionHeader = (title) => {
        if (currentY + 15 > pageHeight - 20) { // Check against page height minus footer margin
            doc.addPage();
            currentY = 50;
        }
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185); // Blue
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, currentY);
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 10;
        doc.setTextColor(0, 0, 0); // Reset to black
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
    };

    // --- 1. Title & Metadata ---
    // Title is now below the header

    // Main Title (Centered)
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text("Valve Inspection & Test Report", pageWidth / 2, currentY + 5, { align: 'center' }); // Reduced spacing
    currentY += 20;

    // --- 2. Valve Data ---
    addSectionHeader("Valve Data");

    const valveRows = [
        ['Serial Number', valveRecord.serialNumber || 'N/A', 'Customer', valveRecord.customer || 'N/A'],
        ['Job No', valveRecord.jobNo || 'N/A', 'Tag No', valveRecord.tagNo || 'N/A'],
        ['Order No', valveRecord.orderNo || 'N/A', 'OEM', valveRecord.oem || 'N/A'],
        ['Valve Type', valveRecord.valveType || 'N/A', 'Size / Class', valveRecord.sizeClass || 'N/A'],
        ['Plant Area', valveRecord.plantArea || 'N/A', 'Location', valveRecord.siteLocation || 'N/A'],
        ['Model No', valveRecord.modelNo || 'N/A', 'Actuator', valveRecord.actuator || 'N/A']
    ];

    autoTable(doc, {
        startY: currentY,
        head: [],
        body: valveRows,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 55 },
            2: { fontStyle: 'bold', cellWidth: 35 },
            3: { cellWidth: 55 }
        },
        margin: { top: 40, left: 14, right: 14 }
    });
    currentY = doc.lastAutoTable.finalY + 5;

    // --- 2.1 Construction Details ---
    const constructionRows = [
        ['Body Material', valveRecord.bodyMaterial || '', 'Seat Material', valveRecord.seatMaterial || ''],
        ['Trim Material', valveRecord.trimMaterial || '', 'Obturator', valveRecord.obturatorMaterial || ''],
        ['Packing Type', valveRecord.packingType || '', 'Flange Type', valveRecord.flangeType || ''],
        ['Gear Operator', valveRecord.gearOperator || '', 'MAWP', valveRecord.mawp || '']
    ];

    autoTable(doc, {
        startY: currentY,
        head: [[' Construction Details', '', '', '']],
        body: constructionRows,
        theme: 'striped',
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 55 },
            2: { fontStyle: 'bold', cellWidth: 35 },
            3: { cellWidth: 55 }
        },
        margin: { top: 40, left: 14, right: 14 }
    });
    currentY = doc.lastAutoTable.finalY + 5;

    // --- 2.2 Service & Testing Specs ---
    const serviceRows = [
        ['Date In', valveRecord.dateIn || '', 'Required Date', valveRecord.requiredDate || ''],
        ['Fail Mode', valveRecord.failMode || '', 'Safety Check', valveRecord.safetyCheck || ''],
        ['Body Test Spec', valveRecord.bodyTestSpec || '', 'Body Pressure', `${valveRecord.bodyPressure || ''} ${valveRecord.bodyPressureUnit || ''}`],
        ['Seat Test Spec', valveRecord.seatTestSpec || '', 'Tested By', valveRecord.testedBy || ''],
        ['LSA Check', valveRecord.lsaCheck ? 'Yes' : 'No', 'Decon Cert', valveRecord.decontaminationCert || '']
    ];

    autoTable(doc, {
        startY: currentY,
        head: [[' Service & Testing Specs', '', '', '']],
        body: serviceRows,
        theme: 'striped',
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 55 },
            2: { fontStyle: 'bold', cellWidth: 35 },
            3: { cellWidth: 55 }
        },
        margin: { top: 40, left: 14, right: 14 }
    });
    currentY = doc.lastAutoTable.finalY + 10;

    // --- 3. Inspection Checklist ---
    addSectionHeader("Inspection Checklist");

    // Use latest inspection if multiple exist, otherwise empty object
    const latestInspection = inspectionData.length > 0 ? inspectionData[0] : {};
    const componentsData = latestInspection.components || {};

    // Display Header Info even if no inspection exists
    doc.text(`Inspection Date: ${latestInspection.inspectionDate ? new Date(latestInspection.inspectionDate).toLocaleDateString() : 'Not Inspected'}`, 14, currentY);
    doc.text(`Inspector: ${latestInspection.inspectorName || '-'}`, 120, currentY);
    currentY += 8;

    // Determine Valve Type and get Config
    // We need to import these constants at the top of the file, but since this is a pure function replacement,
    // we will access them via the passed arguments or global scope if possible.
    // However, clean way is to rely on the imports being added to the file header.
    // For now, let's assume imports are added. 

    const valveType = valveRecord.valveType || 'Gate Valve'; // Default if missing
    // Fallback to 'Gate Valve' config if specific type not found, or 'Other'
    const valveConfig = VALVE_COMPONENT_CONFIGS[valveType] || VALVE_COMPONENT_CONFIGS['Gate Valve'];

    const checklistRows = [];

    // Iterate through Categories in the Config
    Object.entries(valveConfig).forEach(([categoryName, partsList]) => {
        // Add Category Header Row
        checklistRows.push([{ content: categoryName.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);

        // Iterate through Parts in that Category
        partsList.forEach(partKey => {
            const label = COMPONENT_LABELS[partKey] || partKey.replace(/([A-Z])/g, ' $1').trim(); // Fallback label
            const partData = componentsData[partKey] || {};

            checklistRows.push([
                label,
                partData.condition || '-',
                partData.action || '-',
                partData.notes || '-'
            ]);
        });
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Component', 'Condition', 'Action', 'Notes']],
        body: checklistRows,
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 9 },
        margin: { top: 40, left: 14, right: 14 },
        pageBreak: 'auto'
    });
    currentY = doc.lastAutoTable.finalY + 10;

    // Overall Result
    addSectionHeader("Overall Result");
    doc.setFont('helvetica', 'bold');
    doc.text(`Result: ${latestInspection.overallResult || 'Pending'}`, 14, currentY);
    if (latestInspection.repairNotes) {
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Notes: ${latestInspection.repairNotes}`, 14, currentY);
    }
    currentY += 15;


    // --- 4. Test Results ---
    addSectionHeader("Test Results");

    const latestTest = testData.length > 0 ? testData[0] : null;
    if (latestTest && latestTest.pressureTest) {
        const pt = latestTest.pressureTest;

        // Prepare table data for Pressure Tests
        const testTableData = [];

        // Hydrotest
        testTableData.push([
            'Hydrotest',
            pt.hydrotest?.actual || '-',
            pt.hydrotest?.allowable || '-',
            pt.hydrotest?.unit || '-',
            pt.hydrotest?.duration || '-',
            '-',
            '-',
            '-'
        ]);

        // Low Pressure Gas
        testTableData.push([
            'Low Pressure Gas',
            pt.lowPressureGas?.actual || '-',
            pt.lowPressureGas?.allowable || '-',
            pt.lowPressureGas?.unit || '-',
            pt.lowPressureGas?.duration || '-',
            pt.lowPressureGas?.actualLeakage || '-',
            pt.lowPressureGas?.allowableLeakage || '-',
            pt.lowPressureGas?.leakageUnit || '-'
        ]);

        // High Pressure Liquid
        testTableData.push([
            'High Pressure Liquid',
            pt.highPressureLiquid?.actual || '-',
            pt.highPressureLiquid?.allowable || '-',
            pt.highPressureLiquid?.unit || '-',
            pt.highPressureLiquid?.duration || '-',
            pt.highPressureLiquid?.actualLeakage || '-',
            pt.highPressureLiquid?.allowableLeakage || '-',
            pt.highPressureLiquid?.leakageUnit || '-'
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Test Type', 'Pressure (Act)', 'Pressure (All)', 'Unit', 'Time', 'Leak (Act)', 'Leak (All)', 'Leak Unit']],
            body: testTableData,
            headStyles: { fillColor: [52, 73, 94] },
            styles: { fontSize: 8, cellPadding: 1 },
            margin: { top: 40, left: 14, right: 14 }
        });
        currentY = doc.lastAutoTable.finalY + 10;

        // Stroke Test if applicable
        if (latestTest.strokeTest && latestTest.strokeTest.details && latestTest.strokeTest.details.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text("Stroke Test / Control Valve", 14, currentY);
            currentY += 6;

            const strokeRows = latestTest.strokeTest.details.map(row => [
                row.signal || '-',
                row.expectedTravel || '-',
                row.actual || '-'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Stroke Signal', 'Expect Stroke %', 'Actual stroke %']],
                body: strokeRows,
                headStyles: { fillColor: [52, 73, 94] },
                margin: { top: 40, left: 14, right: 14 }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

    } else {
        doc.setFont(undefined, 'italic');
        doc.text("No test results available.", 14, currentY);
        currentY += 10;
    }

    // --- 5. Inspection Photos ---
    if (latestInspection.inspectionPhotos && latestInspection.inspectionPhotos.length > 0) {
        addSectionHeader("Inspection Photos");

        const photoWidth = 80;
        const photoHeight = 60;
        let x = 14;

        latestInspection.inspectionPhotos.forEach((photoUrl, index) => {
            // Check if page break is needed
            if (currentY + photoHeight > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                currentY = 45;
            }

            try {
                // Add image (assuming URL returns valid image data or base64)
                // Note: jsPDF addImage supports JPEG, PNG, etc.
                // If these are remote URLs, they might not render in client-side generation without CORS handling or being converted to base64 first.
                // Assuming for now they work or are base64 from the app.
                doc.addImage(photoUrl, 'JPEG', x, currentY, photoWidth, photoHeight);

                // Layout logic for 2 per row
                if ((index + 1) % 2 === 0) {
                    x = 14;
                    currentY += photoHeight + 10;
                } else {
                    x += photoWidth + 10;
                }
            } catch (err) {
                console.error("Error adding image to PDF", err);
                doc.text(`[Error loading image ${index + 1}]`, x, currentY + 10);
                if ((index + 1) % 2 === 0) {
                    x = 14;
                    currentY += 20;
                } else {
                    x += photoWidth + 10;
                }
            }
        });
    }

    // --- 6. QR Code ---
    // Generate QR
    const qrDataUrl = await generateValveQR(valveRecord);
    if (qrDataUrl) {
        // Check if page break is needed
        if (currentY + 50 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            currentY = 45;
        } else {
            currentY += 10;
        }

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Scan to View Record:", 14, currentY);
        doc.addImage(qrDataUrl, 'PNG', 14, currentY + 2, 30, 30);
    }

    // --- 6. Add Header & Footer to All Pages ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawHeader(doc);
        drawFooter(doc, i, pageCount);
    }

    return doc.output('blob');
};
