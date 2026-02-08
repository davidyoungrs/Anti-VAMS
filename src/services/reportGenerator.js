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
    // 1. Generate QR Code (Early)
    let qrDataUrl = null;
    try {
        qrDataUrl = await generateValveQR(valveRecord);
    } catch (e) {
        console.warn("Failed to generate QR for report", e);
    }

    // 2. Load Logo (Early)
    let logoImg = null;
    try {
        logoImg = await loadImage('/logo.png');
    } catch (e) {
        console.warn("Could not load logo.png", e);
    }

    // 3. Initialize Doc
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 50; // Start content below header

    // --- Define Header Generator ---
    const drawHeader = (doc, pageNumber) => {
        const rightEdge = pageWidth - 14;

        // A. QR Code (Top Left) - ONLY ON PAGE 1
        if (qrDataUrl && pageNumber === 1) {
            doc.addImage(qrDataUrl, 'PNG', 14, 10, 25, 25);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text("Scan for Digital Record", 14, 38);
        }

        // B. Header Text (Top Right)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text("Global Valve Record", rightEdge, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const addressLines = [
            "TheValve.pro",
            "PO Box 212359",
            "Dubai",
            "United Arab Emirates"
        ];
        doc.text(addressLines, rightEdge, 26, { align: 'right' });

        // C. Logo (Left of Text - Calculated to avoid overlap)
        if (logoImg) {
            try {
                // Calculate width of the text block to safely position logo
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                const titleWidth = doc.getTextWidth("Global Valve Record");

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                // Find widest line in address
                const addressWidth = Math.max(...addressLines.map(l => doc.getTextWidth(l)));

                const maxTextWidth = Math.max(titleWidth, addressWidth);

                // Logo Dimensions
                const logoHeight = 15;
                const aspect = logoImg.width / logoImg.height;
                const logoWidth = logoHeight * aspect;

                // Position: RightEdge - TextWidth - Padding - LogoWidth
                const logoX = rightEdge - maxTextWidth - 8 - logoWidth;

                doc.addImage(logoImg, 'PNG', logoX, 12, logoWidth, logoHeight);
            } catch (e) {
                // Ignore drawing error
            }
        }
    };

    // --- Define Footer Generator ---
    const drawFooter = (doc, pageNumber, totalPages) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        const dateStr = new Date().toLocaleString();
        doc.text(`Generated on: ${dateStr} | Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // --- Content Generation Helpers ---
    const addSectionHeader = (title) => {
        if (currentY + 15 > pageHeight - 20) {
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
        doc.setTextColor(0, 0, 0); // Reset
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
    };

    // --- 1. Title (Document Body) ---
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    // Center title in available space? Or just center page.
    doc.text("Valve Inspection & Test Report", pageWidth / 2, 50, { align: 'center' });
    currentY = 70; // Set explicit Y after main title

    // --- 2. Valve Data ---
    addSectionHeader("Valve Data");

    // Dynamic rows based on valve type
    let valveRows = [];
    if (valveRecord.valveType === 'Globe Control Valve') {
        // Detailed Globe Control Valve Layout
        valveRows = [
            ['Serial Number', valveRecord.serialNumber || 'N/A', 'Customer', valveRecord.customer || 'N/A'],
            ['Job No', valveRecord.jobNo || 'N/A', 'Tag No', valveRecord.tagNo || 'N/A'],
            ['Order No', valveRecord.orderNo || 'N/A', 'OEM', valveRecord.oem || 'N/A'],
            ['Valve Type', valveRecord.valveType || 'N/A', 'Size / Class', valveRecord.sizeClass || 'N/A'],
            ['Plant Area', valveRecord.plantArea || 'N/A', 'Location', valveRecord.siteLocation || 'N/A'],
            ['Model No', valveRecord.modelNo || 'N/A', ' ', ' ']
        ];
    } else {
        // Standard Valve Layout
        valveRows = [
            ['Serial Number', valveRecord.serialNumber || 'N/A', 'Customer', valveRecord.customer || 'N/A'],
            ['Job No', valveRecord.jobNo || 'N/A', 'Tag No', valveRecord.tagNo || 'N/A'],
            ['Order No', valveRecord.orderNo || 'N/A', 'OEM', valveRecord.oem || 'N/A'],
            ['Valve Type', valveRecord.valveType || 'N/A', 'Size / Class', valveRecord.sizeClass || 'N/A'],
            ['Plant Area', valveRecord.plantArea || 'N/A', 'Location', valveRecord.siteLocation || 'N/A'],
            ['Model No', valveRecord.modelNo || 'N/A', 'Actuator', valveRecord.actuator || 'N/A']
        ];
    }

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

    // --- SPECIAL SECTION: GLOBE CONTROL VALVE ACTUATION ---
    if (valveRecord.valveType === 'Globe Control Valve') {
        // Actuator Table
        const actuatorRows = [
            ['Serial', valveRecord.actuatorSerial || '', 'Make', valveRecord.actuatorMake || ''],
            ['Model', valveRecord.actuatorModel || '', 'Type', valveRecord.actuatorType || ''],
            ['Size', valveRecord.actuatorSize || '', 'Range/Bench', valveRecord.actuatorRange || ''],
            ['Travel', valveRecord.actuatorTravel || '', 'Other', valveRecord.actuatorOther || '']
        ];

        autoTable(doc, {
            startY: currentY,
            head: [[' Extended Actuator Details', '', '', '']],
            body: actuatorRows,
            theme: 'striped',
            headStyles: { fillColor: [220, 230, 241], textColor: [0, 0, 0], fontStyle: 'bold' }, // Light Blue Header
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

        // Instrumentation Table
        const instrRows = [
            ['Pos. Model', valveRecord.positionerModel || '', 'Pos. Serial', valveRecord.positionerSerial || ''],
            ['Pos. Mode', valveRecord.positionerMode || '', 'Pos. Signal', valveRecord.positionerSignal || ''],
            ['Pos. Charact.', valveRecord.positionerCharacteristic || '', 'Pos. Supply', valveRecord.positionerSupply || ''],
            ['Reg. Model', valveRecord.regulatorModel || '', 'Reg. Set Point', valveRecord.regulatorSetPoint || ''],
            ['Other', valveRecord.positionerOther || '', ' ', ' ']
        ];

        autoTable(doc, {
            startY: currentY,
            head: [[' Instrumentation Details', '', '', '']],
            body: instrRows,
            theme: 'striped',
            headStyles: { fillColor: [220, 230, 241], textColor: [0, 0, 0], fontStyle: 'bold' },
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
    }

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

    const latestInspection = inspectionData.length > 0 ? inspectionData[0] : {};
    const componentsData = latestInspection.components || {};

    doc.text(`Inspection Date: ${latestInspection.inspectionDate ? new Date(latestInspection.inspectionDate).toLocaleDateString() : 'Not Inspected'}`, 14, currentY);
    doc.text(`Inspector: ${latestInspection.inspectorName || '-'}`, 120, currentY);
    currentY += 8;

    const valveType = valveRecord.valveType || 'Gate Valve';
    const valveConfig = VALVE_COMPONENT_CONFIGS[valveType] || VALVE_COMPONENT_CONFIGS['Gate Valve'];

    const checklistRows = [];

    Object.entries(valveConfig).forEach(([categoryName, partsList]) => {
        checklistRows.push([{ content: categoryName.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        partsList.forEach(partKey => {
            const label = COMPONENT_LABELS[partKey] || partKey.replace(/([A-Z])/g, ' $1').trim();
            const partData = componentsData[partKey] || {};
            checklistRows.push([label, partData.condition || '-', partData.action || '-', partData.notes || '-']);
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
        const testTableData = [];

        testTableData.push(['Hydrotest', pt.hydrotest?.actual || '-', pt.hydrotest?.allowable || '-', pt.hydrotest?.unit || '-', pt.hydrotest?.duration || '-', '-', '-', '-']);
        testTableData.push(['Low Pressure Gas', pt.lowPressureGas?.actual || '-', pt.lowPressureGas?.allowable || '-', pt.lowPressureGas?.unit || '-', pt.lowPressureGas?.duration || '-', pt.lowPressureGas?.actualLeakage || '-', pt.lowPressureGas?.allowableLeakage || '-', pt.lowPressureGas?.leakageUnit || '-']);
        testTableData.push(['High Pressure Liquid', pt.highPressureLiquid?.actual || '-', pt.highPressureLiquid?.allowable || '-', pt.highPressureLiquid?.unit || '-', pt.highPressureLiquid?.duration || '-', pt.highPressureLiquid?.actualLeakage || '-', pt.highPressureLiquid?.allowableLeakage || '-', pt.highPressureLiquid?.leakageUnit || '-']);

        autoTable(doc, {
            startY: currentY,
            head: [['Test Type', 'Pressure (Act)', 'Pressure (All)', 'Unit', 'Time', 'Leak (Act)', 'Leak (All)', 'Leak Unit']],
            body: testTableData,
            headStyles: { fillColor: [52, 73, 94] },
            styles: { fontSize: 8, cellPadding: 1 },
            margin: { top: 40, left: 14, right: 14 }
        });
        currentY = doc.lastAutoTable.finalY + 10;

        if (latestTest.strokeTest && latestTest.strokeTest.details && latestTest.strokeTest.details.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text("Stroke Test / Control Valve", 14, currentY);
            currentY += 6;
            const strokeRows = latestTest.strokeTest.details.map(row => [row.signal || '-', row.expectedTravel || '-', row.actual || '-']);
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

    // --- 5. Sign-off ---
    if (valveRecord.signatureDataUrl) {
        // Check for page break
        if (currentY + 50 > pageHeight - 20) {
            doc.addPage();
            currentY = 50;
        }

        addSectionHeader("Sign-off");

        try {
            // Signature Image
            doc.addImage(valveRecord.signatureDataUrl, 'PNG', 14, currentY, 50, 20); // W:50, H:20

            // Meta text below signature
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Signed By: ${valveRecord.signedBy || 'Inspector'}`, 14, currentY + 26);
            doc.text(`Date: ${new Date(valveRecord.signedDate || Date.now()).toLocaleString()}`, 14, currentY + 32);

            currentY += 40;
        } catch (e) {
            console.error("Error adding signature to PDF", e);
            doc.text("[Signature Error]", 14, currentY + 10);
            currentY += 20;
        }
    }

    // --- 5. Inspection Photos ---
    if (latestInspection.inspectionPhotos && latestInspection.inspectionPhotos.length > 0) {
        addSectionHeader("Inspection Photos");
        const photoWidth = 80;
        const photoHeight = 60;
        let x = 14;

        latestInspection.inspectionPhotos.forEach((photoUrl, index) => {
            if (currentY + photoHeight > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                currentY = 50; // Reset to below header
            }
            try {
                doc.addImage(photoUrl, 'JPEG', x, currentY, photoWidth, photoHeight);
                if ((index + 1) % 2 === 0) {
                    x = 14;
                    currentY += photoHeight + 10;
                } else {
                    x += photoWidth + 10;
                }
            } catch (err) {
                console.error("Error adding image", err);
                doc.text(`[Error loading image]`, x, currentY + 10);
                if ((index + 1) % 2 === 0) {
                    x = 14;
                    currentY += 20;
                } else {
                    x += photoWidth + 10;
                }
            }
        });
    }

    // --- 6. Add Header & Footer to All Pages ---
    // (This loops through all pages at the end and stamps the header/footer)
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawHeader(doc, i);
        drawFooter(doc, i, pageCount);
    }

    return doc.output('blob');
};

