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
- **OEM Filtering**: Multi-select dropdown to filter analytics by specific manufacturers.
- **Maintenance Scheduler**: (Coming Soon) Tools for scheduling and tracking recurring maintenance.

## 8. Advanced Tools
- **Deep Linking**: 
  - Use QR codes to bypass the dashboard and open specific valve records immediately.
  - Physical-to-Digital bridge for workshop efficiency.

---

