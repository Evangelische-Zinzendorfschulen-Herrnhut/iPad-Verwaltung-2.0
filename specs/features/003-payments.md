# Feature: Zahlungen und Kautionen

## Status

draft

## Problem

Zahlungen, Kautionen, Reparaturkosten und offene Betraege muessen fuer Buchhaltung und Verwaltung sauber nachvollziehbar sein. Im MVP-Kontext ist vor allem relevant, dass fehlende oder beschaedigte Komponenten und Zubehoerteile bei der Ruecknahme als abrechenbar markiert werden koennen.

## Zielgruppe

- Buchhaltung
- admin
- ipad_verwaltung

## Hauptworkflow

1. `admin` oder `ipad_verwaltung` erstellt aus einer abrechenbaren Ruecknahme-Markierung eine Abrechnung/Zahlungsforderung.
2. System uebernimmt bei fehlenden oder beschaedigten Teilen den zu diesem Zeitpunkt gueltigen Ersatzbetrag als Snapshot.
3. System informiert `buchhaltung` per Mail ueber die neue Zahlungsforderung.
4. Buchhaltung erfasst Zahlungseingang oder Statusaenderung.
5. System zeigt offene, ueberfaellige oder abgeschlossene Zahlungen.
6. Exporte fuer Buchhaltung koennen erstellt werden.

## Datenobjekte

- Zahlungsvorgang
- Person
- Ausleihe
- AusleiheKomponentenCheck
- KomponentenZubehoerCheck
- Ersatzpreis
- Benachrichtigung
- Schadensfall
- AuditLog

## Akzeptanzkriterien

- Zahlungsstatus ist pro Vorgang eindeutig.
- Aenderungen am Zahlungsstatus werden protokolliert.
- Rollen ohne Finanzberechtigung sehen keine vertraulichen Zahlungsdetails.
- Offene Zahlungen koennen gefiltert und exportiert werden.
- Fehlende oder beschaedigte Teile aus der Ruecknahme koennen einen Zahlungsvorgang oder Abrechnungshinweis erzeugen.
- `admin` und `ipad_verwaltung` duerfen Zahlungsforderungen aus Ruecknahme-Markierungen erstellen.
- `buchhaltung` wird bei neuer Zahlungsforderung per Mail informiert.
- Die initiale Empfaengeradresse ist anja.desmaretz@ezsh.de.
- Ersatzbetraege sind im System editierbar.
- Ersatzbetraege werden versioniert, nicht ueberschrieben.
- Aeltere Abrechnungen bleiben mit dem damals verwendeten Betrag nachvollziehbar.
- Der Ersatzbetrag wird erst beim Erstellen der Abrechnung/Zahlungsforderung festgeschrieben, nicht bei der Ruecknahme.

## Offene Fragen

- Wird mit einem bestehenden Buchhaltungssystem synchronisiert?
- Soll die Benachrichtigung spaeter an einen Verteiler statt an eine direkte Person gehen?
- Sollen Mahnungen direkt aus der App entstehen?
