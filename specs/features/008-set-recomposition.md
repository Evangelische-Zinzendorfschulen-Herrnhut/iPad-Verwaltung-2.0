# Feature: Sets auftrennen und neu zusammensetzen

## Status

draft

## Problem

Durch Schäden, Sperrungen, Reparaturen und Tauschaktionen passen historische Set-Zuordnungen nicht mehr zuverlässig. Freie oder blockierte Sets sollen aufgetrennt werden können, um andere Sets zu vervollständigen.

## Zielgruppe

- ipad_verwaltung
- admin

## Hauptworkflow

1. Nutzer öffnet ein freies oder blockiertes Set.
2. Nutzer wählt eine Komponente aus, die entnommen werden soll.
3. System beendet die aktive Zuordnung der Komponente zum bisherigen Set.
4. Nutzer wählt ein Ziel-Set und einen Slot aus.
5. System schlägt passende Komponenten aus freien oder blockierten Sets vor, inklusive Lagerort.
6. System prüft, ob die Komponente passt und der Slot frei ist.
7. System legt eine neue Set-Komponenten-Zuordnung an.
8. System berechnet Set-Zustand und Set-Verfügbarkeit für beide Sets neu.
9. System schreibt Audit-Logs.

## Datenobjekte

- Set
- Komponente
- SetKomponentenZuordnung
- AuditLog

## Regeln

- Freie Sets dürfen aufgetrennt werden.
- Blockierte Sets dürfen aufgetrennt werden, wenn sie nicht aktiv ausgegeben sind.
- Für freie und blockierte Sets soll ein Lagerort dokumentierbar sein.
- Auch einer Person zugeordnete, aber physisch gelagerte Sets koennen im Lagerort/Lagerplatz gefuehrt werden.
- Ausgegebene Sets dürfen nicht ohne Rücknahme aufgetrennt werden.
- Wagenplätze sollen vorrangig mit kompletten Sets belegt werden.
- Eine Komponente darf zu einem Zeitpunkt nur einem aktiven Set zugeordnet sein.
- Ein Set darf je Slot nur eine aktive Komponente haben.
- Alte Zuordnungen werden beendet, nicht gelöscht.

## Akzeptanzkriterien

- Eine Komponente kann aus einem freien oder blockierten Set entnommen werden.
- Eine Komponente kann einem anderen Set zugeordnet werden, wenn der Zielslot frei ist.
- Beim Vervollständigen eines Sets schlägt die App passende Komponenten aus freien oder blockierten Sets vor.
- Vorschläge zeigen den Lagerort des Quellsets oder der Komponente.
- Vorschläge zeigen bei iPadwägen auch den konkreten Platz.
- Vorschläge bevorzugen komplette Sets in Wagenplätzen als geordnete Einheiten und weisen auf Einzelkomponenten gesondert hin.
- Nach Umbau werden beide betroffenen Sets neu bewertet.
- Jeder Umbau ist auditierbar.
- Historische Set-Zuordnungen bleiben nachvollziehbar.
- Lagerorte W1 bis W6 berücksichtigen ihre Kapazität von je 30 Plätzen.
- Bei W1 bis W6 wird der konkrete Platz 1-30 dokumentiert.

## Nicht-Ziele

- Kein Umbau ausgegebener Sets ohne vorherige Rücknahme.

## Offene Fragen

- Brauchen wir einen eigenen Grundkatalog für Komponentenumbauten?
