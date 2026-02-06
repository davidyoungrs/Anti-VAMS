# Strategic Development Roadmap

This document outlines the proposed development path for the GVR-VAMS.


## Phase 2: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

1. **Analytics & Predictive Maintenance** (Status: **In Progress**)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis.
   - **New**: Added **WIP Status Tracking** (Real-time dashboard of valve workflow stages).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

2. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

## Phase 3: Experimental / High Complexity

3. **Full Datasheet OCR Import**
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


## ISO/IEC 27001/27002 ISMS Controls
*Core information security controls for enterprise certification.*

4. **Multi-Factor Authentication (MFA)** (Priority: Critical for Admins)
   - **Why**: ISO 27002 9.4.3 (Password Management) & 24.1 (MFA). Brute force protection.
   - **Task**: Enable and enforce MFA (TOTP) for all 'Admin' and 'Inspector' roles.

## ISO/IEC 27032 Cybersecurity Guidelines
*Focus on Cyberspace Security, supply chain, and external attack surface.*

5. **Software Supply Chain Security (SCA)** (Priority: High)
    - **Why**: ISO 27032 demand for secure application controls & supply chain trust.
    - **Task**: Integrate automated dependency auditing (e.g., `npm audit`, Snyk, or Dependabot) into the CI/CD pipeline. Requires a visible "Bill of Materials" (SBOM).

## US Federal & Defense Compliance (NIST 800-53 / CMMC)
*Strict controls for systems handling CUI (Controlled Unclassified Information).*

6. **System Use Notification Banner (AC-8)** (Priority: High for DoD)
    - **Why**: Mandatory requirement for CMMC/NIST to warn users they are accessing a monitored system.
    - **Task**: Implement a configurable "Consent to Monitor" banner on the Login screen that users must accept before signing in.

7. **FIPS 140-2 Cryptography Review (SC-13)** (Priority: High)
    - **Why**: Federal systems often require FIPS-validated crypto modules.
    - **Task**: Review `CryptoJS` usage. Plan potential migration to Web Crypto API (browser native, often FIPS compliant on Windows/macOS) or server-side KMS for sensitive data at rest.

8. **Media Sanitization & Destruction (MP-6)** (Priority: Medium)
    - **Why**: CMMC requires assurance that deleted data is unrecoverable.
    - **Task**: Upgrade "Delete" features to overwrite data segments (crypto-shredding) rather than just removing pointers.

## Continuous Monitoring & Resilience (NIST/CMMC Advanced)
*Automated controls to maintain compliance posture over time.*

9. **Automated Vulnerability Scanning (RA-5)** (Priority: Medium)
    - **Why**: NIST requires detection of vulnerabilities in a timely manner.
    - **Task**: Integrate SAST (Static Analysis) and DAST (Dynamic Scanning) tools into the deployment pipeline to catch flaws before production.

10. **Disaster Recovery (DR) Drill Mode (CP-4)** (Priority: Low)
    - **Why**: Recoverability must be tested, not just assumed.
    - **Task**: Create scripts to simulate a "Region Down" or "Data Loss" event and measure RTO (Recovery Time Objective) for restoring from encrypted backups.

## Middle East Regional Compliance (UAE/KSA/Qatar)
*Specific modifications for GCC cybersecurity frameworks (NESA, NCA, QCB).*

11. **Data Residency & Localization Strategy** (Priority: Critical for GCC)
    - **Why**: Saudi NCA ECC (2-1-3) and UAE NESA require restricted data geolocations.
    - **Task**: Architect Supabase deployment to support "Region Pinning" (e.g., ensuring data stored in AWS Middle East/Bahrain/UAE regions only) or On-Premise capability.

12. **Extended Log Retention Archival** (Priority: Medium)
    - **Why**: NCA ECC & QCB often require audit logs to be retained for 12 months minimum.
    - **Task**: Implement automated "Cold Storage" offloading of logs to low-cost archival (S3 Glacier) to meet retention mandates without database bloat.


## China Cybersecurity Law & MLPS 2.0 Compliance
*Strict national controls for operations within mainland China (GB/T Standards).*

13. **SM Series Cryptography (SM2/SM3/SM4)** (Priority: Critical for China)
    - **Why**: MLPS 2.0 / State Cryptography Administration (SCA) mandate use of Chinese sovereign algorithms (SMx) over RSA/AES/SHA.
    - **Task**: Implement a toggleable "China Mode" that swaps `CryptoJS` AES-256 for **SM4-CBC** (Data at Rest) and uses **SM2** for identity verification.

14. **Strict Data Localization (Data Sovereignty)** (Priority: Critical)
    - **Why**: China Cybersecurity Law (CSL) prohibits cross-border transfer of Critical Infrastructure data.
    - **Task**: Ensure a fully isolated Supabase region within mainland China (e.g., AWS Beijing) with NO data replication to outside servers.

15. **Real-Name Identity Verification** (Priority: High)
    - **Why**: CSL requirement for user accountability.
    - **Task**: Integrate with a verified SMS gateway or Government ID API for user registration in the China region.

## ISO/IEC 27701 Privacy & Compliance (PIMS)
*Critical features for Regulatory Compliance and Data Privacy.*

16. **Data Subject Rights Management** (Priority: High)
   - **Why**: ISO 27701 / GDPR requirement for PII management.
   - **Task**: Implement "Right to Erasure" (Hard Delete) and "Right to Access" (Data Portability) tools for PII.
   - **Note**: Current "Soft Delete" is insufficient for "Right to be Forgotten" requests.

17. **Privacy Impact Assessment (PIA) Workflow** (Priority: Medium)
   - **Why**: Security by Design.
   - **Task**: Checklist integration for new deployments to verify privacy risks are mitigated.

