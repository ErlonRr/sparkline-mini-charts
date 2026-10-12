## What and why

<!-- What this pull request changes for users, and why. Link the issue it fixes. -->

## Breaking

<!--
Anything that breaks the public API (tags, attributes, properties, events and their
detail keys, parts, tokens, exports; see "Public API" in CONTRIBUTING.md).
In 1.x this must be "None": deprecate instead (see "Deprecation policy").
-->

None.

## Changed

<!-- Behaviour, defaults, types or docs that change without breaking the public API. -->

## Checklist

- [ ] A changeset is included (`pnpm changeset`, Keep a Changelog sections), or this pull request only touches the demo, tests or CI and needs none.
- [ ] `api/*.api.md` is updated (`pnpm build && pnpm api:update`) if the TypeScript surface changed, and the diff is explained above.
- [ ] Docs in `docs/components/` and `README.md` match the change (`pnpm lint:docs`).
- [ ] New or changed behaviour is covered by tests.
