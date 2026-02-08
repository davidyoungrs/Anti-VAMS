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
- **Digital Signatures**: Capture technician and witness signatures on the device, embedded directly into the report for authentication.
- **Embedded QR Code**: Every report includes a unique QR code for instant digital access.
- **Layout automation**: Smart pagination to prevent table rows from breaking awkwardly or overlapping headers.
- **Traceability**: Footer on every page with generation Date/Time and Page Numbers.

## 5. Data Management
- **Hybrid Storage**: 
  - **Local First**: Works offline using browser LocalStorage.
  - **Cloud Sync**: One-click, intelligent synchronization with Supabase.
  - **Real-Time Collaboration**: Updates from other devices appear instantly on your dashboard.
- **Sequential Media Uploads**: Robust file handling optimized for field network conditions (prevents timeouts).
- **Categorized Attachment System**: 
  - **Logical Folders**: Automatic grouping into Datasheets, BOMs, Photos, SPIRs, and Reports.
  - **Drag-and-Drop Categorization**: Assign categories individually or in bulk during upload.
  - **"Move to Folder"**: Reorganize existing attachments instantly within the record.
  - **Smart Scroll**: Immediate viewport reset when opening documents for rapid access.

## 6. Stability & Resilience
- **Global Error Boundary**: Intelligent crash recovery that shows a helpful "Something went wrong" screen instead of a blank page.
- **Visual Feedback**: Interactive "Initializing Secure Session" indicators during authentication and data loading.
- **Defensive State Management**: Robust handling of incomplete or malformed data to ensure UI continuity.

## 6. Workflow & Job Tracking
- **Detailed Status Tracking**: Move beyond simple "Pending/Complete". Track distinct stages:
  - "Booked in", "Teardown", "Machine / Welding", "Assembly", "Test", "Paint/Pack", "Shipped".
  - "Hold / Waiting for info" status flags items needing attention.
  - "Waiting customer approval" for hold points.
- **Job Assignment**: Link valves to specific client Jobs or Projects.

## 7. Analytics & Intelligence
- **Visual Dashboard**:
  - **WIP Status**: Bar chart showing real-time volume of valves at each workflow stage.
  - **Pass/Fail Rates**: Bar charts comparing performance across OEMs.
  - **Failure Modes**: Pie charts visualizing common failure reasons (e.g., Seat Leaks).
- **Maintenance Monitoring**:
  - **"Due Soon" Awareness**: Visual highlighting of valves approaching their "Required Date" within Job views.
  - **Predictive Data**: Foundation laid for MTBF analysis based on historical failure modes.
- **OEM Filtering**: Multi-select dropdown to filter analytics by specific manufacturers.
- **Maintenance Scheduler**: Advanced analytics and date-tracking views to manage recurring maintenance intervals.

## 8. Advanced Geo-Spatial Tools
- **Offline Maps**: Cached standard and satellite imagery for remote field sites with no signal.
- **Geo-Fencing**: Automatic browser notifications when entering a defined Job Site area.
- **Deep Linking**: 
  - Use QR codes to bypass the dashboard and open specific valve records immediately.
  - Physical-to-Digital bridge for workshop efficiency.

## 9. Engineering Calculations & RBI
- **PRV RBI System (SV-ENG-0002)**:
  - **Automated Risk Profiling**: Full implementation of the SVS Consequence of Failure (COF) and Probability of Failure (POF) flowcharts.
  - **Recertification Matrices**: Automated interval recommendations (12-60 months) based on Category 1 & 2 history logic.
  - **"50% Rule" Safety Logic**: Automatic detection and recommendation for intermediate exams when extending intervals beyond double the current period.
  - **Online Testing (OLSPV)**: Decision engine to recommend Bench Test vs. In-situ testing based on risk and history.
  - **Database Integration**: One-click lookup and auto-population of metadata from existing valve records.
  - **Automated Reporting**: Professional jsPDF report generation with risk summaries and automated interval calculation results.
  - **Integrated Cloud Storage**: Automated saving of generated PDF reports to the valve's specific inspection history folder in Supabase.
  - **Environmental Normalization**: Built-in unit conversion (Celsius/Fahrenheit, Bar/PSI) to ensure calculation accuracy against standards.
- **Valve Sizing & Conversion**:
  - **Cv/Kv Calculation**: Sizing tools for Liquid, Gas, Steam, and Multiphase flow types.
  - **Flange Tables**: Instant lookup for ASME, DIN, and API flange dimensions and bolt patterns.
  - **Mass/Volume Tools**: Real-time flow rate conversions using fluid density.

## 10. Regulatory & Security Compliance
- **Inactivity Timer**: Automatic session timeout after 10 minutes of idle time (ISO 27002 compliance).
- **Soft Delete (Historical Traceability)**: Records are never permanently destroyed on the first click; instead, they are archived with a `deleted_at` timestamp for audit trails.
- **Encryption-at-Rest**: All sensitive valve data and job details are encrypted locally using FIPS-ready standards before being synced to the cloud.
- **Software Supply Chain Security (SCA)**: 
  - **Automated Auditing**: Real-time vulnerability scanning via `npm audit` integrated into the dev cycle.
  - **SBOM Transparency**: Generates ISO 27032 compliant Software Bill of Materials (`bom.json`) for full architectural transparency.

---
