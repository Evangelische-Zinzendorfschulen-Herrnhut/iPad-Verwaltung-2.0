# Feature: Inventarverwaltung

## Status

draft

## Problem

Die Schule braucht eine verlaessliche Uebersicht ueber alle Komponenten eines iPad-Sets: iPad, Pencil und Tastatur. Dazu gehoeren Seriennummern oder Inventarnummern, Anschaffungsdatum, Status, Standort, Set-Zuordnung und Historie.

## Zielgruppe

- IT
- iPad-Verwaltung
- Schulleitung lesend

## Hauptworkflow

1. Nutzer sucht oder scannt eine Komponente.
2. System zeigt Stammdaten, aktuellen Status und Verlauf.
3. Berechtigte Nutzer koennen technische oder organisatorische Daten aktualisieren.
4. Kritische Aenderungen werden auditierbar gespeichert.

## Workflow: Komponenten-Lagerort pflegen

1. Nutzer filtert oder sucht eine Komponente in der Geraeteliste.
2. Nutzer oeffnet `Lagerort` fuer die einzelne Komponente.
3. System zeigt den Komponenten-Lagerort und, falls vorhanden, den Lagerort des aktuell zugeordneten Sets.
4. Nutzer setzt oder leert den Komponenten-Lagerort.
5. System speichert den Lagerort an der Komponente, unabhaengig vom Lagerort des Sets.

## Workflow: Set auftrennen und vervollstaendigen

1. Nutzer oeffnet ein freies oder blockiertes Set.
2. Nutzer entnimmt eine Komponente aus dem Set.
3. System beendet die bisherige Set-Komponenten-Zuordnung historisiert.
4. Nutzer ordnet die Komponente einem anderen Set zu.
5. System kann passende Komponenten aus freien oder blockierten Sets vorschlagen und zeigt Lagerorte.
6. System prueft, ob Zielslot frei ist und die Komponente nicht bereits aktiv zugeordnet ist.
7. System aktualisiert Set-Zustand und Set-Verfuegbarkeit.
8. System schreibt Audit-Logs.

## Workflow: Lagerliste anzeigen

1. Nutzer oeffnet die zusaetzliche Lagerliste aus der Set-Liste.
2. System zeigt als Default alle Sets, deren Set-Lagerort mit `W1` beginnt.
3. Nutzer kann den Lagerort per Dropdown auf W1 bis W6, Schrank1, Schrank2, Regal1 oder alle Lagerorte filtern.
4. Nutzer kann zusaetzlich frei nach Person, Setnummer oder Inventarnummern der Set-Komponenten suchen.
5. System sortiert erkannte Wagenplaetze 1 bis 30 aufsteigend und zeigt Sets ohne erkannten Platz danach.
6. System zeigt pro Set Platz, Setnummer, aktuelle Person, Klasse, iPad, Pencil, Tastatur, Verfuegbarkeit, Zustand und Lagerort.
7. Nutzer kann aus der Lagerliste per Kontextmenue Set-Ausgabe- und Ruecknahme-Workflows starten, sofern die Rolle dazu berechtigt ist.
8. Nutzer kann die gefilterte Lagerliste als XLSX herunterladen.

## Datenobjekte

- Komponente
- Set
- AuditLog
- Reparatur
- Schadensfall

## Akzeptanzkriterien

- Eine Komponente kann ueber Inventarnummer oder Seriennummer gefunden werden.
- Der aktuelle Status ist eindeutig sichtbar.
- Das Anschaffungsdatum ist als optionales Geräteattribut in der Geräteliste sichtbar und fuer berechtigte Nutzer pflegbar.
- Statusaenderungen werden mit Nutzer und Zeitpunkt protokolliert.
- Nicht berechtigte Rollen koennen Komponentendaten nicht bearbeiten.
- Freie und blockierte Sets koennen aufgetrennt werden.
- Ausgegebene Sets koennen nicht ohne Ruecknahme aufgetrennt werden.
- Komponenten-Neuzuordnungen bleiben historisch nachvollziehbar.
- Fuer freie und blockierte Sets ist ein Lagerort dokumentierbar.
- Fuer einzelne Komponenten ist ein eigener Lagerort dokumentierbar, unabhaengig vom Lagerort des Sets.
- Aus der Set-Liste kann ein Set-Datensatz read-only angezeigt werden.
- Die Set-Liste zeigt fuer freie und blockierte Sets bei Bedarf den letzten bekannten Nutzer ausgegraut als historischen Hinweis.
- Start-Lagerorte sind W1 bis W6 mit je 30 Plätzen sowie Schrank1, Schrank2 und Regal1.
- Bei W1 bis W6 soll der konkrete Platz 1-30 dokumentiert werden.
- Sets koennen einer Person zugeordnet sein und trotzdem physisch im Lager oder Wagen liegen, insbesondere bei Schuelern der 5. und 6. Klassen.
- Wagenplaetze sollen vorrangig komplette Sets enthalten.
- Fuer Lagerorte gibt es eine zusaetzliche Lagerliste mit Defaultfilter W1 und XLSX-Export.
- Die Lagerliste kann frei nach Person, Setnummer und Inventarnummern der Set-Komponenten durchsucht werden.

## Offene Fragen

- Gibt es Barcodes oder QR-Codes auf den Komponenten oder Sets?
- Welche MDM-Daten sollen angezeigt oder synchronisiert werden?
- Werden Pencil und Tastatur einzeln inventarisiert?
