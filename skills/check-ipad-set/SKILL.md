---
name: check-ipad-set
description: Pruefe iPad-Sets in der iPad-Verwaltung 2.0 anhand der Supabase-Live-Daten. Use when the user asks to inspect a set number, find where set components are, verify whether iPad/Pencil/Tastatur/Adapter are assigned to another set, check condition/defect status, compare current set_component_assignment with legacy inventory numbers, inspect storage_label values, find open person assignments, assign free ok sets to students from a class/wagon-position rule, update the matching iPad in the MDM after assignment, or search related damage_case records for a set or its components.
---

# Check iPad Set

## Overview

Use this skill to answer operational questions about a school iPad set. Always prefer current assignment tables over legacy inventory-number suffixes.

## Core Rules

- Treat `inventory_set.legacy_set_id` as the user-facing set number.
- Treat `set_component_assignment` rows with `valid_until is null` as the current component membership.
- Do not infer current membership from `inventory_component.legacy_set_number` or inventory numbers like `E001085 / 0235`; use them only as legacy clues.
- If any required core component (`iPad`, `Pencil`, `Tastatur`) is missing from the current set assignment, automatically search `inventory_component.legacy_inventory_number` for the padded set suffix, for example ` / 0157`. Report matching components as candidates, including whether they are currently assigned to another set. Do not treat suffix matches as current membership unless `set_component_assignment.valid_until is null` assigns them to the set.
- Report `inventory_set.storage_label` and component-level `inventory_component.storage_label`; if both are null, say that no storage location is recorded.
- Check `set_person_assignment` rows with `returned_at is null` because a set can have contradictory imported state, such as `availability = frei` plus an open issue.
- For "defekt" questions, report both normalized `condition` and `legacy_status`.
- For damage questions, search by `damage_case.component_id`, `replacement_component_id`, `set_id`, and raw legacy text fields when useful.
- If a current set component appears as `damage_case.replacement_component_id`, explicitly warn that this likely represents a component swap recorded in a Schadensmeldung. Actively offer to make the component swap consistent in the database by updating current `set_component_assignment` rows and related set state, but do not write to Supabase unless the user confirms the correction.
- When offering one or more damage-swap corrections, include a terse confirmation phrase for each option in the form `<damage_number> ausführen`, for example `326 ausführen`, so the user can trigger the intended correction with minimal typing.
- When a component or set swap for a `damage_case` has been correctly written to the database, always mark that `damage_case.status` as `abgeschlossen` afterwards and verify it in the follow-up read.
- In every report, keep component-related rows in the fixed school workflow order: `iPad`, `Pencil`, `Tastatur`. Apply this order to the component table. For damage/swap rows, group them by component category with separate tables when more than one category is relevant; put `Pencil` before `Tastatur`, and sort rows within each category by `damage_number` ascending. Put other accessories after those three.
- Check `input/Lose Netzteile.xlsx` during every set inspection. If the workbook contains an `InvNr` matching the current iPad inventory number, warn that a loose power supply with the same inventory number is recorded. Include `User`, `Klasse`, and `Anmerkung` from that row when present. This belongs in the chat inspection report, not in the PDF return protocol.
- In the chat inspection report, put the loose-power-supply note last and make it visually prominent. Prefix it with an Ampel icon: `🟢` when a matching loose power supply entry was found, and `🔴` when no matching entry was found. If no matching row exists, still put a final highlighted note saying that no loose power supply entry was found for the current iPad inventory number.
- Do not write to Supabase unless the user explicitly asks for a correction and the current project rules allow it.
- For assignment commands like `Set 6-1 zuordnen`, use the currently inspected set unless the user names a set number explicitly. Only assign sets with `inventory_set.availability = frei`, `inventory_set.condition = ok`, all three required current components present and non-blocking, and no open `set_person_assignment`.
- For class/wagon assignment, parse the target class from the command (`6-1` means school class label `06-1` when the stored label is zero-padded). Read the set `storage_label`; the wagon place is the number after the hyphen, for example `W4 - 10` means place `10`.
- Sort active students in the class by `person.first_name` using German collation, then by `person.last_name`. The wagon place maps to the same 1-based position in that complete sorted class list. The selected student must not already have an open `set_person_assignment`; if they do, stop and report the conflict instead of selecting the next free student.
- For assignment dry-runs, state the selected student and the evidence: set status, storage label/place, class label, sorted class position, and whether the student has no open set.
- When the user explicitly confirms execution, create a prepared issue by inserting `set_person_assignment` with `issued_at = null`, `legacy_status = prepared_issue`, a new negative `legacy_assignment_id`, `legacy_user_id`, `person_id`, and `set_id`. Then update `inventory_set.assigned_person_id`, `availability = zugeordnet`, `legacy_user_id`, and a concise note. Preserve the existing set `storage_label` unless the user explicitly asks to change it.
- After writing an assignment, always verify by re-reading the set and open assignment. Report the inserted assignment id, resulting availability, assigned person, and storage label.
- After a successful prepared set assignment, offer or perform the MDM follow-up when the user asks for browser/MDM work: open the assigned iPad in Relution/MDM, set the MDM `Gerätebeschreibung` to the current iPad inventory number, and assign the MDM user to the same person as the prepared issue.

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
5. Compare the current iPad inventory number with `input/Lose Netzteile.xlsx` column `InvNr`. If it matches, add an anomaly note for the loose `Netzteil` with the recorded person/class/comment context. Prefix the note with `🟢`. If there is no match, prefix the note with `🔴`. Keep this note for the chat output only, never by editing or regenerating the PDF return protocol.
6. Compare legacy components with current assignments. Highlight components that exist for the legacy set number but are not currently assigned.
7. When required components are missing, inspect `suffixComponentSearch` from the script output and list any candidates found by inventory-number suffix, including current assignment to another set or "nicht aktuell zugeordnet".
8. Answer the user's concrete question first, then add relevant anomalies.
9. For damage cases, distinguish:
   - direct cases where the component is affected,
   - cases where the component was used as replacement,
   - set-level cases,
   - raw-text legacy matches.

