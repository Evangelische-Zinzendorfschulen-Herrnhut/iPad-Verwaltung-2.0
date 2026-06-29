# Feature: iPad-Set ausgeben und zuruecknehmen

## Status

draft

## Problem

Die Ausgabe und Rueckgabe von iPad-Sets muss nachvollziehbar, schnell und dokumentierbar sein. Ein Set besteht im MVP immer aus iPad, Pencil und Tastatur.

## Zielgruppe

- ipad_verwaltung
- admin

## Begriffe

- iPad: Tablet-Komponente des Sets
- Pencil: Stift-Komponente des Sets
- Tastatur: Huelle mit Tastatur
- iPad-Set: genau ein iPad, ein Pencil und eine Tastatur
- Zubehoer: erwartete Zusatzteile einer Komponente, z. B. Netzteil, Kabel, Kappe oder Pencil-Ladekabel
- Personentyp: fachliche Empfaengergruppe der Ausleihe, z. B. Schueler, Lehrer, Mitarbeiter, Referendar oder Praktikant

## Komponenten und Zubehoer

Jede der drei Hauptkomponenten hat eine eigene Inventarnummer.

Zusätzlich zu den Hauptkomponenten muss erwartetes Zubehoer pruefbar sein:

- Zum iPad gehoeren Netzteil und passendes Kabel.
- Zum Apple Pencil 1. Gen. gehoert eine Kappe fuer den Lightning-Anschluss.
- Zum Tucano Pencil 1. Gen. gehoert ein USB-C-Ladekabel.
- Tastaturmodelle im Bestand sind Logitech Slimline und Logitech Combo Touch.
- Schueler erhalten das Grundset aus iPad, Pencil und Tastatur.
- Lehrer erhalten zusaetzlich einen Lightning-USB-Adapter und ein HDMI-Kabel. Diese haben keine Inventarnummer.
- Referendare und Praktikanten erhalten vorlaeufig dieselbe Ausstattung wie Lehrer.
- Schueler koennen temporaer einen Lightning-USB-Adapter zur Datenuebertragung erhalten.
- Mitarbeiter erhalten das Grundset und auf Anfrage einen Lightning-USB-Adapter.
- Magic-Maeuse werden nur auf Anfrage ausgegeben und gehoeren nicht zum Grundset.

Die aktuelle Set-Zuordnung wird separat gespeichert. Der zweite Zahlenblock der Inventarnummer darf nicht als verlaessliche Set-Zuordnung verwendet werden.

## Hauptworkflow: Ausgabe

1. Nutzer sucht oder waehlt eine Person.
2. Nutzer sucht oder waehlt ein verfuegbares iPad-Set.
3. System prueft, ob Set und alle drei Komponenten verfuegbar sind.
4. System zeigt die erwarteten Komponenten und Zubehoerteile abhaengig von Personentyp und Komponentenmodell.
5. Nutzer dokumentiert Ausgabezustand und Vollstaendigkeit fuer iPad, Pencil, Tastatur und erwartetes Zubehoer.
6. Nutzer bestaetigt Ausgabe.
7. System setzt Ausleihe auf `aktiv` und Komponenten auf `ausgegeben`.
8. System schreibt Audit-Logs.

## Hauptworkflow: Rueckgabe

1. Nutzer oeffnet eine aktive Ausleihe.
2. System zeigt erwartete Komponenten und Zubehoer abhaengig von Personentyp und Komponentenmodell: iPad mit Netzteil/Kabel, Pencil mit modellabhaengigem Zubehoer, Tastatur und ggf. Adapter/HDMI-Kabel/Zusatzartikel.
3. Nutzer markiert je Komponente und Zubehoer: vorhanden, fehlt, beschaedigt, Zustand/Notiz.
4. Nutzer bestaetigt Rueckgabe.
5. System setzt Ausleihe auf `abgeschlossen`, wenn alle noetigen Angaben erfasst sind.
6. System setzt verfuegbare Komponenten wieder auf `verfuegbar`.
7. Fehlende oder beschaedigte Komponenten und Zubehoerteile werden fuer Folgeprozesse markiert.
8. System schreibt Audit-Logs.

## Aus- und Rueckgabeliste

Die iPad-Verwaltung braucht eine chronologische Arbeitsliste der Set-Ausgaben und Rueckgaben.

- Nutzerrolle: `admin` und `ipad_verwaltung`
- Primaerer Zweck: aktive Ausgaben und abgeschlossene Rueckgaben schnell finden, pruefen und in Folgeprozesse oeffnen.
- Datenbasis: `set_person_assignment` mit Person, Set und aktueller Klassenzuordnung.
- Filter: Freitextsuche nach Person, E-Mail oder Setnummer; Status `aktiv` oder `zurueckgegeben`; Ausgabe- und Rueckgabedatum.
- Korrektur: Berechtigte Nutzer koennen bestehende Listeneintraege ueber ein Kontextmenue bearbeiten.
- Datenschutz: Die Liste enthaelt personenbezogene Ausleihdaten und ist nur fuer berechtigte Rollen sichtbar.
- Audit: Die Liste selbst aendert keine Daten; Korrekturen oder Rueckgaben erfolgen ueber bestehende Workflows und deren Audit-Anforderungen.

## Datenobjekte

