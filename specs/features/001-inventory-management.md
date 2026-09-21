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
7. Nutzer kann die Lagerliste zusaetzlich nach iPad-Speichergroesse 32 GB, 64 GB, 128 GB oder 256 GB filtern.
8. Nutzer kann aus der Lagerliste per Kontextmenue Set-Ausgabe- und Ruecknahme-Workflows starten, sofern die Rolle dazu berechtigt ist.
9. Berechtigte Nutzer koennen aus der Lagerliste per Kontextmenue den Lagerort eines Sets oeffnen, setzen oder leeren.
10. Nutzer kann die gefilterte Lagerliste als XLSX herunterladen.
11. In den Komponentenspalten beginnt die Modell- und Zustandsangabe gezielt in einer neuen Zeile nach der vollstaendigen Inventarnummer. Verfuegbarkeit und Zustand verwenden dieselben farbigen Kennzeichnungen wie die Set-Liste.
12. Tabellenlisten heben jede zweite Datenzeile mittelhell grau hervor; beim Ueberfahren wird die jeweilige Zeile dezent mintgruen dargestellt. Fachliche Warn- und Auswahlfarben bleiben erhalten.

## Workflow: Listen schnell anzeigen

1. Nutzer oeffnet eine Inventar-, Set- oder Schadensliste.
2. System laedt nur die fuer die aktuelle Seite benoetigten Datensaetze und ergaenzt Detaildaten seitenbezogen.
3. System verwendet Datenbankfilter, Sortierung und Indizes fuer einfache Filter, statt den gesamten Bestand im Serverprozess zu sortieren.
4. System darf fuer komplexe kombinierte Suchen temporaer auf bestehende Sammelabfragen zurueckfallen, bis eine dedizierte View oder RPC vorhanden ist.
5. Detailansichten laden nur bei geoeffneter Detailaktion die zusaetzlichen Detaildaten.
6. Set-Liste und Lagerliste nutzen die verfuegbare Browserbreite mit einem schmalen, responsiven Seitenabstand, damit Tabellenzellen moeglichst einzeilig bleiben.

## Darstellung: Inventarnummer in der Geraeteliste

- Ziel und Nutzerrollen: Admin, iPad-Verwaltung und weitere bereits leseberechtigte Rollen erkennen die Geraetekategorie durch ein blaues Icon hinter jeder Inventarnummer schneller.
- Datenmodell: Die vorhandene Inventarnummer der Komponente bleibt unveraendert.
- Rechte und Datenschutz: Bestehende Lese-, Erstell-, Aenderungs- und Loeschrechte bleiben unveraendert; keine neuen Daten oder Auditvorgaenge.
- Akzeptanz: Jede Inventarnummer in der Geraeteliste zeigt rechts neben dem vollstaendigen Text ein blaues Kategorie-Icon: Tablet fuer iPad, Stift fuer Pencil und Keyboard fuer Tastatur. Weitere Kategorien verwenden vorerst das allgemeine Geraete-Icon als Fallback. Das dekorative Icon ist fuer Screenreader ausgeblendet und loest keine Aktion aus.
- Offene Fragen: keine.

## Darstellung: Set-Detailansicht

