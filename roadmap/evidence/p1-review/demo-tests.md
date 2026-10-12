# P1 review — demo & tests (reviewer 3) — no high/medium; all P1-18/19 criteria met, reverse-checks fail as expected
1. LOW demo/app.js:1172-1182 (+renderThemingLab 1145-1153): Default -> nudge slider writes stale preset colors (state "custom" applies all 5 controls). Fix: on Default reset controls to library defaults or write only the changed token.
2. LOW demo/app.js:1056 LIVE/PAUSED badge hardcoded English (nit, i18n out of scope — translate via existing dict if trivial).
3. LOW test/contract/lifecycle.test.js:22-42 leftover todo()/knownFailures/LIFECYCLE_STRICT scaffolding -> remove (or fail when table non-empty).
4. LOW test/contract/meters.test.js:73-75 can pass with zero rings -> assert ring count. transitions.test.js:64 add a case that catches reverted guard alone.
5. LOW playwright.config.ts:30 reuseExistingServer on port 4173 (= pnpm preview default) -> dedicated port or reuse false.
6. LOW test/e2e/demo-a11y.spec.ts:160-162 theoretical race goto + resetDataWrites -> wait for hashchange/route before reset.
Also: CHANGELOG.md:178 [1.3.1] link compare/v1.3.0...v1.4.0 wrong.
