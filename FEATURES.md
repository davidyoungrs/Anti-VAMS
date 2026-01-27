# Features

## 1. Valve Record Management
- **Comprehensive Datasheets**: Store and manage detailed technical specifications for valves.
- **Data Entry**: Fields for General Info, Construction Details, Service Conditions, and Testing Specs.
- **Search & Filter**: Easily locate valve records by Serial Number, Tag No, or Customer.
- **OCR Scanner (Mobile)**: fast text recognition for Serial Numbers using device camera.

## 2. Inspection System
- **Component Checklists**: Detailed inspection checklists tailored to valve types (e.g., Gate, Globe, Ball).
- **Condition Ratings**: Record "Acceptable", "Repair", or "Replace" status for each component.
- **Repair Notes**: Add specific notes for required repairs or observations.
- **Photo Gallery**: Upload and attach inspection photos to the record.

## 3. Test Reporting
- **Pressure Tests**:
  - Hydrotest (Shell/Seat).
  - Low Pressure Gas Test.
  - High Pressure Liquid Test.
  - Automatic leakage rate recording and verification against allowable limits.
- **Stroke / Control Valve Tests**: 
  - Record signal inputs (4-20mA) vs. actual travel position.
  - Visualize control linearity.

## 4. PDF Report Generation
- **Professional Branding**: 
  - Automated header with Company Logo, "Global Valve Record" title, and Address on every page.
  - Repeating headers for multi-page reports.
- **Complete Data Output**: Generates a single PDF containing:
  - Valve Datasheet.
  - Inspection Results & Checklist.
  - Test Data (Pressure & Stroke).
  - Inspection Photo Gallery.
- **Embedded QR Code**: Every report includes a unique QR code for instant digital access.
- **Layout automation**: Smart pagination to prevent table rows from breaking awkwardly or overlapping headers.
- **Traceability**: Footer on every page with generation Date/Time and Page Numbers.

## 5. Data Management
- **Hybrid Storage**: 
  - **Local First**: Works offline using browser LocalStorage.
  - **Cloud Sync**: One-click synchronization with Supabase for data backup and team collaboration.
- **Media Handling**: Securely uploads and retrieves images for inspection reports.

## 6. Analytics & Intelligence
- **Visual Dashboard**:
  - **Pass/Fail Rates**: Bar charts comparing performance across OEMs.
  - **Failure Modes**: Pie charts visualizing common failure reasons (e.g., Seat Leaks).
- **OEM Filtering**: Multi-select dropdown to filter analytics by specific manufacturers.
- **Maintenance Scheduler**: (Coming Soon) Tools for scheduling and tracking recurring maintenance.

## 7. Advanced Tools
- **Deep Linking**: 
  - Use QR codes to bypass the dashboard and open specific valve records immediately.
  - Physical-to-Digital bridge for workshop efficiency.

---

## 8. Licenses & Attribution
The **Global Valve Record** system creates value by integrating best-in-class open source technologies and data sources. We are committed to full legal compliance and moral attribution.

### Software Libraries
The following open-source software libraries are used under their respective licenses:

| Component | Library | License |
| :--- | :--- | :--- |
| **User Interface** | [React](https://react.dev/) | MIT |
| **Build Tooling** | [Vite](https://vitejs.dev/) | MIT |
| **Cloud Database** | [Supabase](https://supabase.com/) | MIT (Client) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) | MIT |
| **Charts & Analytics** | [Chart.js](https://www.chartjs.org/) | MIT |
| **Mapping Engine** | [Leaflet](https://leafletjs.com/) | BSD-2-Clause |
| **OCR Scanner** | [Tesseract.js](https://tesseract.projectnaptha.com/) | Apache 2.0 |
| **QR Code** | [node-qrcode](https://github.com/soldair/node-qrcode) | MIT |

### Data Sources & Content
We utilize external data services for mapping features. These require specific attribution:

*   **OpenStreetMap**: Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Used under the **ODbL** (Open Data Commons Open Database License).
*   **Esri World Imagery**: Satellite imagery courtesy of [Esri](https://www.esri.com/), i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community.
*   **Fonts**: This application uses system fonts ('Inter' fallback) which are subject to the OS vendor's license (Apple/Microsoft/Google) but require no additional distribution license.

### Moral Rights
We assert the moral right to be identified as the authors of the "Anti-VAMS / GVR" proprietary code layer, while fully acknowledging the giants upon whose shoulders we stand.

