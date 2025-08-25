PRD Continuation - Aug 26, 2025

This file continues the product requirements and next steps after the recent backend changes.

Decisions made:
- Added JWT middleware (not yet enforced on admin/debug endpoints).
- Persisted `csvShippingFeeIncluded` column and added migration.
- Implemented backup-before-reset logic and created repository backup branch.

Next actions:
1. Run full end-to-end CSV import tests and wallet reconciliation.
2. Create TestSprite instructions and run smoke tests.
3. Decide on admin/debug protection and implement JWT enforcement if needed.
4. Remove plaintext API keys from repo and rotate secrets.

Acceptance criteria:
- CSV bulk import persists `csvShippingFeeIncluded` correctly.
- No regressions in financial calculations or printing labels.
- Admin reset endpoints are either secured or documented for internal use only.
