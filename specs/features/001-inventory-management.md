# Feature: Inventarverwaltung

## Status

draft

## Problem

Die Schule braucht eine verlaessliche Uebersicht ueber alle Komponenten eines iPad-Sets: iPad, Pencil und Tastatur. Dazu gehoeren Seriennummern oder Inventarnummern, Status, Standort, Set-Zuordnung und Historie.

## Zielgruppe

- IT
- iPad-Verwaltung
- Schulleitung lesend

## Hauptworkflow

1. Nutzer sucht oder scannt eine Komponente.
2. System zeigt Stammdaten, aktuellen Status und Verlauf.
3. Berechtigte Nutzer koennen technische oder organisatorische Daten aktualisieren.
4. Kritische Aenderungen werden auditierbar gespeichert.

## Workflow: Set auftrennen und vervollstaendigen

1. Nutzer oeffnet ein freies oder blockiertes Set.
2. Nutzer entnimmt eine Komponente aus dem Set.
3. System beendet die bisherige Set-Komponenten-Zuordnung historisiert.
4. Nutzer ordnet die Komponente einem anderen Set zu.
5. System kann passende Komponenten aus freien oder blockierten Sets vorschlagen und zeigt Lagerorte.
6. System prueft, ob Zielslot frei ist und die Komponente nicht bereits aktiv zugeordnet ist.
7. System aktualisiert Set-Zustand und Set-Verfuegbarkeit.
8. System schreibt Audit-Logs.

## Datenobjekte

- Komponente
- Set
- AuditLog
- Reparatur
- Schadensfall

## Akzeptanzkriterien

- Eine Komponente kann ueber Inventarnummer oder Seriennummer gefunden werden.
- Der aktuelle Status ist eindeutig sichtbar.
- Statusaenderungen werden mit Nutzer und Zeitpunkt protokolliert.
- Nicht berechtigte Rollen koennen Komponentendaten nicht bearbeiten.
- Freie und blockierte Sets koennen aufgetrennt werden.
- Ausgegebene Sets koennen nicht ohne Ruecknahme aufgetrennt werden.
- Komponenten-Neuzuordnungen bleiben historisch nachvollziehbar.
- Fuer freie und blockierte Sets ist ein Lagerort dokumentierbar.
- Start-Lagerorte sind W1 bis W6 mit je 30 Plätzen sowie Schrank1, Schrank2 und Regal1.
- Bei W1 bis W6 soll der konkrete Platz 1-30 dokumentiert werden.
- Sets koennen einer Person zugeordnet sein und trotzdem physisch im Lager oder Wagen liegen, insbesondere bei Schuelern der 5. und 6. Klassen.
- Wagenplaetze sollen vorrangig komplette Sets enthalten.

## Offene Fragen

- Gibt es Barcodes oder QR-Codes auf den Komponenten oder Sets?
- Welche MDM-Daten sollen angezeigt oder synchronisiert werden?
- Werden Pencil und Tastatur einzeln inventarisiert?
