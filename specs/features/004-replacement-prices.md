# Feature: Ersatzpreise verwalten

## Status

draft

## Problem

Fehlende oder beschaedigte Komponenten und Zubehoerteile muessen abrechenbar sein. Ersatzbetraege muessen im System editierbar bleiben, aber aeltere Abrechnungen muessen den damals verwendeten Betrag korrekt nachvollziehbar behalten.

## Zielgruppe

- admin
- ipad_verwaltung lesend oder vorschlagend

## Hauptworkflow

1. Admin oeffnet die Ersatzpreisverwaltung.
2. Admin waehlt Komponententyp, Komponentenmodell oder ZubehoerTyp.
3. Admin legt einen neuen Ersatzbetrag mit `gueltig_ab` an.
4. System beendet die vorherige gueltige Preisversion automatisch oder verlangt ein `gueltig_bis`.
5. Neue Abrechnungen verwenden den passenden gueltigen Preis.
6. Bereits erzeugte Abrechnungen behalten ihren Preis-Snapshot.

## Datenobjekte

- Ersatzpreis
- Komponente
- ZubehoerTyp
- Zahlungsvorgang
- AuditLog

## Rollen und Rechte

- Nur `admin` darf Ersatzpreise erstellen, aendern oder deaktivieren.
- `ipad_verwaltung` darf gueltige Ersatzpreise sehen, wenn ein Teil als abrechenbar markiert wird.

## Akzeptanzkriterien

- Ersatzpreise koennen pro Komponente, Modell oder ZubehoerTyp gepflegt werden.
- Preisveraenderungen erzeugen neue Versionen und ueberschreiben keine alten Preise.
- Pro Ziel ist zu einem Zeitpunkt nur ein gueltiger Ersatzpreis aktiv.
- Alte Abrechnungen zeigen weiterhin den damals verwendeten Betrag.
- Der Ersatzbetrag wird erst beim Erstellen einer Abrechnung/Zahlungsforderung festgeschrieben.
- Preisveraenderungen werden auditierbar gespeichert.

## Nicht-Ziele

- Keine automatische Rechnungsstellung im ersten Schritt.
- Keine Schnittstelle zu einem Buchhaltungssystem im ersten Schritt.

## Offene Fragen

- Sollen Preise brutto oder netto gepflegt werden?
- Brauchen wir unterschiedliche Preise fuer Verlust und Beschaedigung?
