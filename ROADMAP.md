# Strategic Development Roadmap

This document outlines the proposed development path for the GVR-VAMS.

## Phase 1: Inspection Efficiency (The "Wow" Factor)
*Features that make the daily user's life easier.*

1. **Integrated "Standards" Calculator** (Priority: Medium)
   - **Why**: Eliminates manual lookups and human error.
   - **Task**: Implement API 598 / ISO 5208 logic.
   - **Benefit**: Instant "Pass/Fail" determination based on input pressure/size.

## Phase 2: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

2. **Analytics & Predictive Maintenance** (Status: **In Progress**)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis.
   - **New**: Added **WIP Status Tracking** (Real-time dashboard of valve workflow stages).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

3. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

## Phase 3: Experimental / High Complexity

4. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Start with specific field extraction (like we did for Serial No) rather than full-page ingestion, unless integrating a cloud AI service (e.g., AWS Textract / Google Document AI).

---

## Technical Recommendations
- **Mobile First**: Ensure all new features work seamlessly on tablets.
- **Offline Sync**: Ensure the Job Management layer doesn't break offline capabilities.
- **Security First**: All future API endpoints must be protected by RLS policies.

---

# Security Features
*Comprehensive regulatory compliance and cybersecurity controls.*

## ISO/IEC 27701 Privacy & Compliance (PIMS)
*Critical features for Regulatory Compliance and Data Privacy.*

5. **Data Subject Rights Management** (Priority: High)
   - **Why**: ISO 27701 / GDPR requirement for PII management.
   - **Task**: Implement "Right to Erasure" (Hard Delete) and "Right to Access" (Data Portability) tools for PII.
   - **Note**: Current "Soft Delete" is insufficient for "Right to be Forgotten" requests.

6. **Data Retention & Disposal Policy** (Priority: High)
   - **Why**: Prevent indefinite storage of stale personal data.
   - **Task**: Automated jobs to anonymize or purge inactive user logs/history after set retention period (e.g., 7 years).

7. **Privacy Impact Assessment (PIA) Workflow** (Priority: Medium)
   - **Why**: Security by Design.
   - **Task**: Checklist integration for new deployments to verify privacy risks are mitigated.

## ISO/IEC 27001/27002 ISMS Controls
*Core information security controls for enterprise certification.*

8. **Multi-Factor Authentication (MFA)** (Priority: Critical for Admins)
   - **Why**: ISO 27002 9.4.3 (Password Management) & 24.1 (MFA). Brute force protection.
   - **Task**: Enable and enforce MFA (TOTP) for all 'Admin' and 'Inspector' roles.
8.  **Multi-Factor Authentication (MFA)** (Priority: Critical for Admins)
    - **Why**: ISO 27002 9.4.3 (Password Management) & 24.1 (MFA). Brute force protection.
    - **Task**: Enable and enforce MFA (TOTP) for all 'Admin' and 'Inspector' roles.

9.  **Comprehensive Audit Logs (SIEM Ready)** (Priority: High)
    - **Why**: ISO 27002 8.15 (Logging).
    - **Task**: Expand logging to include *failed login attempts*, *privileged view access*, and *configuration changes*.
    - **Note**: Must be exportable to external SIEM systems.

10. **Session Management (Inactivity Timeout)** (Status: **Completed**)
    - **Why**: ISO 27002 8.17 (Clock Synchronization) & Session control.
    - **Task**: Implemented client-side inactivity timer to auto-logout users after 10 minutes of idle time.

## ISO/IEC 27032 Cybersecurity Guidelines
*Focus on Cyberspace Security, supply chain, and external attack surface.*

11. **Software Supply Chain Security (SCA)** (Priority: High)
    - **Why**: ISO 27032 demand for secure application controls & supply chain trust.
    - **Task**: Integrate automated dependency auditing (e.g., `npm audit`, Snyk, or Dependabot) into the CI/CD pipeline. Requires a visible "Bill of Materials" (SBOM).

12. **Vulnerability Disclosure Policy (RFC 9116)** (Priority: Low/Medium)
    - **Why**: Standardizes how ethical hackers communicate security findings.
    - **Task**: Publish a `security.txt` file at `/.well-known/security.txt` detailing contacts and disclosure guidelines.