## Class/Wagon Assignment Workflow

Use this workflow when the user says something like `Set 6-1 zuordnen` while a set is already in context, or when they explicitly name both a set and a class.

1. Inspect the set first and confirm it is assignable:
   - `availability = frei`
   - `condition = ok`
   - current `iPad`, `Pencil`, and `Tastatur` assignments exist
   - no required component has `condition` in `defekt` or `gesperrt_kein_mdm`
   - no open `set_person_assignment` exists for the set
2. Parse the set storage label as the wagon position. `W4 - 10`, `W4-10`, and similar labels map to place `10`.
3. Normalize the requested class label to the stored school class. For lower and middle school classes, try the zero-padded form first, e.g. `6-1` -> `06-1`.
4. Query current `person_class_assignment` rows for that class with `valid_until is null`, joined to active `person` rows where `person_type = schueler`.
5. Sort by first name, then last name, using German collation.
6. Select the student at the 1-based wagon place in the full sorted class list. Do not re-count only unassigned students.
7. Check whether the selected student already has an open set assignment:
   - If yes, stop and report the existing set conflict.
   - If no, for a dry-run report the student as the intended target.
8. Only when the user explicitly asks to execute, write the prepared assignment and verify it.

## MDM Follow-Up After Assignment

Use this workflow when the user asks to update the MDM after a set has been assigned, or when they ask for the assignment workflow to include the MDM step.

1. Re-read the set after assignment and identify:
   - current `iPad` component from `set_component_assignment.valid_until is null`
   - iPad `legacy_inventory_number`, e.g. `E000341 / 0191`
   - iPad `serial_number`, used to verify the MDM page
   - assigned person name and email from `inventory_set.assigned_person_id` or the open `set_person_assignment`
2. Open or use the Relution/MDM device page for that iPad. Verify the visible serial number on the MDM page matches the current iPad component before editing. If it does not match, stop and report the mismatch.
3. In the `Informationen` tab, set `Gerätebeschreibung` to the current iPad inventory number exactly as stored, including spaces around `/`.
   - The `Gerätebeschreibung` edit button may only appear on hover.
   - Move the mouse over the row first, then far to the right edge of the same row to reveal the `Bearbeiten` icon.
   - Click `Bearbeiten`, fill the textarea, and click `Speichern`.
4. In the `Informationen` tab, assign the correct MDM user:
   - Use the top action `Benutzer ändern`.
   - Prefer `EZSH-LDAP` as the search source for school users.
   - Search by the assigned person's email first.
   - Select the exact matching row and click `Bestätigen`.
5. Verify in the MDM `Informationen` tab that:
   - `Gerätebeschreibung` shows the iPad inventory number.
   - `Benutzer` shows the assigned person.
6. In the final report, explicitly state both MDM values that were verified. If either UI update cannot be completed, report which one succeeded and where the workflow stopped.

## Output Style

Be concise and operational. Use German school terms from the project:

- `Tastatur` for keyboard case
- `Lagerort` for storage
- `Schadensmeldung` for damage case
- `zugeordnet` for assignment

For full set inspections, structure the report in this order:

1. **Set**: show status/availability, condition, storage location, and current person assignment. Prefer a compact table.
2. **Komponenten**: list `iPad`, `Pencil`, and `Tastatur` with inventory number, model when known, normalized condition, legacy status, and current assignment/set. Keep inventory numbers visually on one line in Markdown by putting them in code formatting.
3. **Schäden und Tauschvorgänge**: split damage/swap cases into separate component-category tables when more than one category is relevant. Use the category headings as German school terms, for example **Pencil** first and then **Tastatur**. Within each category table, sort rows by `Schaden`/`damage_number` ascending. Use compact tables with these columns: `Schaden`, `Status`, `Bezug`, `Alt/defekt`, `Neu/Ersatz`, `Ergebnis`. Make component swaps explicit as `old component -> replacement component`; put each inventory number in its own code span so it does not wrap awkwardly. Include set-level cases and cases where a current or legacy component appears either as `component_id` or `replacement_component_id`.
4. **Anmerkungen und Auffälligkeiten**: list contradictions, missing components, legacy/current mismatches, suffix-search candidates for missing components, open person assignments, storage gaps, and recommended next checks.
5. **Hervorgehobene Anmerkung lose Netzteile**: always put this as the final section of the chat report. State either the matching loose `Netzteil` entry with `User`, `Klasse`, and `Anmerkung`, or explicitly state that no entry was found for the current iPad inventory number.

For narrow questions, answer the concrete question first, then include only the relevant parts of this structure.

When data conflicts, state the conflict plainly instead of guessing. Example: "Set 235 steht als `frei`, hat aber eine offene Ausgabe an Margarethe Haupt."
