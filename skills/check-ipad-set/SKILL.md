---
name: check-ipad-set
description: Pruefe iPad-Sets in der iPad-Verwaltung 2.0 anhand der Supabase-Live-Daten. Use when the user asks to inspect a set number, find where set components are, verify whether iPad/Pencil/Tastatur/Adapter are assigned to another set, check condition/defect status, compare current set_component_assignment with legacy inventory numbers, inspect storage_label values, find open person assignments, or search related damage_case records for a set or its components.
---

# Check iPad Set

## Overview

Use this skill to answer operational questions about a school iPad set. Always prefer current assignment tables over legacy inventory-number suffixes.

## Core Rules

- Treat `inventory_set.legacy_set_id` as the user-facing set number.
- Treat `set_component_assignment` rows with `valid_until is null` as the current component membership.
- Do not infer current membership from `inventory_component.legacy_set_number` or inventory numbers like `E001085 / 0235`; use them only as legacy clues.
- Report `inventory_set.storage_label` and component-level `inventory_component.storage_label`; if both are null, say that no storage location is recorded.
- Check `set_person_assignment` rows with `returned_at is null` because a set can have contradictory imported state, such as `availability = frei` plus an open issue.
- For "defekt" questions, report both normalized `condition` and `legacy_status`.
- For damage questions, search by `damage_case.component_id`, `replacement_component_id`, `set_id`, and raw legacy text fields when useful.
- If a current set component appears as `damage_case.replacement_component_id`, explicitly warn that this likely represents a component swap recorded in a Schadensmeldung. Actively offer to make the component swap consistent in the database by updating current `set_component_assignment` rows and related set state, but do not write to Supabase unless the user confirms the correction.
- Check `input/Lose Netzteile.xlsx` during every set inspection. If the workbook contains an `InvNr` matching the current iPad inventory number, warn that a loose power supply with the same inventory number is recorded. Include `User`, `Klasse`, and `Anmerkung` from that row when present.
- Do not write to Supabase unless the user explicitly asks for a correction and the current project rules allow it.

## Quick Start

From the repository root, run the bundled read-only script:

```bash
node skills/check-ipad-set/scripts/inspect-set.mjs 235
```

The script reads `.env.local` in the current project directory and expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

If network/DNS is blocked by sandboxing, retry the same command with escalated network permission and explain that it is read-only.

## Workflow

1. Identify the requested set number and run `inspect-set.mjs <set-number>`.
2. Open the in-app browser to the local set list (`http://localhost:3000/sets`) when available, then filter the list by the requested set number so the user can see the same set in the UI. If the dev server is not running or browser control is unavailable, continue with the Supabase result and mention the UI filter could not be opened.
3. Summarize the set state: availability, condition, set storage, assigned person, and any open issue.
4. List current components by role with inventory number, condition, legacy status, and storage.
5. Compare the current iPad inventory number with `input/Lose Netzteile.xlsx` column `InvNr`. If it matches, add an anomaly note for the loose `Netzteil` with the recorded person/class/comment context.
6. Compare legacy components with current assignments. Highlight components that exist for the legacy set number but are not currently assigned.
7. Answer the user's concrete question first, then add relevant anomalies.
8. For damage cases, distinguish:
   - direct cases where the component is affected,
   - cases where the component was used as replacement,
   - set-level cases,
   - raw-text legacy matches.

## Output Style

Be concise and operational. Use German school terms from the project:

- `Tastatur` for keyboard case
- `Lagerort` for storage
- `Schadensmeldung` for damage case
- `zugeordnet` for assignment

For full set inspections, structure the report in this order:

1. **Set**: show status/availability, condition, storage location, and current person assignment. Prefer a compact table.
2. **Komponenten**: list `iPad`, `Pencil`, and `Tastatur` with inventory number, model when known, normalized condition, legacy status, and current assignment/set. Keep inventory numbers visually on one line in Markdown by putting them in code formatting.
3. **Schäden und Tauschvorgänge**: use a compact table with these columns: `Schaden`, `Status`, `Bezug`, `Alt/defekt`, `Neu/Ersatz`, `Ergebnis`. Make component swaps explicit as `old component -> replacement component`; put each inventory number in its own code span so it does not wrap awkwardly. Include set-level cases and cases where a current or legacy component appears either as `component_id` or `replacement_component_id`.
4. **Anmerkungen und Auffälligkeiten**: list contradictions, missing components, legacy/current mismatches, open person assignments, storage gaps, loose power supply matches, and recommended next checks.

For narrow questions, answer the concrete question first, then include only the relevant parts of this structure.

When data conflicts, state the conflict plainly instead of guessing. Example: "Set 235 steht als `frei`, hat aber eine offene Ausgabe an Margarethe Haupt."
