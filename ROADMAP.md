# Strategic Development Roadmap

This document outlines the development path for the GVR-VAMS. Completed items have been archived to reflect current and future priorities.

## Phase 1: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

1. **Predictive Analytics (Future)** (Status: **Planned**)
   - **Task**: Trend analysis for "Mean Time Between Failure" (MTBF) calculations.
   - **Note**: Needs OREDA standardized fields (Cause) to be fully effective.

2. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

## Phase 2: Experimental / High Complexity

3. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Integrate a cloud AI service (e.g., AWS Textract / Google Document AI) for structured data extraction.

---

## Phase 3: Security updates and Compliance
*Mandatory controls for international and government operations.*

4. **Multi-Factor Authentication (MFA)** (Priority: Critical for Admins)
   - **Standard**: ISO 27002 9.4.3 & 24.1.
   - **Task**: Enforce MFA (TOTP) for 'Admin' and 'Inspector' roles.

5. **Software Supply Chain Security (SCA)** (Priority: High)
   - **Standard**: ISO 27032 / SBOM requirements.
   - **Task**: Integrate automated dependency auditing and provide a Software Bill of Materials (SBOM).

6. **FIPS 140-2 Cryptography Review (SC-13)** (Priority: High)
   - **Task**: Plan migration from CryptoJS to Web Crypto API (browser-native, FIPS-compliant on host OS).

7. **Media Sanitization & Destruction (MP-6)** (Priority: Medium)
   - **Task**: Implement "Crypto-shredding" for hard deletes to ensure data is unrecoverable.

8. **Data Residency & Localization (GCC/Middle East)** (Priority: Critical)
   - **Standard**: Saudi NCA ECC / UAE NESA.
   - **Task**: Architect Supabase deployment for "Region Pinning" (e.g., AWS Bahrain/UAE) or On-Premise capability.

9. **SM Series Cryptography (MLPS 2.0 / China Mode)** (Priority: High)
   - **Task**: Alternative crypto stack using SM4-CBC and SM2 for sovereign algorithm compliance.

---

## Technical Recommendations
- **Mobile First**: Ensure all new features work seamlessly on tablets and rugged field devices.
- **Offline Sync**: Maintain the "Encryption-First" sync logic for all new data structures.
- **Zero Trust**: All future database tables must use Row Level Security (RLS) by default.
