# Security & Local-First Privacy Policy

## Local-First Guarantee

- CSV Rescue processes user-selected files exclusively in local browser memory or via the local Node.js CLI.
- Raw cell values are **never** transmitted to remote servers, analytics endpoints, or error trackers.
- Exported Repair Receipts omit raw cell values by default so audit logs can be shared safely.
- SHA-256 file hashes are used strictly for file integrity verification, not encryption or privacy anonymization.

## CSV Formula Injection

CSV Rescue scans for OWASP CSV Formula Injection prefixes (`=`, `+`, `-`, `@`) and offers optional text-protection escaping on export. Because spreadsheet software behavior varies across versions and save/re-open workflows, always verify high-risk files before sharing externally.

## Reporting a Vulnerability

Please open a private security advisory on GitHub or report issues without attaching real customer data or personally identifiable information (PII).