- Schadenseintraege zeigen Schadensnummer, betroffenen Gegenstand sowie Inventarnummern der im Vorgang gespeicherten Komponente und Austauschkomponente. Fehlende Zuordnungen erscheinen als `-`; aktuelle Set-Komponenten ersetzen keine historischen Vorgangszuordnungen. Statusfarben: Entwurf/Storniert grau, Offen gelb, In Bearbeitung blau, Bericht erzeugt violett, Bericht unterschrieben tuerkis, Abgeschlossen gruen. Bestehende Leserechte/RLS gelten auch fuer die Komponenten-Verknuepfungen.
- Zustand und Verfuegbarkeit verwenden passende dekorative FontAwesome-Icons statt Punkten; die ausgeschriebene Bezeichnung bleibt erhalten.
- Set-Liste und Set-Detailansicht kennzeichnen die Verfuegbarkeit zusaetzlich zum lesbaren Wort farbig: Frei gruen, Zugeordnet violett, Ausgegeben blau, Blockiert rot und Unklar grau. Reserviert erscheint violett, Zurücksetzen gelb, falls diese Werte vorliegen. Unbekannte Werte bleiben lesbar und neutral grau. Die gemeinsame Darstellung aendert weder Datenmodell noch Rollenrechte oder Workflows und erzeugt keine Schreib-/Auditvorgaenge.
- Zustandsanzeigen in Listen, Details, Filtern und Lagerexport verwenden zentral die Schreibweisen `OK`, `Unvollständig`, `Beschädigt, nutzbar`, `Defekt`, `Gesperrt, kein MDM` und `Unklar`. Bekannte ASCII-Varianten werden fuer die Anzeige normalisiert; gespeicherte Fachwerte und Legacy-Originalwerte bleiben erhalten. Rollenrechte und Datenmodell aendern sich nicht.
- Auch die Zustandsspalte der Set-Liste verwendet dieselbe farbige Kennzeichnung wie die Detailansicht. Der vorhandene Link zu den Geraeten bleibt erhalten; Datenmodell und Rollenrechte bleiben unveraendert.
- Die Schreibweisen `unvollständig` und `unvollstaendig` erhalten beide die gelbe Kennzeichnung.
- Die Setnummer wird gross und fett hervorgehoben. Der Zustand bleibt als Wort sichtbar und erhaelt zusaetzlich eine farbige Kennzeichnung: ok gruen, unvollstaendig gelb, defekt rot, unklar oder unbekannt neutral grau.
- Vor den Aufgaben erscheint eine lesende Liste der direkt ueber `damage_case.set_id` zugeordneten Schadensfaelle mit Nummer, Kurzbeschreibung, Meldedatum und Status, neueste zuerst. Auch abgeschlossene und stornierte Faelle bleiben sichtbar; jeder Eintrag verlinkt seine Detailansicht. Leere Liste und Ladefehler sind unterscheidbar.
- Leserechte: `admin`, `ipad_verwaltung` und `readonly`, serverseitig durch Seitenzugriff und bestehenden Supabase-Client mit RLS abgesichert. Keine neuen Schreibrechte oder Auditvorgaenge. Die Daten werden nur fuer ein geoeffnetes Set geladen.
- Assumption: Die Schadenshistorie folgt der gespeicherten Set-Zuordnung des Vorgangs, nicht der heutigen Zuordnung einer eventuell ausgetauschten Komponente.
- Ziel: Admin und iPad-Verwaltung koennen die vorhandenen Set-Angaben schneller erfassen; weitere leseberechtigte Rollen behalten ihren bestehenden Zugriff.
- Set-, Personen- und Komponentenfelder werden ab 640 px Bildschirmbreite in drei gleich breiten Spalten angezeigt, auf kleineren Bildschirmen untereinander.
- Im Abschnitt Set stehen in der ersten Zeile Setnummer, Verfügbarkeit und Zustand; in der zweiten Zeile Legacy-Status, Marker und Lagerort.
- Datenmodell und Rechte fuer Lesen, Erstellen, Aendern und Loeschen bleiben unveraendert. Die Ansicht bleibt lesend; es entstehen keine neuen personenbezogenen Daten oder auditpflichtigen Schreibvorgaenge.
- Akzeptanz: Die genannte Reihenfolge ist sichtbar, lange Werte umbrechen innerhalb ihrer Spalte, und die mobile Ansicht bleibt ohne horizontales Scrollen lesbar.
- Offene Fragen: keine.

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
- Die Lagerliste kann frei nach Person, Setnummer und Inventarnummern der Set-Komponenten durchsucht und nach iPad-Speichergroesse gefiltert werden.
- Admin und iPad-Verwaltung koennen den Lagerort eines Sets direkt aus dem Kontextmenue der Lagerliste aendern.
- Inventarlisten sollen bei Standardansicht und einfachen Filtern serverseitig paginiert werden.
- Listen sollen fuer haeufige Filter und Sortierungen passende Datenbankindizes verwenden.

## Offene Fragen

- Gibt es Barcodes oder QR-Codes auf den Komponenten oder Sets?
- Welche MDM-Daten sollen angezeigt oder synchronisiert werden?
- Werden Pencil und Tastatur einzeln inventarisiert?
