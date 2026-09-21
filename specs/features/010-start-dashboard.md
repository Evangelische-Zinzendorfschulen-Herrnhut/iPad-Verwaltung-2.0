# Feature: Startseiten-Dashboard

## Status

draft

## Ziel

Angemeldete Nutzer sehen auf der Startseite zwischen Anmeldebestätigung und
Arbeitsbereich-Links kompakte Auswertungen zu den wichtigsten Listen. Die
Auswertungen helfen, Set-Verfügbarkeit, aktive Personen nach Typ und
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
- Mindestens Sets, aktive Personen und Schadensfälle werden ausgewertet.
- Leere Datenbestände werden verständlich dargestellt.
- Nicht angemeldete Nutzer sehen keine aggregierten Fachdaten.
- Alle sieben Arbeitsbereich-Links zeigen ein passendes, einheitlich großes
  Font-Awesome-Icon vor der weiterhin sichtbaren Beschriftung. Die Icons sind
  dekorativ und werden für Screenreader ausgeblendet.
- Die Bedeutung bestehender Objekt-Icons bleibt konsistent: Sets verwenden
  `faList`, Geräte `faLayerGroup`, Personen `faUser` und Schadensfälle
  `faClipboard`. Die Startseite nutzt dieselbe zentrale Icon-Zuordnung wie
  die Objekt-Links; `faTabletScreenButton` bleibt dem MDM-Link vorbehalten.

## Offene Fragen

- Welche Auswertungen sollen langfristig für Buchhaltung priorisiert werden?
- Soll das Dashboard später nach Rolle unterschiedlich gewichtet werden?

## Browser-Tab-Icons

- Ziel/Nutzerrollen: Alle Nutzer erkennen den aktuellen Arbeitsbereich auch am
  Browser-Tab-Icon; es entspricht dem jeweiligen Menü-Icon.
- Assumption: Mit HTML-Icon ist das Favicon im Browser-Tab gemeint. Startseite
  und Seiten ohne eigenen Menüpunkt verwenden das Set-Symbol.
- Datenmodell/Rechte: Ausschließlich öffentliche, statische Icon-Definitionen;
  keine Fachdatenspeicherung oder Schreibrechte, kein zusätzlicher Auditbedarf.
- Akzeptanz: Personen, Sets, Aus-/Rückgaben, Geräte, Schadensfälle, Aufgaben und
  Lagerliste nutzen die zentrale Menü-Icon-Zuordnung auch im HTML-Head.
  Detailseiten erben das Bereichs-Icon; die Lagerliste überschreibt das Set-Icon.
  Die Symbole bleiben auf hellen und dunklen Browserleisten erkennbar.
- Offene Fragen: Keine für diese Anpassung.
