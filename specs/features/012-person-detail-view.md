# Feature-Spec: Personen-Detailansicht

## Status

draft

## Problem

In der Personenliste sind nur die wichtigsten Stammdaten sichtbar. Fuer Verwaltungsvorgaenge muss eine Person schnell mit aktueller Klasse, Stammdatenhinweisen und Set-Ausleihhistorie geprueft werden koennen, ohne die Tabellenfilter zu verlieren.

## Zielgruppe

- `admin`
- `ipad_verwaltung`
- `readonly` mit Leserechten

## Hauptworkflow

1. Nutzer oeffnet in der Personenliste das Kontextmenue einer Tabellenzeile.
2. Nutzer waehlt `Datensatz anzeigen`.
3. System oeffnet eine Detailseite zur Person.
4. System zeigt Stammdaten, aktuelle Klassenzuordnung, bekannte Set-Zuordnungen und Schadensfaelle zur Person.
5. Admin kann die Stammdatenbearbeitung oeffnen, Stammdaten korrigieren und speichern.
6. Admin kann in der Personenliste eine neue Person mit Stammdaten anlegen.
7. Nutzer kann zur Personenliste zurueckkehren.

## Datenobjekte

- `person`
- `person_class_assignment`
- `school_class`
- `school_year`
- `set_person_assignment`
- `inventory_set`
- `damage_case`
- `inventory_component`

## Rollen und Rechte

- Lesen: `admin`, `ipad_verwaltung`, `readonly`
- Erstellen: `admin` fuer Stammdatenfelder `first_name`, `last_name`, `email`, `person_type`, `status`, `jahrgang`, `notes`
- Bearbeiten: `admin` fuer Stammdatenfelder `first_name`, `last_name`, `email`, `person_type`, `status`, `jahrgang`, `notes`
- Loeschen/Stornieren: nicht Bestandteil dieser Iteration

## Datenschutz und Audit

- Die Detailansicht zeigt personenbezogene Daten und ist nur nach serverseitiger Rollenpruefung erreichbar.
- Aenderungen sind serverseitig admin-only durch Rollenpruefung und Supabase-RLS abgesichert.
- Audit fuer Personen-Stammdaten bleibt als Folgearbeit zu klaeren, weil bisher keine allgemeine Audit-Tabelle fuer Stammdatenkorrekturen vorhanden ist.

## Akzeptanzkriterien

- Das gemeinsame Bereichsmenü zeigt vor jeder Beschriftung das im Projekt-Skill festgelegte Icon. Icons sind dekorativ; aktive Markierung und horizontales Scrollen auf schmalen Bildschirmen bleiben erhalten.

- Given ein berechtigter Nutzer sieht die Personenliste, When er eine Person per Kontextmenue oeffnet, Then erscheint eine Detailansicht zur gewaehlten Person.
- Given eine Person hat eine aktuelle Klassenzuordnung, When die Detailansicht angezeigt wird, Then werden Klasse und Schuljahr angezeigt.
- Given eine Person hat Set-Zuordnungen, When die Detailansicht angezeigt wird, Then werden aktuelle und historische Set-Zuordnungen mit Ausgabe- und Rueckgabedatum angezeigt.
- Given eine Person hat Schadensfaelle, When die Detailansicht angezeigt wird, Then werden alle Schadensfaelle mit Nummer, Meldedatum, Art, betroffenem Objekt, Status, Abrechnungseinschaetzung und Beschreibung angezeigt.
- Given ein Schadensfall ist mit Set oder Komponente verknuepft, When die Detailansicht angezeigt wird, Then werden Set und Komponente in der Schadensfallzeile angezeigt.
- Given ein Admin oeffnet das Kontextmenue einer Person, When er `Datensatz bearbeiten` waehlt, Then oeffnet sich die Detailseite im Bearbeitungsmodus.
- Given ein Admin speichert gueltige Stammdaten, When die Aktualisierung erfolgreich ist, Then werden die neuen Werte in der Detailansicht angezeigt.
- Given ein Admin waehlt `Neue Person`, When er gueltige Stammdaten speichert, Then wird ein neuer Personendatensatz angelegt und die Detailseite der neuen Person angezeigt.
- Given ein Nicht-Admin oeffnet eine Person, When die Detailansicht angezeigt wird, Then wird kein Bearbeiten-Einstieg angezeigt.
- Given ein Nutzer ohne passende Rolle ruft die Detailseite direkt auf, When die Seite laedt, Then wird er auf die Startseite umgeleitet.

## Nicht-Ziele

- Klassenhistorie bearbeiten
- Ausgaben oder Rueckgaben aus der Personenansicht starten

## Offene Fragen

- Assumption: In dieser Iteration reicht eine eigene Detailseite; ein Seitenpanel in der Liste kann spaeter ergaenzt werden.
- Assumption: Die iPad-Verwaltung erhaelt vorerst keine Stammdaten-Schreibrechte, weil die vorhandenen Policies nur Admin-Bearbeitung erlauben.
- Wie sollen Stammdaten-Aenderungen an Personen auditierbar protokolliert werden?
