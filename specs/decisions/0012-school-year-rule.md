# ADR 0012: Schuljahr per Stichtag bestimmen

## Status

accepted

## Kontext

Das Schuljahr laeuft ueber zwei Kalenderjahre. Beispiel: Das aktuelle Schuljahr `2025/26` startet am 01.08.2025 und endet am 31.07.2026.

## Entscheidung

Das aktuelle Schuljahr wird automatisch anhand des Datums bestimmt.

Regel:

- 01.08. bis 31.12.: Schuljahr beginnt im aktuellen Kalenderjahr.
- 01.01. bis 31.07.: Schuljahr begann im vorherigen Kalenderjahr.

Beispiele:

- 22.06.2026 -> `2025/26`
- 01.08.2026 -> `2026/27`
- 31.07.2027 -> `2026/27`

## Konsequenzen

- Schuljahr muss nicht manuell fuer den Normalfall gesetzt werden.
- Historische Daten koennen weiterhin ein explizites Schuljahr speichern.
- Klassenstufe kann aus Schueler-Jahrgang und Schuljahr vorgeschlagen werden.
- Das kommende Schuljahr kann vor dem 01.08. vorbereitet werden.
- Vorbereitete Zuordnungen werden erst durch Aktivierung wirksam.
- Ein vorbereitetes Schuljahr wird automatisch am 01.08. aktiviert.
- `admin` kann die Aktivierung manuell anstossen.
- Aktivierungen werden auditierbar protokolliert.