export const generateRbiReport = async (rbiResults, inputs) => {
    // 1. Load Logo
    let logoImg = null;
    try {
        logoImg = await loadImage('/logo.png');
    } catch (e) {
        console.warn("Could not load logo.png", e);
    }

    // 2. Initialize Doc
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 50;

    // --- Define Header Generator ---
    const drawHeader = (doc) => {
        const rightEdge = pageWidth - 14;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text("RBI Risk Assessment", rightEdge, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(["Global Valve-Academy", "RBI Compliance Division", "SV-ENG-0002 Protocol"], rightEdge, 26, { align: 'right' });

        if (logoImg) {
            try {
                const logoHeight = 15;
                const aspect = logoImg.width / logoImg.height;
                const logoWidth = logoHeight * aspect;
                doc.addImage(logoImg, 'PNG', 14, 12, logoWidth, logoHeight);
            } catch (e) { }
        }
    };

    // --- Define Footer Generator ---
    const drawFooter = (doc, pageNumber, totalPages) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        const dateStr = new Date().toLocaleString();
        doc.text(`Generated on: ${dateStr} | Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const addSectionHeader = (title) => {
        doc.setFontSize(13);
        doc.setTextColor(41, 128, 185);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, currentY);
        doc.setLineWidth(0.3);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
    };

    // --- Start Content ---
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("PRV Risk-Based Inspection Report", pageWidth / 2, 50, { align: 'center' });
    currentY = 65;

    // 1. Valve Metadata
    addSectionHeader("Valve Identification");
    const meta = rbiResults.metadata;
    const metaRows = [
        ['Customer', meta.customer || 'N/A', 'OEM', meta.oem || 'N/A'],
        ['Serial Number', meta.serialNumber || 'N/A', 'Tag Number', meta.tagNumber || 'N/A'],
        ['Model Number', meta.modelNumber || 'N/A', 'Set Pressure', meta.setPressure || 'N/A']
    ];

    autoTable(doc, {
        startY: currentY,
        body: metaRows,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 55 }, 2: { fontStyle: 'bold', cellWidth: 35 }, 3: { cellWidth: 55 } }
    });
    currentY = doc.lastAutoTable.finalY + 10;

    // 2. Consequence of Failure
    addSectionHeader("Assessment Data (COF)");
    const cofRows = [
        ['Op Temperature', `${inputs.temp} ${inputs.tempUnit}`, 'Op Pressure', `${inputs.pressure} ${inputs.pressureUnit}`],
        ['Containment', inputs.containmentType, 'Critical Dimension', inputs.containmentValue || 'N/A'],
        ['Fluid Type', inputs.fluidType, 'Repair Cost Est.', inputs.repairCost ? `${inputs.repairCostCurrency}${inputs.repairCost}` : 'N/A']
    ];

    autoTable(doc, {
        startY: currentY,
        body: cofRows,
        theme: 'striped',
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
    });
    currentY = doc.lastAutoTable.finalY + 5;

    // 3. Probability of Failure
    addSectionHeader("Assessment Data (POF)");
    const pofRows = [
        ['History Count', inputs.historyCount, 'Service Type', inputs.serviceType === '1' ? 'Clean' : 'Dirty/Corrosive'],
        ['Pre-Pop Result', inputs.currentPrePop || 'N/A', 'Problem Corrected', inputs.problemCorrected || 'N/A'],
        ['Leak Test', inputs.leakTest, 'Current Interval', `${inputs.currentInterval} mo`]
    ];

    autoTable(doc, {
        startY: currentY,
        body: pofRows,
        theme: 'striped',
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
    });
    currentY = doc.lastAutoTable.finalY + 5;

    // Latest Actions
    doc.setFont('helvetica', 'bold');
    doc.text("Latest Repair Actions Applied:", 14, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(inputs.actions.join(', '), 65, currentY + 5);
    currentY += 15;

    // 4. Final Risk Profile
    addSectionHeader("Risk Profile & Recommendations");
    const summaryRows = [
        ['COF Factor', rbiResults.cofFactor, 'POF Category', rbiResults.pofRank],
        ['Consequence Rank', rbiResults.cofRank, 'Risk Matrix Result', `${rbiResults.recommendedInterval} Months`]
    ];

    autoTable(doc, {
        startY: currentY,
        body: summaryRows,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3, halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
    });
    currentY = doc.lastAutoTable.finalY + 10;

    // Recommendation Box
    doc.setFillColor(235, 245, 255);
    doc.rect(14, currentY, pageWidth - 28, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("RECOMMENDED CERTIFICATION ACTION:", 20, currentY + 10);
    doc.setFontSize(14);
    doc.text(rbiResults.nextAction.toUpperCase(), 20, currentY + 18);
    currentY += 35;

    if (rbiResults.intermediateRequired) {
        doc.setFillColor(255, 248, 235);
        doc.rect(14, currentY, pageWidth - 28, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.setFontSize(10);
        doc.text("SAFETY OVERRIDE (50% RULE):", 20, currentY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`An intermediate examination (OLSPV) is mandatory at ${rbiResults.intermediateInterval} months.`, 20, currentY + 15);
        currentY += 30;
    }

    // Stamps/Headers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawHeader(doc);
        drawFooter(doc, i, pageCount);
    }

    return doc.output('blob');
};
