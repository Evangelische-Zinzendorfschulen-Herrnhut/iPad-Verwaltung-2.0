# Feature: Aufgabenverwaltung

## Status

draft

## Problem

Im Betrieb der iPad-Verwaltung entstehen kleine Folgearbeiten, die nicht immer
sofort erledigt werden: Rueckgabe pruefen, Schadensbericht nachfordern,
Zahlungsfall nachhalten, Lagerplatz klaeren oder ein Set spaeter erneut
ansehen. Diese Aufgaben sollen innerhalb der App sichtbar bleiben, statt in
externen Notizen oder persoenlichen Erinnerungen verloren zu gehen.

## Ziel

Admin-Nutzer koennen einfache Aufgaben erfassen, nach Faelligkeit und Status
filtern und erledigte Aufgaben nachvollziehbar abschliessen. Die erste Version
ist bewusst auf `admin` beschraenkt. Aufgaben fuer andere Rollen werden spaeter
fachlich geplant.

## Zielgruppe

- admin

## Hauptworkflow

1. Admin oeffnet die Aufgabenliste.
2. Admin legt eine Aufgabe mit Titel, optionaler Beschreibung, Prioritaet,
   Faelligkeit und optionalem Fachbezug an.
3. System speichert die Aufgabe mit Status `offen`.
4. Admin filtert Aufgaben nach Status, Faelligkeit, Prioritaet oder Fachbezug.
5. Admin setzt eine Aufgabe auf `in_bearbeitung` oder `erledigt`.
6. System protokolliert kritische Status- und Inhaltsaenderungen im Audit-Log.

## Datenobjekte

- Aufgabe
- App-Benutzer
- AuditLog
- optionaler Fachbezug zu:
  - Person
  - Set
  - Komponente
  - Set-Person-Zuordnung/Ausleihe
  - Schadensfall
  - Zahlungsforderung

## Datenmodell, Entwurf

### Aufgabe

Wichtige Felder:

- id
- title
- description optional
- status: `offen`, `in_bearbeitung`, `erledigt`, `archiviert`
- priority: `normal`, `hoch`
- due_date optional
- created_by_user_id
- completed_by_user_id optional
- completed_at optional
- related_object_type optional
- related_object_id optional
- created_at
- updated_at

Bei einem Set- oder Komponentenbezug zeigt die Detail- und Bearbeitungsansicht
einen Link zur gefilterten Set- beziehungsweise Geraeteliste. Als Linktext wird
die fachliche Set- oder Inventarnummer verwendet, nicht die interne UUID.
Bei einem Komponentenbezug werden zusaetzlich die aktuelle Set-Zuordnung, alle
Komponenten dieses Sets und eine dem Set zugeordnete Person verlinkt. Der
Verknuepfungsbereich nutzt die volle Drawerbreite; alle Ziele oeffnen in einem
neuen Browsertab.
Besteht am betroffenen Set keine aktuelle Personenzuordnung, wird stattdessen
die zuletzt zurueckgegebene Zuordnung aus `set_person_assignment` als
"Letzte zugeordnete Person" verlinkt.
Der Personenlink zeigt zusaetzlich Personentyp, Status sowie die aktuelle
Klasse; ohne aktuelle Klasse wird der Jahrgang angezeigt. Die Links werden in
die Bereiche Person, Setliste und Geraeteliste gruppiert.
Der Setlink zeigt Verfuegbarkeit, Zustand und Lagerort. Der Link zur direkt
betroffenen Komponente zeigt den fachlichen Komponententyp.
Auch das Feld "Betroffenes Objekt" verwendet bei Komponenten den konkreten
Komponententyp statt der allgemeinen Bezeichnung "Komponente".
Bei einer letzten historischen Personenzuordnung wird ein vorhandenes
Rueckgabedatum des Sets in der Personeninformation angezeigt.

Assumption: Aufgaben werden im ersten Schnitt nicht einzelnen Rollen oder
anderen Nutzern zugewiesen, weil nur `admin` die Aufgabenverwaltung nutzt.

## Rollen und Rechte

- Lesen: nur `admin`
- Erstellen: nur `admin`
- Bearbeiten: nur `admin`
- Status aendern: nur `admin`
- Archivieren: nur `admin`
- Loeschen: im MVP nicht vorgesehen; erledigte oder nicht mehr relevante
  Aufgaben werden archiviert.

## Datenschutz und Audit

Aufgaben koennen personenbezogene, technische oder finanzielle Hinweise
enthalten. Deshalb sind Aufgaben im ersten Schnitt nur fuer `admin` sichtbar.

Audit-pflichtig sind:

- Aufgabe erstellen
- Titel, Beschreibung, Prioritaet, Faelligkeit oder Fachbezug aendern
- Status aendern
- Aufgabe archivieren

## Akzeptanzkriterien

- Admin kann eine Aufgabe mit Titel speichern.
- Titel ist Pflichtfeld.
- Admin kann Beschreibung, Prioritaet und Faelligkeit optional erfassen.
- Neue Aufgaben erhalten den Status `offen`.
- Admin kann Aufgaben nach Status filtern.
- Admin kann ueberfaellige Aufgaben erkennen.
- Admin kann eine Aufgabe als `erledigt` markieren.
- Erledigte Aufgaben speichern Abschlusszeitpunkt und abschliessenden Admin.
- Nicht-Admins sehen keine Aufgabenliste und koennen Aufgaben nicht per API
  lesen oder bearbeiten.
- Status- und Inhaltsaenderungen erzeugen Audit-Logs.

## Nicht-Ziele

- Keine Aufgaben fuer `ipad_verwaltung` oder `buchhaltung` in dieser Iteration.
- Keine persoenlichen Aufgabenlisten pro Nutzer.
- Keine automatische Mailbenachrichtigung.
- Keine Kalenderintegration.
- Keine automatische Eskalation.
- Keine wiederkehrenden Aufgaben.

## Spaetere Erweiterungen

- Aufgaben fuer `ipad_verwaltung`, `buchhaltung` oder weitere Rollen freigeben.
- Aufgaben aus Workflows automatisch erzeugen, z. B.:
  - temporaerer Adapter ueberfaellig
  - alter Geraetetausch nach 14 Tagen offen
  - Rueckgabepruefung offen
  - unterschriebener Schadensbericht fehlt
  - Zahlungsforderung nachhalten
- Aufgaben einer Rolle oder konkreten Person zuweisen.
- Kommentare oder Verlauf pro Aufgabe.
- Benachrichtigungen per Mail oder Dashboard.

## Offene Fragen

- Welche Aufgabenarten sollen zuerst automatisch aus Workflows entstehen?
- Sollen Aufgaben spaeter Rollen, konkreten App-Benutzern oder beidem
  zugewiesen werden?
- Darf `buchhaltung` Zahlungsaufgaben nur lesen oder auch erledigen?
- Darf `ipad_verwaltung` operative Aufgaben selbst erstellen und abschliessen?
