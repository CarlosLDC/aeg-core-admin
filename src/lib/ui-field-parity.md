# UI Field Parity (Modal -> View)

This file documents how to maintain the parity contract defined in
`src/lib/ui-field-parity.ts`.

## Goal

If a user captures data in a create/edit modal, that data must be visible later
in the resource detail page.

The automated guard lives in `src/lib/ui-field-parity.test.ts`.

## How the contract works

Each resource in `RESOURCE_FIELD_PARITY_SPECS` defines:

- `formPath`: modal/form file path (or array of paths if the form is composed).
- `viewPath`: detail view file path.
- `fields`: list of required parity checks.

Each field supports:

- `formLabels`: labels expected in form code.
- `viewLabels`: labels expected in view code.
- `formBindings` (optional): property usage tokens expected in form code.
- `viewBindings` (optional): property usage tokens expected in view code.

Parity test passes only if required labels and bindings are present.

## When to update the matrix

Update `ui-field-parity.ts` whenever you:

- add a new resource modal + detail page,
- add or remove user-editable fields in an existing modal,
- rename labels in form/view,
- move field rendering into composed components.

## Recommended checklist for new fields

1. Add field entry under the corresponding resource.
2. Set `formLabels` and `viewLabels` with stable user-facing text.
3. Add `formBindings` and `viewBindings` with actual data access tokens.
4. Run:
   - `npm test -- --run`
   - `npm run typecheck`

## Notes

- Prefer stable tokens in bindings (for example `form.phone`, `branch.phone`).
- For fallback chains in views, provide multiple `viewBindings`.
- Avoid overfitting to fragile formatting; use semantic tokens that survive
  small refactors.
