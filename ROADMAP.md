# Strategic Development Roadmap

This document outlines the proposed development path for the GVR-VAMS.

## Phase 1: Core Architecture (The Foundation)
*These changes affect the data structure and should be done first to avoid massive refactoring later.*

1. **Project / Job Management Layer** (Priority: High)
   - **Why**: Currently, valves are a flat list. Real work happens in "Jobs" (e.g., "Shutdown 2026").
   - **Task**: Create `jobs` table. Link `valves` to `jobs`.
   - **Benefit**: Batch reporting, progress tracking (e.g., "Job #101 is 80% complete").

2. **Multi-User Roles & Permissions** (Priority: High)
   - **Why**: Essential for data integrity.
   - **Task**: Implement `Admin` (can delete/configure), `Inspector` (can edit/inspect), `Client` (read-only).
   - **Benefit**: Prevents field errors; enables the Client Portal.

## Phase 2: Inspection Efficiency (The "Wow" Factor)
*Features that make the daily user's life easier.*

3. **Integrated "Standards" Calculator** (Priority: Medium)
   - **Why**: Eliminates manual lookups and human error.
   - **Task**: Implement API 598 / ISO 5208 logic.
   - **Benefit**: Instant "Pass/Fail" determination based on input pressure/size.

4. **Image Annotation** (Priority: Medium)
   - **Why**: "A picture is worth 1000 words, but a circle on a crack is worth 1000 pictures."
   - **Task**: Canvas-based drawing tool on upload.

5. **Digital Signatures** (Priority: Medium)
   - ~~**Why**: Makes the PDF a legal document.~~ <span style="color:green">**(Complete 28th Jan 2026)**</span>
   - ~~**Task**: Signature pad component -> Save as image -> Embed in PDF.~~

## Phase 3: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

6. **Analytics & Predictive Maintenance** (Priority: Low - depends on data volume)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis (already started).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

7. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

8. **Bulk Report Export** (Priority: Medium)
   - ~~**Task**: "Download Job as ZIP".~~ <span style="color:green">**(Complete 28th Jan 2026)**</span>
   - **Dependency**: Needs "Job Management" layer first.

## Phase 4: Experimental / High Complexity
9. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Start with specific field extraction (like we did for Serial No) rather than full-page ingestion, unless integrating a cloud AI service (e.g., AWS Textract / Google Document AI).

## Phase 5: Client Engagement
10. **Client "Live View" Portal**
    - **Task**: Read-only views for specific Job IDs.
    - **Dependency**: Needs "Job Management" and "Roles" (Public/Guest access).

## Phase 6: Enterprise Security & Compliance
11. **Enterprise Hardening** (Priority: Critical for Scale)
    - **Identity & Access**: Implement Role-Based Access Control (RBAC) via Supabase Auth (e.g., separating `Inspector` vs `Admin` roles).
    - **Database Security**: Enforce strictly typed **Row Level Security (RLS)** policies.
    - **Data Protection**: Implement local encryption for offline data and MDM policies for device usage.
    - **Audit Trails**: Create a tamper-proof "Audit Log" database table to track every data modification for compliance (SOC2 readiness).

---

## Technical Recommendations
- **Mobile First**: Ensure all Phase 2 features (Signatures, Annotation) work seamlessly on tablets.
- **Offline Sync**: Ensure the Job Management layer doesn't break offline capabilities.
- **Security First**: All future API endpoints must be protected by RLS policies.

---

# Appendix: Enterprise Security Review & Recommendations

## 1. Executive Summary
The application currently operates on a **"Local-First"** architecture with optional Cloud Sync (Supabase). While this provides data sovereignty advantages (data lives on the device), it imposes significant security responsibilities on the client-side code.

**Current Security Posture:** **Basic / MVP Level**
**Target Security Posture:** **Enterprise / SOC2 Compliance Ready**

## 2. Vulnerability Analysis

### 2.1 Identity & Access Management (IAM)
*   **Current State:** The code mentions Supabase but lacks robust Role-Based Access Control (RBAC) in the frontend. It appears to treat all users with access to the URL as "Admins" or "General Users" equally.
*   **Risk (High):** Without strict Roles (Admin vs. Inspector vs. Read-Only), a junior technician could accidentally delete master records.
*   **Recommendation:** Implement **Supabase Auth with Row Level Security (RLS)**.
    *   Create roles (`admin`, `inspector`, `viewer`).
    *   Enforce RLS policies in the database (e.g., `viewer` can SELECT but not INSERT/UPDATE).

### 2.2 Data Protection
*   **Local Storage:** Data is stored in browser `localStorage` as unencrypted JSON strings.
*   **Risk (Medium):** If a device is stolen, any user with browser access can read the data.
*   **Recommendation:**
    1.  **Encryption at Rest (Local):** Use the Web Crypto API to encrypt sensitive fields before saving to `localStorage`.
    2.  **Device Policy:** Enforce device-level security (passcodes) via MDM (Mobile Device Management) for enterprise deployment.

### 2.3 Network Security & API
*   **Current State:** `storageService.js` makes direct calls to Supabase.
*   **Risk (Low/Medium):** If the Supabase Anon Key is exposed (which is standard), relying solely on valid API keys is insufficient.
*   **Recommendation:** Ensure **Row Level Security (RLS)** is the primary defense. The endpoint should *only* accept requests from authenticated users (JWT tokens).

### 2.4 Content Security Policy (CSP)
*   **Current State:** Default Vite configuration.
*   **Risk (Medium):** Vulnerable to Cross-Site Scripting (XSS) if malicious scripts are injected (e.g., via a compromised npm package).
*   **Recommendation:** Implement a strict **Content Security Policy (CSP)** header in the deployment config (Vercel/Netlify) to block unauthorized script sources.

## 3. Immediate Action Plan

### Phase 1: hardening (Immediate)
1.  **Sanitize Inputs:** Ensure all text inputs (especially `generated reports`) utilize strict sanitization to prevent XSS in the PDF generator.
2.  **Audit Dependencies:** Regular `npm audit` (Done - currently Clean).

### Phase 2: Enterprise Authentication (Next Sprint)
3.  **Implement RLS**: define `CREATE POLICY "Allow public read" ON valves FOR SELECT USING (true);` etc. in Supabase.
4.  **Enforce Auth**: Require login for *writes* (Sync).

### Phase 3: Compliance
5.  ~~**Audit Logs**: Create a `logs` table in Supabase to track *who* changed *what* and *when*. (Partially implemented in `storageService.js` via history, but needs immutability).~~ <span style="color:green">**(Complete 27th Jan 2026)**</span>

## 4. Conclusion
The current code is functional and clean, but "Enterprise" readiness requires moving security logic from the **Client** (trusting the app) to the **Server** (Row Level Security & Auth).

**Verdict:** *Safe for internal pilot use, but requires RLS implementation before broad enterprise rollout.*