13. **Incident Response Playbook Integration** (Status: **Completed**)
    - **Why**: ISO 27032 13.3 (Incident Management).
    - **Task**: Created "Emergency Mode" feature (global "ReadOnly" switch) to contain active threats.

## US Federal & Defense Compliance (NIST 800-53 / CMMC)
*Strict controls for systems handling CUI (Controlled Unclassified Information).*

14. **System Use Notification Banner (AC-8)** (Priority: High for DoD)
    - **Why**: Mandatory requirement for CMMC/NIST to warn users they are accessing a monitored system.
    - **Task**: Implement a configurable "Consent to Monitor" banner on the Login screen that users must accept before signing in.

15. **FIPS 140-2 Cryptography Review (SC-13)** (Priority: High)
    - **Why**: Federal systems often require FIPS-validated crypto modules.
    - **Task**: Review `CryptoJS` usage. Plan potential migration to Web Crypto API (browser native, often FIPS compliant on Windows/macOS) or server-side KMS for sensitive data at rest.

16. **Media Sanitization & Destruction (MP-6)** (Priority: Medium)
    - **Why**: CMMC requires assurance that deleted data is unrecoverable.
    - **Task**: Upgrade "Delete" features to overwrite data segments (crypto-shredding) rather than just removing pointers.

## Continuous Monitoring & Resilience (NIST/CMMC Advanced)
*Automated controls to maintain compliance posture over time.*

17. **Automated Vulnerability Scanning (RA-5)** (Priority: Medium)
    - **Why**: NIST requires detection of vulnerabilities in a timely manner.
    - **Task**: Integrate SAST (Static Analysis) and DAST (Dynamic Scanning) tools into the deployment pipeline to catch flaws before production.

18. **Disaster Recovery (DR) Drill Mode (CP-4)** (Priority: Low)
    - **Why**: Recoverability must be tested, not just assumed.
    - **Task**: Create scripts to simulate a "Region Down" or "Data Loss" event and measure RTO (Recovery Time Objective) for restoring from encrypted backups.

## Middle East Regional Compliance (UAE/KSA/Qatar)
*Specific modifications for GCC cybersecurity frameworks (NESA, NCA, QCB).*

19. **Data Residency & Localization Strategy** (Priority: Critical for GCC)
    - **Why**: Saudi NCA ECC (2-1-3) and UAE NESA require restricted data geolocations.
    - **Task**: Architect Supabase deployment to support "Region Pinning" (e.g., ensuring data stored in AWS Middle East/Bahrain/UAE regions only) or On-Premise capability.

20. **Extended Log Retention Archival** (Priority: Medium)
    - **Why**: NCA ECC & QCB often require audit logs to be retained for 12 months minimum.
    - **Task**: Implement automated "Cold Storage" offloading of logs to low-cost archival (S3 Glacier) to meet retention mandates without database bloat.

21. **NTP Time Synchronization Assurance** (Status: **Completed**)
    - **Why**: QCB/NCA mandate accurate timestamping for forensic validity.
    **Task**: Verified cloud server clock sources and exposed "Last Sync Status" & Drift in the Admin Panel security tab.

## China Cybersecurity Law & MLPS 2.0 Compliance
*Strict national controls for operations within mainland China (GB/T Standards).*

22. **SM Series Cryptography (SM2/SM3/SM4)** (Priority: Critical for China)
    - **Why**: MLPS 2.0 / State Cryptography Administration (SCA) mandate use of Chinese sovereign algorithms (SMx) over RSA/AES/SHA.
    - **Task**: Implement a toggleable "China Mode" that swaps `CryptoJS` AES-256 for **SM4-CBC** (Data at Rest) and uses **SM2** for identity verification.

23. **Strict Data Localization (Data Sovereignty)** (Priority: Critical)
    - **Why**: China Cybersecurity Law (CSL) prohibits cross-border transfer of Critical Infrastructure data.
    - **Task**: Ensure a fully isolated Supabase region within mainland China (e.g., AWS Beijing) with NO data replication to outside servers.

24. **Real-Name Identity Verification** (Priority: High)
    - **Why**: CSL requirement for user accountability.
    - **Task**: Integrate with a verified SMS gateway or Government ID API for user registration in the China region.
