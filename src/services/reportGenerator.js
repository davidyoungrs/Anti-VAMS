import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VALVE_COMPONENT_CONFIGS, COMPONENT_LABELS } from './inspectionService';

export const generateFullReport = (valveRecord, inspectionData = [], testData = []) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header Helper
    const addSectionHeader = (title) => {
        if (currentY + 15 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            currentY = 20;
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
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text("Valve Inspection & Test Report", pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

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
        margin: { left: 14, right: 14 }
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
        margin: { left: 14, right: 14 }
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
        margin: { left: 14, right: 14 }
    });
    currentY = doc.lastAutoTable.finalY + 10;

    // --- 3. Inspection Checklist ---
    addSectionHeader("Inspection Checklist");

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
        margin: { left: 14, right: 14 },
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
            pt.hydrotest?.duration || '-'
        ]);

        // Low Pressure Gas
        testTableData.push([
            'Low Pressure Gas',
            pt.lowPressureGas?.actual || '-',
            pt.lowPressureGas?.allowable || '-',
            pt.lowPressureGas?.unit || '-',
            pt.lowPressureGas?.duration || '-'
        ]);

        // High Pressure Liquid
        testTableData.push([
            'High Pressure Liquid',
            pt.highPressureLiquid?.actual || '-',
            pt.highPressureLiquid?.allowable || '-',
            pt.highPressureLiquid?.unit || '-',
            pt.highPressureLiquid?.duration || '-'
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Test Type', 'Actual Pressure', 'Allowable', 'Unit', 'Duration (min)']],
            body: testTableData,
            headStyles: { fillColor: [52, 73, 94] },
            margin: { left: 14, right: 14 }
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
                row.allowable || '-'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Signal', '% Travel', 'Allowable Error']],
                body: strokeRows,
                headStyles: { fillColor: [52, 73, 94] },
                margin: { left: 14, right: 14 }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

    } else {
        doc.setFont(undefined, 'italic');
        doc.text("No test results available.", 14, currentY);
        currentY += 10;
    }

    return doc.output('blob');
};
