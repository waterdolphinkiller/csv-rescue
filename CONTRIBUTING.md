# Contributing to CSV Rescue

Thank you for helping make CSV repair safer and easier for everyone!

## Development Setup

CSV Rescue has zero runtime dependencies and requires only **Node.js 18+**.

```bash
# Run all unit and integration tests
npm test

# Rebuild the self-contained browser app after editing packages/ or apps/web/src/
npm run build:web

# Run reproducible local performance benchmarks
npm run benchmark
```

## Design Principles

1. **Diagnose, never silently mutate:** Diagnostic engines must remain strictly read-only.
2. **Evidence before action:** Every new repair rule must return `affectedRows`, `affectedCells`, `removedRows`, and `samples` for preview.
3. **Quarantine ambiguity:** When multiple interpretations are plausible (e.g. `04/03/2026` or unquoted commas), send items to the Uncertainty Queue or require explicit user confirmation.
4. **Never submit real customer data:** All fixtures and bug reproduction CSVs must be anonymized or synthetically generated.
