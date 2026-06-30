# Feature: Startseiten-Dashboard

## Status

draft

## Ziel

Angemeldete Nutzer sehen auf der Startseite zwischen Anmeldebestätigung und
Arbeitsbereich-Links kompakte Auswertungen zu den wichtigsten Listen. Die
Auswertungen helfen, Bestände, Set-Verfügbarkeit, Personenstatus und
Schadensfälle schnell einzuschätzen.

## Zielgruppe

- admin
- ipad_verwaltung
- buchhaltung lesend fuer Zahlungs- und Schadenskontext

## Hauptworkflow

1. Nutzer meldet sich an.
2. System zeigt die Anmeldebestätigung.
3. System zeigt ein Dashboard mit Kreisdiagrammen zu vorhandenen Listen.
4. Nutzer kann daraus ableiten, welche Liste als Nächstes geprüft werden soll.

## Datenobjekte

- Person
- Komponente
- Set
- Set-Person-Zuordnung
- Schadensfall

## Rechte

- Lesen: angemeldete Nutzer mit App-Zugriff sehen nur aggregierte Zählwerte.
- Erstellen, Ändern, Löschen: nicht Teil dieses Features.
- Serverzugriff bleibt über bestehende Supabase-RLS-Policies und Rollenprüfung
  abgesichert.

## Datenschutz und Audit

Das Dashboard zeigt keine personenbezogenen Einzelinformationen, Namen oder
E-Mail-Adressen. Es werden nur aggregierte Zählwerte angezeigt. Da keine Daten
geändert werden, ist kein zusätzlicher Audit-Log erforderlich.

## Akzeptanzkriterien

- Das Dashboard erscheint auf der Startseite zwischen Anmeldebestätigung und
  Arbeitsbereich-Links.
- Die Auswertungen werden als Kreisdiagramme dargestellt.
- Mindestens Sets, Komponenten, Personen und Schadensfälle werden ausgewertet.
- Leere Datenbestände werden verständlich dargestellt.
- Nicht angemeldete Nutzer sehen keine aggregierten Fachdaten.

## Offene Fragen

- Welche Auswertungen sollen langfristig für Buchhaltung priorisiert werden?
- Soll das Dashboard später nach Rolle unterschiedlich gewichtet werden?
