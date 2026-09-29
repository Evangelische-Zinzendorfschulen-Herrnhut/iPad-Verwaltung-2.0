---
name: inventarnummer-ins-mdm
description: Trage iPad-Inventarnummern in Relution/MDM ein. Use when the user says "Setze InvNr für Set xxx im MDM", asks to set an Auto-Einschreibung Gerätename from a set inventory number, or asks to fill/repair the MDM field "Gerätebeschreibung" from iPad-Verwaltung set data.
---

# Inventarnummer ins MDM

Use this skill for the operational workflow "Inventarnummer aus der iPad-Verwaltung in Relution/MDM übernehmen".

## Triggers

- `Setze InvNr für Set xxx im MDM`
- `Setze Inventarnummer für Set xxx im MDM`
- Requests to set the Relution Auto-Einschreibung `Gerätename` to the current iPad inventory number of a set.
- Requests to fill or repair the Relution device `Gerätebeschreibung` from iPad-Verwaltung data.

## Scope

- For the trigger `Setze InvNr für Set xxx im MDM`, the MDM target field is `Gerätename` on the Relution Auto-Einschreibung inventory record.
- For older device-inventory repair requests, the MDM target field is `Gerätebeschreibung` on a Relution device.
- The source value is the current iPad component's `legacy_inventory_number` from the iPad-Verwaltung, for example `E001575 / 0613`.
- The person comes from the MDM list column `Benutzer` or a named user request.
- The MDM device must be verified by visible serial number before editing.
- Do not infer the current iPad only from an inventory-number suffix; use the iPad-Verwaltung's current set/component assignment.

## Data Sources

Prefer the strongest available source in this order:

1. The iPad-Verwaltung UI row, especially the `iPad` column and its MDM link.
2. Supabase live data used by the iPad-Verwaltung:
   - `person`
   - open `set_person_assignment` rows with `returned_at is null`
   - current `set_component_assignment` rows with `valid_until is null`
   - joined `inventory_component` where role is `ipad`
3. The MDM device-group or inventory list for target device links and serial-number verification.

When using Supabase, read `.env.local` from the project root and use `NEXT_PUBLIC_SUPABASE_URL` plus `SUPABASE_SECRET_KEY`. Treat Supabase reads as read-only unless the user explicitly asks for a database correction.

## Auto-Einschreibung Gerätename Workflow

Use this workflow for `Setze InvNr für Set xxx im MDM`.

1. Parse the set number from the request, e.g. `Set 151`.
2. Read the current set from Supabase, preferably with:
   ```bash
   node skills/check-ipad-set/scripts/inspect-set.mjs 151
   ```
   If sandbox DNS/network blocks Supabase, retry the same read-only command with network permission.
3. From `currentComponents`, select the row where `role = ipad` and record:
   - `component.legacy_inventory_number`, the value to write as `Gerätename`
   - `component.serial_number`, the value used to find and verify the Auto-Einschreibung
   - current set number and set status for the final report
4. Open Relution `Geräte > Auto-Einschreibungen`.
   - Do not depend on an already open Relution tab. If none is open, create a visible browser tab directly at:
     `https://mdm.evssn.de/#/devices/auto-enrollments/inventory?tenantOrganizationUuid=95F24D00-175F-4821-A47C-53AFBDD9CFF2`
   - Wait until the page heading `Auto-Einschreibungen` and its search field are visible before continuing.
5. Search the Auto-Einschreibungen list by the exact iPad serial number.
   - If the search chip appears but the table is not filtered, click `Aktualisieren`.
   - Trust the table only when a visible row contains the exact serial number.
6. Open the matching row through its name link or `Details anzeigen`.
7. Verify the edit form shows the exact expected serial number.
8. In the same form, fill only `Gerätename` with the iPad inventory number exactly as stored, preserving spaces around `/`.
   - Do not change `Beschreibung`, `Benutzer`, `Profil`, device groups, ownership, Lost Mode, or DEP account.
   - Leave `Standard-Gerätename aus dem DEP-Profil verwenden` unchanged unless the user explicitly instructs otherwise.
9. Click `Speichern`.
10. Verify that the page title/heading and the `Gerätename` field now show the inventory number and that the serial number is still the expected one.
11. Report the set number, serial number, old visible MDM name when observed, and the written inventory number.

Tested example:

```text
Set 151:
- Supabase iPad serial number: DMPF47MHQ1GC
- Supabase inventory number: E000301 / 0151
- Relution Auto-Einschreibung row found by serial number; old Gerätename: Matthea Frühwald
- New Gerätename verified: E000301 / 0151
```

## Gerätebeschreibung Workflow

1. In the MDM list, identify rows where `Gerätebeschreibung` does not contain an inventory number pattern like `E001575 / 0613` or `01564 / 0602`.
2. For each row, record:
   - `Gerätename`
   - `Benutzername`
   - `Benutzer`
   - current `Gerätebeschreibung`
   - visible serial number
   - detail link for the MDM device
3. Find the matching person in the iPad-Verwaltung.
4. Find the person's current set:
   - use the open `set_person_assignment` where `returned_at is null`
   - read current components from `set_component_assignment.valid_until is null`
   - select the component with role `ipad`
5. Verify that the iPad component serial number matches the MDM device serial number.
   - If the serial number is missing in one source, use the iPad-Verwaltung MDM link plus the visible MDM person/name as supporting evidence.
   - If serial numbers conflict, stop for that row and report the mismatch.
6. Open the MDM device detail page.
7. Verify the `Informationen` page shows the expected person and serial number.
8. Open the edit form for that same device:
   - Relution commonly uses `/devices/inventory/<device-id>/edit?...`.
   - If direct URL navigation falls back to a list, return to the original MDM list and click the visible row's device/detail link instead.
9. In the edit form, fill `Gerätebeschreibung` with the iPad inventory number exactly as stored, preserving spaces around `/`.
10. Click `Speichern`.
11. Verify on the device `Informationen` page that `Gerätebeschreibung` now shows the inventory number.
12. After all rows are processed, return to the original MDM list and verify that no target row remains without an inventory number.

## Relution Notes

- Relution sometimes keeps old search chips even when the URL query changes. If the inventory search displays the wrong result, clear the visible search chip or return to the device-group list and click the row link directly.
- In Auto-Einschreibungen, the global search may create a chip without immediately filtering the table. Click `Aktualisieren` and verify the result count/visible rows before opening a record.
- A direct absolute URL to `/information` can occasionally redirect to the device-group overview. Clicking the visible row link is more reliable.
- The edit form may show `Geräteinformationen aktualisieren`; the field order is usually `Gerätename` followed by `Gerätebeschreibung` as a textarea.
- Do not click destructive or unrelated device actions such as `Löschen`, `Gerät vollständig sperren`, or `Nachricht senden` while doing this workflow.

## Verification Report

Report concisely in German:

- which people/devices were updated,
- the inventory number written for each,
- any skipped rows and the reason,
- the final count or statement that no MDM rows remain without an inventory number.

Example:

```text
Erledigt. Aktualisiert:
- Joana Wappler: E001575 / 0613
- Tim Ufer: E001573 / 0611

Abschlussprüfung: In der MDM-Gruppenliste bleibt keine Zeile ohne Inventarnummer in der Gerätebeschreibung.
```
