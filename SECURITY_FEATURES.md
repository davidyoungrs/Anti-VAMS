# Security Architecture & Enterprise Features

## Executive Summary
The GVS-VAMS (Valve Asset Management System) is engineered with a **Defense-in-Depth** security philosophy. It combines robust server-side enforcement (PostgreSQL Row Level Security) with client-side hardening (AES-256 Encryption), ensuring that critical asset data remains secure, tamper-proof, and accessible only to authorized personnel. This document outlines the security layers that classify GVS-VAMS as an enterprise-grade solution.

---

## 1. Authentication & Access Control (RBAC)
**Justification:** Enterprise environments require granular control over who can view and manipulate data.
*   **Role-Based Access Control (RBAC):** Strict separation between Admins (Full Access), Inspectors (Operational), and Clients (Scoped View-Only).
*   **Tenant Isolation:** Client access is dynamically filtered based on `allowedCustomers`, ensuring data segregation.

## 2. Database Security & Row Level Security (RLS)
**Justification:** Protects data at the engine level, preventing unauthorized access regardless of the interface used.
*   **RLS Enforcement:** Direct policies on PostgreSQL tables (`valve_records`, `valve_history`, `valve_inspections`) ensure users only interact with data they are authorized for.
*   **Least Privilege:** Core data operations are restricted to authenticated accounts with appropriate administrative roles.

## 3. Client-Side Encryption (Data-at-Rest)
**Justification:** Protects data on field devices (tablets/laptops) in the event of hardware loss or theft.
*   **AES-256 Encryption:** All sensitive records in the local cache (IndexedDB) are encrypted using AES-256 via CryptoJS before storage.
*   **Zero-Knowledge Storage:** Data remains encrypted in the browser's persistent storage; it is only decrypted in memory post-authentication.

## 4. NIST 800-171 / CMMC Compliance (AC-8)
**Justification:** Mandatory for defense-related contracts and high-security environments.
*   **System Use Notification:** A configurable "Consent to Monitor" banner (AC-8) is implemented as part of the login flow.
*   **Acceptance Logging:** User consent is recorded in the immutable audit log before access is granted.
*   **Status:** The banner is currently **Disabled** via system configuration but fully implemented and ready for activation.

## 5. Automated Security Scanning (RA-5)
**Justification:** Ensures the application remains secure against evolving threats.
*   **Integrated SAST/DAST:** The development pipeline includes Static Application Security Testing (SAST via ESLint + CodeQL) and Dynamic Application Security Testing (DAST via OWASP ZAP) to identify vulnerabilities before deployment.

## 6. Incident Response & Monitoring (ISO 27032)
**Justification:** Rapid containment and forensic integrity are critical during an active threat.
*   **Emergency Mode (Kill Switch):** A global read-only lock can be triggered to freeze all write operations system-wide.
*   **Forensic Time Assurance (NTP):** Authoritative server-side timestamping prevents client-side clock manipulation and ensures audit log admissibility.

## 7. Comprehensive Audit Logging (SIEM Ready)
**Justification:** ISO 27002 8.15 mandates logging for forensic and compliance purposes.
*   **Centralized Audit Trail:** Captures failed auth attempts, privileged access, and configuration changes.
*   **Extended Retention & Archival:** Automated "Cold Storage" logic offloads logs older than 365 days to S3/Glacier, ensuring long-term retention without impacting database performance.

## 8. Session Security & Inactivity (ISO 27002 8.17)
**Justification:** Reduces the risk of session hijacking on walk-away devices.
*   **10-Minute Timeout:** Automatically signs out idle users and clears sensitive data from browser memory.

---

## Conclusion
GVS-VAMS moves beyond basic password protection. By layering **Database RLS**, **AES-256 Encryption**, **Automated Scanning (RA-5)**, and **Monitoring Notifications (AC-8)**, it provides a hardened environment for critical infrastructure asset management.