- Person
- Set
- Komponente
- Ausleihe
- AusleiheKomponentenCheck
- KomponentenZubehoerCheck
- ZubehoerTyp
- ZusatzartikelAusgabe
- Zahlungsvorgang
- Schadensfall
- Dokument
- AuditLog

## Rollen und Rechte

- `admin` darf Sets ausgeben, zuruecknehmen, korrigieren und Folgeprozesse bearbeiten.
- `ipad_verwaltung` darf Sets ausgeben, zuruecknehmen und aus abrechenbaren Ruecknahme-Markierungen eine Abrechnung/Zahlungsforderung erstellen.
- `buchhaltung` wird bei erstellten Zahlungsforderungen per Mail informiert.
- Nur `admin` darf eine abgeschlossene Rueckgabe nachtraeglich korrigieren.

## Akzeptanzkriterien

- Ein aktives Set besteht genau aus iPad, Pencil und Tastatur.
- Sets werden immer Personen zugeordnet.
- Schueler sind immer einer Klasse zugeordnet.
- Sets fuer Schueler der 5. und 6. Klassen koennen einer Person zugeordnet sein und trotzdem im Lager oder iPadwagen verbleiben.
- Ab Klasse 7 werden zugeordnete Sets auch physisch ausgegeben.
- Fuer die Entscheidung, ob ein Set physisch ausgegeben wird, wird die aktuelle konkrete Klassen-/Jahrgangsstufe verwendet.
- Rollenabhaengiges Zusatzmaterial gehoert nicht zur Set-Identitaet, wird aber bei Ausgabe und Rueckgabe mitgeprueft.
- Jede Hauptkomponente hat eine eigene Inventarnummer.
- Die aktuelle Set-Zuordnung wird separat gespeichert und nicht aus der Inventarnummer abgeleitet.
- Ein Set kann nur ausgegeben werden, wenn keine aktive Ausleihe fuer dieses Set existiert.
- Ein Set kann nur ausgegeben werden, wenn alle drei Komponenten verfuegbar sind.
- Bei Ausgabe wird der Zustand und die Vollstaendigkeit aller drei Komponenten und des erwarteten Zubehoers dokumentiert.
- Bei Rueckgabe wird fuer alle drei Komponenten und erwartetes Zubehoer dokumentiert, ob sie vorhanden und in welchem Zustand sie sind.
- Bei Lehrern, Referendaren und Praktikanten werden Lightning-USB-Adapter und HDMI-Kabel standardmaessig in der Ruecknahmepruefung erwartet.
- Bei Schuelern und Mitarbeitern wird ein Lightning-USB-Adapter nur erwartet, wenn er bei Ausgabe oder nachtraeglich als Zusatzartikel erfasst wurde.
- Magic-Maeuse werden nur erwartet, wenn sie als Zusatzartikel ausgegeben wurden.
- Fehlende oder beschaedigte Komponenten und Zubehoerteile koennen bei Rueckgabe markiert werden.
- Fehlende oder beschaedigte Teile koennen als abrechenbar markiert werden.
- Bei abrechenbaren Teilen wird bei der Rueckgabe noch kein Betrag festgeschrieben.
- Der Ersatzbetrag wird erst beim Erstellen einer Abrechnung/Zahlungsforderung als Snapshot gespeichert.
- `admin` und `ipad_verwaltung` koennen aus abrechenbaren Ruecknahme-Markierungen eine Abrechnung/Zahlungsforderung erstellen.
- Beim Erstellen einer Zahlungsforderung wird `buchhaltung` per Mail informiert.
- Ausgabe und Rueckgabe erzeugen Audit-Logs.
- `ipad_verwaltung` kann keine Benutzer oder Rollen verwalten.
- Die Aus- und Rueckgabeliste zeigt aktive und abgeschlossene Ausleihen mit Setnummer, Person, Klasse, Ausgabe- und Rueckgabedatum.
- Die Aus- und Rueckgabeliste kann nach Person oder Setnummer durchsucht und nach Status gefiltert werden.
- Von abgeschlossenen Eintraegen kann das Rueckgabeprotokoll geoeffnet werden.
- Von aktiven Eintraegen kann die Rueckgabe ueber die Set-Liste fortgesetzt werden.
- Aus- und Rueckgabe-Eintraege koennen ueber das Kontextmenue korrigiert werden, ohne die eigentliche Ruecknahme-Logik zu ersetzen.

## Nicht-Ziele

- Keine vollstaendige Buchhaltungsabwicklung im ersten Schritt.
- Keine automatische MDM-Synchronisation im ersten Schritt.
- Keine getrennte Ausgabe einzelner Komponenten im MVP.
- Keine Eltern-/Schueler-Self-Service-Funktion im MVP.

## Offene Fragen

- Gibt es feste Set-Nummern auf Aufklebern?
- Welche E-Mail-Adresse oder Verteilerliste soll fuer die Buchhaltung verwendet werden?
- Soll bei Ausgabe oder Rueckgabe ein PDF-Protokoll erzeugt werden?
- Brauchen wir Unterschriften bei Ausgabe oder Rueckgabe?
- Sollen Adapter, HDMI-Kabel und Magic-Maeuse mit Bestandszahlen verwaltet werden, obwohl sie keine Inventarnummer haben?
- Welche weiteren Komponenten- oder Zusatzartikelkategorien sollen direkt zum Start angelegt werden?
