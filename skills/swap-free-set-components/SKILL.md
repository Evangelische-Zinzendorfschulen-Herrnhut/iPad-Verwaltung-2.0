---
name: swap-free-set-components
description: Tausche aktuelle Komponenten zwischen iPad-Sets in der iPad-Verwaltung 2.0 anhand der Supabase-Live-Daten. Use when the user asks to swap or move iPad/Pencil/Tastatur/Adapter assignments between sets, restore inventory-number suffixes, or return components to their original set, especially when one or both sets are free. Enforces checks for issued sets, current component assignments, open person assignments, legacy inventory clues, and verification after writing.
---

# Swap Free Set Components

Use this skill for operational component swaps in Supabase.

## Rules

- Make all operational database changes exclusively in Supabase and verify them there. `db/iPad-Verwaltung.db` is a read-only historical reference; open it with `sqlite3 -readonly` or Python URI `mode=ro` and never change its data or schema. User-requested corrections target Supabase. If Supabase is unavailable, report the limitation instead of writing to SQLite; SQLite changes do not update the WebApp.
- Treat `inventory_set.legacy_set_id` as the user-facing set number.
- Treat `set_component_assignment.valid_until is null` as the current component assignment.
- Never infer current membership only from inventory-number suffixes; use suffixes only as a plausibility check.
- Do not alter an `ausgegeben` set or a set with an open `set_person_assignment` where `issued_at` is not null, unless the user explicitly confirms a return/correction workflow.
- It is allowed to take components from `frei` or `blockiert` sets to restore another set, if the user explicitly asks for the swap.
- When the target set is `zugeordnet` but not physically issued (`issued_at is null`), treat it as prepared/administrative assignment and allow the correction if the user explicitly requested it.
- End old component assignments by setting `valid_until` to the same timestamp used for the new assignments.
- Insert new `set_component_assignment` rows with `source = 'manual_assignment'`, the correct `role`, and `legacy_set_id` of the receiving set.
- After writing, verify both affected sets and report the current components.

## Workflow

1. Inspect both sets with `skills/check-ipad-set/scripts/inspect-set.mjs <set-number>`.
2. Identify the current component for the requested role in each set.
3. Check whether either set is physically issued:
   - `availability = ausgegeben`, or
   - open `set_person_assignment` with `issued_at` not null.
4. If a physically issued set is involved, stop and ask for confirmation.
5. If allowed, update Supabase in one deliberate write step:
   - close the active assignment for component A,
   - close the active assignment for component B,
   - insert component A into the other set,
   - insert component B into the first set.
6. Re-run the set inspections for both sets.
7. Summarize:
   - what was changed,
   - whether the inventory-number suffixes now match,
   - any remaining damage-case or legacy mismatch notes.

## Output

Keep the result concise and operational. Use German school terms:

- `Tastatur`
- `Pencil`
- `iPad`
- `Set`
- `zugeordnet`
- `frei`
- `ausgegeben`
