# GVS-VAMS User Guide V0.0.1

Welcome to the Global Valve Register - Valve Asset Management System (AntiGVR-VAMS). This specific guide will help you manage valve records, perform inspections, run tests, and generate professional PDF reports.

---

## 1. Getting Started

### Dashboard Overview
The main dashboard gives you quick access to all core functions:
- **Search Valve Records**: Use the search bar to find valves by Serial Number, Tag, or Customer.
- **New Valve Record**: Click to create a new blank datasheet.
- **Sync Status**: View your local vs. cloud data status (Green = Synced, Yellow = Changes Pending).

---

## 2. Managing Valve Records

### Creating a New Record
1. Click **"New Valve Record"** on the dashboard.
2. **Valve Data**: Fill in the basic identification (Serial No, Job No, Tag No).
   - **Pro Tip (Mobile)**: Click the **Camera Icon** next to 'Serial Number' to use OCR to scan the text directly from the nameplate.
4. **Status & Dates**:
   - **Workflow Status**: Select the current stage (e.g., "Teardown", "Assembly", "Final / Witness Test").
   - Set "Date In" and "Required Date".
5. **Construction**: Enter material details (Body, Seat, Trim, etc.).
6. **Service & Testing**: Define the required test pressures and service conditions.
7. Click **"Save Record"** at the bottom. The record is now saved locally.

### Viewing & Editing
- From the dashboard, click on any row in the **Valve Records** table to open that valve's details.
- Modify any field and click **"Save Changes"** to update.

---

## 3. Performing Inspections

1. Open a **Valve Record**.
2. Scroll to the **"Inspections"** section (or click the "Inspections" tab).
3. Click **"New Inspection"**.
4. **Checklist**:
   - The system automatically loads the correct component list for the valve type (e.g., Gate, Globe).
   - For each component (Body, Bonnet, Seat, etc.), select the **Condition** (Acceptable, Repair, Replace).
   - Add **Repair Notes** if action is needed.
5. **Photos**:
   - Scroll to the "Photos" section.
   - Click **"Upload Photos"** to select images from your device.
   - You can upload multiple images to document the valve's condition.
6. Click **"Save Inspection"**.

---

## 4. Valve Testing

1. Open a **Valve Record**.
2. Scroll to the **"Test Reports"** section.
3. Click **"New Test Report"**.

### Pressure Tests
- **Hydrotest**: Enter Actual vs. Recommended limits for Shell and Seat.
- **Leakage**: The system allows text input for leakage rates (e.g., "0 drops/min").
- **Verification**: If you enter numeric values, the system will visually flag if a test passed or failed.

### Stroke Test (Control Valves)
- If the valve is a Control Valve, scroll to the **Stroke Test** section.
- Enter the **Signal** (e.g., 4mA, 12mA, 20mA).
- Enter the **Actual Travel %** observed.
- The system will compare this against the Expected Travel.

Click **"Save Test Report"** when finished.

---

## 5. Generating Reports & QR Codes

Once a valve has an inspection or test record, you can generate a full PDF report.

1. Open the **Valve Record**.
2. Click the **"Generate PDF Report"** button.
3. **Signatures**: You will be prompted to sign on-screen.
   - **Tested By**: Technician signature.
   - **Witnessed By**: Client/Inspector signature (optional).
   - Click "Save" to capture.
4. **Wait a moment**: The system fetches the logo, generates a QR code, embeds your signature, and formats the document.
5. **Download**: The PDF will automatically download to your device.

### QR Code Integration
- **In the Report**: A unique QR code is stamped on the last page of the PDF.
- **Attachment**: The QR code is also saved as a separate image file in the "Attachments" list.
- **Usage**: Scan this QR code with any mobile device to **instantly open this specific valve record** in the application.

---

## 6. Analytics Dashboard

Gain insights into your valve population using the visual dashboard.

1. Navigate to **"Dashboards & Charts"** > **"Analytics"** in the sidebar menu.
2. **Filtering**:
   - Use the **OEM Filter** dropdown to select specific manufacturers (e.g., "Cameron", "ValvTechnologies").
   - Hold **Cmd/Ctrl** to select multiple OEMs at once. Select "All OEMs" to reset.
3. **Charts**:
   - **WIP Status**: Bar chart showing how many valves are at each stage (e.g., 5 in Teardown, 3 in Assembly).
   - **Pass/Fail Rates**: Bar chart showing testing outcomes by manufacturer.
   - **Top Failure Modes**: Pie chart highlighting the most common reasons for valve failure (e.g., "Seat Leak", "Stem Damage").

4. **"Due Soon" Highlights**:
   - In the **Job Management** view, any valve whose "Required Date" has passed or is imminent will be visually highlighted in **bold red** or **amber** to help prioritize work.

---

## 7. Field Operations & Geofencing

### Offline Maps
- Standard and Satellite maps are automatically cached as you view them.
- If you lose internet on-site, the map will continue to show the areas you previously loaded.

### Job Site Alerts
- When creating a Job, you can define a geographic **Geofence** (Latitude/Longitude and Radius).
- The system will send a **Browser Notification** to your device when you physically enter the job site area.
- Dashboards and Map views will show a dashed circle around active geofenced sites.

---

## 8. Data Synchronization (Cloud)

Your data is stored **locally** on your browser first, so you can work offline. To backup or share data:

1. Look at the **"Sync Local to Cloud"** button on the dashboard.
2. If it is **Blue**, you have new local changes.
3. Click the button to push your records to the Cloud (Supabase).
4. **Sync from Cloud**: This happens automatically on load, but you can refresh the page to pull the latest updates from other users.
