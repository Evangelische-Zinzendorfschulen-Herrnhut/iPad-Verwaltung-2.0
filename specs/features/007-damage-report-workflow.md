# Feature: Schadens- oder Problemmeldung mit PDF-Bericht

> Aktueller Umfang: Implementierte SharePoint-Verlinkung, siehe Abschnitt „Bestaetigter erster Umsetzungsschnitt“. Integrierter Foto-Upload bleibt ein spaeterer Entwurf. Migration und externe Inbetriebnahme sind noch offen.

## Status

draft

## Problem

Bei Schäden oder technischen Problemen müssen alle notwendigen Informationen erfasst werden. Nach vollständiger Eingabe soll ein Schadensbericht als PDF erzeugt werden, den Eltern zur Kenntnisnahme unterschreiben. Der unterschriebene Bericht wird digital abgelegt.

In der Legacy-Datenbank scheint `in Bearbeitung` auf diesen Prozess hinzuweisen.

Die Legacy-Tabelle `Schaden` enthält bereits aktuelle Schadens-, Verlust- und Austauschmeldungen. Diese Daten muessen in das neue Zielmodell uebernommen werden, damit neue Meldungen und bestehende Vorgänge in einer gemeinsamen Sicht bearbeitet werden.

## Zielgruppe

- ipad_verwaltung
- admin
- buchhaltung, zahlungsbezogen

## Zielbild

1. Nutzer legt eine Schadens- oder Problemmeldung an.
2. System erfasst betroffene Person, Set, Komponente, Zubehör und Beschreibung.
3. Nutzer ergänzt Hergang, Datum, Ort, Zeugen, Fotos und Kosten-/Versicherungsinformationen, soweit erforderlich.
4. Wenn alle Pflichtfelder vollständig sind, kann ein PDF-Schadensbericht erzeugt werden.
5. PDF wird den Eltern zur Kenntnisnahme/Unterschrift bereitgestellt.
6. Unterschriebener Schadensbericht wird als PDF hochgeladen und dem Vorgang zugeordnet.
7. Aus dem Vorgang können Reparatur, Gerätetausch oder Zahlungsforderung entstehen.

## Erster Umsetzungsschnitt

- Die Ersatzsuche beim Anlegen erlaubt auch nutzbare Einzelkomponenten ohne aktive Set-Zuordnung. Reihenfolge: unvollstaendige Quellsets, freie Einzelkomponenten, weitere erlaubte Quellsets. Die serverseitige Pruefung akzeptiert fehlende Quellzuordnung, prueft vorhandene Quellsets aber weiterhin auf Verfuegbarkeit und Personenzuordnung. Kategorie, Zielzuordnung und Zustand bleiben verbindlich. Keine neuen Rechte oder Datenobjekte; bestehende Austausch- und Auditregeln gelten.

- Bei Auswahl einer Ersatzkomponente wird `Ersatz ausgegeben am` auf das heutige Datum in Europe/Berlin gesetzt. Das Datum bleibt manuell aenderbar; erneute Komponentenauswahl setzt es erneut auf heute. Bestehende Speicherung, Rollenrechte und Auditregeln bleiben unveraendert.
- Beim Anlegen setzt die Abrechnungseinschaetzung `nicht_abrechenbar` den Schadensstatus unmittelbar im Formular und verbindlich beim Speichern auf `abgeschlossen`. Eine manuelle andere Statuswahl wird bei dieser Einschaetzung auf `abgeschlossen` korrigiert. Rueckwechsel der Abrechnung oeffnet den Vorgang nicht automatisch wieder; der Status kann dann manuell gewaehlt werden. Bestehende Datensaetze werden nicht rueckwirkend geaendert. Die automatische Entscheidung wird mit Nutzer und Zeitpunkt in der internen Notiz dokumentiert; Rollenrechte und weitere Austauschfolgen bleiben unveraendert.
- Kandidaten und aktive Set-Komponenten-Zuordnungen werden in stabil sortierten Seiten geladen, damit API-Zeilenlimits keine passenden Ersatzkomponenten ausblenden. Ladefehler duerfen nicht als leere Kandidatenliste erscheinen.

- Ersatzkomponenten aus bereits unvollstaendigen Sets werden beim Anlegen und Bearbeiten zuerst angeboten und als bevorzugt gekennzeichnet. Komponenten aus vollstaendigen Sets bleiben nachrangig verfuegbar. Freie und blockierte Quellsets ohne Personenzuordnung sind erlaubt; Kategorie und nutzbarer Komponenten-Zustand bleiben Pflicht. Serverseitige Pruefungen verwenden dieselben erlaubten Quellstatus. Ganze Ersatzsets muessen weiterhin vollstaendig sein.

- Abhaengige Ersatzauswahl beim Anlegen: Erst `erforderlich` oeffnet die Auswahl. `Ganzes Set` zeigt freie Ersatzsets; `Konkrete Komponente` zeigt nutzbare Komponenten gleicher Kategorie aus freien oder blockierten Sets ohne Personenzuordnung. Andere betroffene Gegenstaende erhalten keine automatische Ersatzauswahl. Wechsel von Gegenstand oder Komponente leert die Auswahl. Auswahl eines Ersatzes setzt den Status automatisch auf `ausgegeben`; Abwahl setzt ihn auf `erforderlich`. `Angefragt` wird in neuen Formularen durch `Erforderlich` ersetzt; historische Werte bleiben erhalten. Serverseitige Pruefung verhindert unpassende oder gleichzeitig gesetzte Ersatzarten. Bestehende Rollen, Datenobjekte und Auditregeln gelten unveraendert.
- Beim Anlegen wird das Ersatzset ueber eine Suchliste mit Einzelauswahl wie im Bearbeitungsfenster ausgewaehlt. Suche nach Setnummer und Lagerort; `Kein Ersatzset` ist die Voreinstellung. Die Anzeige nennt Verfuegbarkeit und Zustand. Nur freie, vollstaendige Sets im Zustand OK ohne Personenzuordnung werden angeboten. Datenmodell, Schreibrechte und bestehende serverseitige Tauschpruefungen bleiben unveraendert.
Aus der Set-Liste soll fuer ein fachlich `ausgegeben`es Set ein neuer Vorgang angelegt werden koennen.

Der erste Schnitt bildet noch nicht den vollstaendigen Eltern-PDF- und Abrechnungsprozess ab. Er schafft die fachliche Grundlage:

1. Nutzer oeffnet ein aktuell ausgegebenes Set.
2. Nutzer startet `Schaden/Verlust melden`.
3. System uebernimmt Set, aktuelle Person und aktuelle Ausleihe/Zuordnung.
4. Nutzer waehlt Vorgangsart:
   - Schaden
   - Verlust
   - technisches Problem
5. Nutzer waehlt den betroffenen Gegenstand:
   - ganzes Set
   - konkrete Komponente mit Inventarnummer, z. B. iPad, Pencil oder Tastatur
   - Netzteil zum iPad
   - Kabel zum iPad
   - sonstiges Zubehör
6. Bei einer konkreten Komponente waehlt der Nutzer die Inventarkomponente des Sets.
7. Nutzer erfasst Ereignisdatum, Hergang, Schadensbeschreibung und Zeugen.
8. Vorgang wird mit Status `entwurf` oder `offen` gespeichert.
9. Das Set bleibt zunaechst ausgegeben; Folgeschritte wie Ruecknahme, Geraetetausch, Reparatur oder Zahlungsforderung werden spaeter aus dem Vorgang gestartet.

Alternativ kann der Nutzer aus der Set-Liste `Problem melden` starten. Dann ist `technisches Problem` als Vorgangsart vorausgewaehlt. Das Formular nutzt die gleichen Grunddaten, blendet aber Hergang und Zeugen aus, bezeichnet die Detailbeschreibung als `Problembeschreibung` und erlaubt, den Lagerort des Sets direkt mit dem Vorgang zu aktualisieren.

Das Formular aus der Set-Liste verwendet dieselbe Bereichsstruktur wie die Bearbeitung in der Schadensliste: `Kernangaben`, `Schaden`, `Austausch`, `Bearbeitung` und `Zuordnung`.

Die Kernangaben beim Anlegen stehen ab kleiner Tabletbreite in zwei Zeilen: Vorgangsart, Problemart und Status in drei Spalten; darunter Betroffen und Komponente in zwei Spalten. Mobil stehen die Felder untereinander. Dies ist eine reine Layoutaenderung fuer die bestehenden berechtigten Bearbeiter; Datenmodell, Rollenrechte, Validierung und Audit bleiben unveraendert. Akzeptanz: genannte Reihenfolge und Spaltenzahl, weiterhin funktionierende abhaengige Ersatzauswahl. Keine offenen Fragen.

Bei einem technischen Problem muss der Nutzer die Problemart auswaehlen:

- `Hardware`: Die betroffene konkrete Komponente wird beim Speichern als `defekt` markiert, sofern eine Komponente ausgewaehlt ist. Falls keine konkrete Komponente ausgewaehlt ist, bleibt der Vorgang zur technischen Klaerung offen.
- `Software`: Es wird kein Geraet automatisch als defekt markiert. Die Bearbeitung besteht fachlich darin, das Softwareproblem zu loesen oder das iPad zurueckzusetzen.

Bei Schadens- und Verlustmeldungen wird die Problemart immer mit `Hardware` gespeichert. Das Formular `Schaden oder Verlust melden` belegt die Problemart deshalb mit `Hardware` vor, und bestehende Schadens- oder Verlustdatensaetze werden entsprechend korrigiert.

Bei beiden Problemarten kann fachlich ein Komponenten- oder Setwechsel erforderlich sein. Die Problemart ersetzt deshalb nicht die Austauschentscheidung; Ersatzset, Ersatzkomponente, Austauschstatus und Ersatz-Ausgabedatum bleiben fuer Hardware- und Softwareprobleme erfassbar.

Fuer freie Sets koennen Schaeden, Verluste oder technische Probleme ebenfalls aus der Set-Liste angelegt werden. In diesem Fall wird der Vorgang mit Set und betroffenen Komponenten gespeichert, aber ohne aktuelle Person und ohne aktuelle Set-Person-Zuordnung. Das dient Bestandsklaerung, Lagerpruefung und Reparaturvorbereitung. Personenbezogene Folgeprozesse wie Setwechsel oder Eltern-/Schuelerkommunikation greifen erst, wenn eine Personenzuordnung vorhanden ist oder spaeter fachlich ergaenzt wird.

Neue Schadensfaelle erhalten zusaetzlich zur technischen UUID eine fortlaufende `damage_number` als menschlich lesbare Schadensnummer. Die UUID bleibt Primaerschluessel; die Schadensnummer wird fuer Suche, Anzeige und Kommunikation genutzt.

Wenn beim Anlegen eines Schadensfalls der Austauschstatus `ausgegeben` und ein Ersatzset gesetzt werden, fuehrt die App den Setwechsel direkt aus:

- Die bisher aktive Set-Person-Zuordnung des alten Sets wird zum Ersatz-Ausgabedatum beendet.
- Fuer das Ersatzset wird eine neue aktive Set-Person-Zuordnung fuer dieselbe Person angelegt.
- Das alte Set wird als `blockiert` und `defekt` markiert.
- Das Ersatzset wird als `ausgegeben` und `ok` markiert.
- Bei Setschaden wird die aktuelle iPad-Komponente des alten Sets als `defekt` markiert.

Wenn beim Anlegen eines Schadensfalls eine betroffene Komponente und eine Ersatzkomponente gesetzt werden, fuehrt die App den Komponententausch direkt aus:

- Die bisher aktive Set-Komponenten-Zuordnung der defekten Komponente wird historisiert beendet.
- Die Ersatzkomponente wird mit derselben Rolle dem Set zugeordnet.
- Die defekte Komponente wird als `defekt` markiert.
- Ist die Ersatzkomponente bisher Teil eines freien oder blockierten Sets, wird diese bisherige Zuordnung beendet und das Quellset als `unvollständig` markiert.
- Ersatzkomponenten aus ausgegebenen Sets duerfen nicht automatisch entnommen werden.

Assumption: Automatischer Komponenten- und Setwechsel sind erste technische Folgeaktionen des Schadensworkflows. Weitergehende Geraetetauschfristen und Erinnerungen bleiben Teil des ausgebauten Geraetetausch-Workflows.

## Bearbeiten bestehender Schadensfaelle

- In der Set-Detailansicht koennen `admin` und `ipad_verwaltung` den Status eines Schadens per Kontextmenue aendern. Weitere Leser erhalten keine Schreibaktion. Die Auswahl entspricht dem vorhandenen Statusmodell. Schadensfall und Set-Zuordnung werden serverseitig geprueft; unbekannte Statuswerte abgewiesen. Status und ein Verlaufseintrag (alter/neuer Wert, Nutzer-ID und Zeitpunkt) in der vorhandenen internen Notiz werden gemeinsam gespeichert, mit Konfliktpruefung ueber `updated_at`. Der Verlauf ist damit nachvollziehbar, jedoch wie die interne Notiz bearbeitbar. Keine Aenderung an Komponenten, Austausch oder Zahlungen. Akzeptanz: Status aktualisiert sich ohne Verlassen der Set-Details; Fehler/Konflikte bleiben sichtbar; Escape schliesst das Menue. Offene Fragen: keine.
### Komponententausch beim Bearbeiten

- Ersatz wird aus einer Suchliste nach Inventarnummer, Modell und Lagerort gewaehlt. Die Liste enthaelt nur nutzbare Komponenten derselben Kategorie wie die gespeicherte Schadenskomponente, ohne aktive Set-Zuordnung oder aus freien/blockierten Sets ohne zugeordnete Person und ohne aktive Set-Person-Zuordnung. Komponenten des Zielsets sind ausgeschlossen. Quellset und Lagerort werden angezeigt; der Komponenten-Lagerort hat Vorrang vor dem Set-Lagerort. Ohne konkrete Schadenskomponente wird keine Ersatzliste angeboten. Bestehender Ersatz bleibt lesend sichtbar. Laden erfolgt nur fuer berechtigte Bearbeiter; bestehende serverseitige Tauschpruefungen bleiben verbindlich.
- Admin und iPad-Verwaltung koennen anhand der Inventarnummer eine Ersatzkomponente eintragen. Beim Speichern wird der Tausch unmittelbar ausgefuehrt; das Austauschdatum ist Pflicht und darf nicht in der Zukunft liegen.
- Betroffen sind Schadensfall, beide Komponenten, aktuelle/historische Set-Komponenten-Zuordnungen, Zielset und gegebenenfalls Quellset. Lesen folgt den bestehenden Rollen/RLS; Schreiben nur admin/ipad_verwaltung, keine neuen Loeschrechte.
- Die alte Komponente muss aktuell zum Set gehoeren. Ersatz muss derselben Kategorie angehoeren und nutzbar sein. Ersatz aus personenzugeordneten oder ausgegebenen Sets ist ausgeschlossen.
- Alle Schreibvorgaenge laufen in einer Transaktion: Zuordnungen historisieren, Ersatz einsetzen, alte Komponente defekt markieren, Set-Zustand neu bestimmen, Quellset gegebenenfalls unvollstaendig markieren und Audit mit Nutzer/Zeit/Zuordnungen schreiben. Fehler rollen alles zurueck.
- Bereits gespeicherter Ersatz kann nicht ueberschrieben werden; erneutes Speichern derselben Auswahl erzeugt keinen weiteren Tausch. Weiterer Austausch braucht einen neuen Schadensfall.
- Assumption: Zuordnungshistorie verwendet den tatsaechlichen Speicherzeitpunkt; das angegebene Austauschdatum bleibt das fachliche Belegdatum. Verfuegbarkeit wird nicht automatisch freigegeben. Legacy-Originalwerte bleiben erhalten.
- Akzeptanz: Erfolgreicher Tausch zeigt Ersatz im Set und alten Artikel als defekt. Falsche Kategorie, nicht nutzbarer Ersatz, veraltete Zuordnung und unberechtigte Rollen werden ohne Teiländerungen abgewiesen. Offene Fragen: keine.

Aus der Schadensfallliste koennen bestehende Datensaetze von `admin` und `ipad_verwaltung` bearbeitet werden. `buchhaltung` bleibt lesend und sieht keine Bearbeiten-Aktion.

Die Schadensfallliste zeigt die Spalte `Schadensnummer` als erste Spalte ganz links. Die Nummer bleibt damit beim horizontalen Lesen die primaere sichtbare Kennung des Vorgangs; die Reihenfolge der folgenden Spalten bleibt unveraendert.

Bearbeitbar sind im ersten Schritt die fachlichen Bearbeitungsfelder:

- Vorgangsart
- Problemart bei technischen Problemen: Hardware oder Software
- betroffener Gegenstand
- Status
- Melde- und Ereignisdatum
- Kurzbeschreibung
- Hergang, Schadenbeschreibung, Ort und Zeugen
- Haftung
- erste Abrechnungseinschaetzung
- Austauschstatus und Ersatz-Ausgabedatum im eigenen Bereich `Austausch`
- Bearbeiter und interne Notiz im Bereich `Bearbeitung`

Nicht im Listenformular bearbeitet werden Verknuepfungen zu Person, Set, betroffener Komponente und Ersatzset. Die Ersatzkomponente kann ueber den oben beschriebenen Komponententausch ergaenzt werden.

Assumption: Eine Bearbeitung aendert keine Set-Verfuegbarkeit und erzeugt noch keinen separaten AuditLog-Eintrag, solange kein AuditLog-Modell implementiert ist. Die Datenbank aktualisiert `updated_at` per Trigger.

## Schadensbericht-PDF

Aus der Schadensfallliste kann fuer einen Datensatz ein Schadensbericht als PDF erzeugt werden. Das Layout orientiert sich an der Word-Vorlage `input/Schadenbericht.docx` mit den Abschnitten:

- Meldung
- Benutzer
- Ersatzgeraet
- Schaden
- Zusammenfassung
- Unterschriften

Der PDF-Bericht liest die vorhandenen Schadensfall-, Personen-, Klassen-, Set- und Komponentendaten. Fehlende Felder werden sichtbar als `-` ausgegeben, damit im Bericht keine unklaren Leerstellen entstehen.

Assumption: Die PDF-Erzeugung erfolgt im MVP serverseitig direkt aus den Daten und bildet die Vorlage fachlich nach. Die Word-Vorlage bleibt Referenz fuer Struktur und Bezeichnungen, wird aber zur Laufzeit nicht per Office-Konverter verarbeitet.

## Statusmodell, erster Entwurf

- `entwurf`: angelegt, aber fachlich noch nicht vollstaendig.
- `offen`: gemeldet und zur Bearbeitung bereit.
- `in_bearbeitung`: technische oder organisatorische Klaerung laeuft.
- `bericht_erzeugt`: PDF-Schadensbericht wurde erzeugt.
- `bericht_unterschrieben`: unterschriebener Bericht wurde hochgeladen.
- `abgeschlossen`: Vorgang ist fachlich erledigt.
- `storniert`: irrtuemlich angelegt oder nicht weiter relevant.

Assumption: Fuer den ersten UI-Schritt reicht `offen` als Startstatus, wenn alle Pflichtfelder direkt im Formular erfasst werden.

## Pflichtfelder, erster Entwurf

- Set
- aktuell zugeordnete Person
- aktuelle Set-Person-Zuordnung
- Vorgangsart: Schaden, Verlust oder technisches Problem
- Problemart bei technischen Problemen: Hardware oder Software
- betroffen: ganzes Set, konkrete Komponente, Netzteil, Kabel oder sonstiges Zubehör
- Meldedatum
- Kurzbeschreibung

Optionale Felder:

- Ereignisdatum, falls abweichend vom Meldedatum
- Detailbeschreibung
- interne Notiz
- erste Einschaetzung: abrechenbar, nicht abrechenbar, unklar

Assumption: Fotos und Dokumente werden im ersten Schritt noch nicht hochgeladen, sondern nachgezogen, sobald Storage/Dateiablage entschieden ist.

## Datenobjekte

- Schadensfall
  - `id`: technische UUID
  - `damage_number`: fortlaufende Schadensnummer
- Dokument
- Set
- Komponente
- Zusatzartikel
- Person
- Zahlungsvorgang
- Gerätetausch
- AuditLog

## Legacy-Migration

Quelle: SQLite-Tabelle `Schaden`.

Wichtige Legacy-Felder:

- `SchadenID`
- `Quelle`, `QuelleID`
- `UserID`
- `SetID`
- `ZuordnungID`
- `Kategorie`
- `BetroffenerSlot`
- `SchadensgeraetInvNr`
- `ErsatzgeraetInvNr`
- `ErsatzSetID`
- `Status`
- `AustauschStatus`
- `VersicherungGarantie`
- `PassiertAm`
- `GemeldetAm`
- `ErsatzAusgegebenAm`
- `Kurzbeschreibung`
- `SchadenBeschreibung`
- `Hergang`
- `Ort`
- `Bearbeiter`
- `Anmerkungen`
- `Zeugen`
- `BetroffeneKomponenten`
- `ImportStatus`
- `ImportHinweis`

Assumption: Legacy-Status und normalisierter Vorgangsstatus werden parallel gespeichert. Die App nutzt den normalisierten Status, der Legacy-Wert bleibt zur Nachvollziehbarkeit erhalten.

Assumption: Das Legacy-Feld `VersicherungGarantie` wird in der UI fachlich als `Haftung` bezeichnet.

## Akzeptanzkriterien, Entwurf

- Aus einem fachlich `ausgegeben`en Set kann ein Schadens-/Verlustvorgang angelegt werden.
- Aus einem fachlich `ausgegeben`en Set kann ein technisches Problem mit vorausgewaehlter Vorgangsart angelegt werden.
- Bei technischen Problemen ist die Problemart `Hardware` oder `Software` ein Pflichtfeld.
- Bei technischen Problemen mit Problemart `Hardware` und konkreter Komponente wird die Komponente beim Speichern als `defekt` markiert.
- Bei technischen Problemen mit Problemart `Software` wird keine Komponente automatisch als `defekt` markiert; der Vorgang bleibt fuer Loesung oder Zuruecksetzen bearbeitbar.
- Aus einem fachlich `frei`en Set kann ein Schadens-, Verlust- oder Problemvorgang ohne Person und ohne aktive Set-Person-Zuordnung angelegt werden.
- Bei technischen Problemen werden Hergang und Zeugen im Formular nicht angezeigt; statt Schadenbeschreibung wird Problembeschreibung angezeigt.
- Beim Anlegen eines technischen Problems kann der Lagerort des Sets gesetzt oder geleert werden.
- Der Vorgang ist immer mit dem Set verknuepft; aktuelle Person und aktuelle Set-Zuordnung werden nur gespeichert, wenn das Set aktiv ausgegeben ist.
- Vorgangsart und betroffener Gegenstand werden strukturiert gespeichert.
- Ein Vorgang kann zunaechst ohne Zahlungsforderung existieren.
- Ein Vorgang veraendert im ersten Schritt nicht automatisch die Set-Verfuegbarkeit.
- `admin` und `ipad_verwaltung` koennen einen bestehenden Vorgang aus der Liste heraus bearbeiten.
- `buchhaltung` kann Schadensfaelle lesen, aber nicht bearbeiten.
- Pflichtfelder und Enum-Werte werden serverseitig geprueft.
- Austauschstatus wird als kontrollierte Auswahl vorhandener Statuswerte gepflegt, nicht als Freitext.
- Ein Schadensbericht-PDF kann aus der Liste heraus fuer einen Datensatz geoeffnet werden.
- Beim Speichern eines Schadensfalls mit Austauschstatus `ausgegeben` und Ersatzset werden Setliste, Ausgabeliste und Geraeteliste konsistent aktualisiert.
- Schadensbericht kann erst erzeugt werden, wenn alle Pflichtfelder vollständig sind.
- Erzeugter PDF-Bericht wird versioniert oder nachvollziehbar gespeichert.
- Unterschriebener PDF-Bericht kann hochgeladen und dem Schadensfall zugeordnet werden.
- Statuswechsel werden auditierbar gespeichert.

## Nicht-Ziele

- Keine automatische Versicherungskommunikation im ersten Schritt.
- Keine automatische Abrechnung beim Anlegen einer Schadens-/Verlustmeldung.
- Kein automatischer Geraetetausch im ersten Schritt.
- Kein PDF-Upload im ersten Formularschritt.

## Erweiterungsentwurf: Mehrere Fotos in SharePoint

Stand: 30.09.2026. Speicherentscheidung bestaetigt, Umsetzung bis zur Klaerung der offenen Entscheidungen und Administratorfreigaben gesperrt. Architekturentscheidung: `specs/decisions/0018-sharepoint-damage-photos.md`.

### Ziel und konkrete Zieloption

Bei Schadens- und Problemmeldungen sollen mehrere Fotos beim Anlegen und nachtraeglich hinzugefuegt werden koennen. Bestaetigter primaerer Fotospeicher ist die gemeinsame schulische SharePoint-Bibliothek der Site `https://ezshde.sharepoint.com/sites/IT2`, Bibliothek `Freigegebene Dokumente`. Der bestehende Pfad `2.1_iPads und Applezeugs/CaseManagement` mit den Ordnern `Cases`, `Archiv` und `Vorlagen` wurde am Bildschirm verifiziert. Graph-IDs und effektive App-Berechtigungen sind noch technisch zu pruefen. Persoenliches OneDrive und Supabase Storage sind nicht der primaere Fotospeicher. Es werden in dieser Planungsphase keine Ordner, Dateien oder Berechtigungen angelegt.

Supabase bleibt fuehrend fuer Schadensfaelle, Foto-Zuordnungen, App-Rollen und Audit. SharePoint speichert die Bilddateien. Die Speicherentscheidung ist in ADR 0018 festgehalten; die konkrete Authentifizierung und Ressourcenfreigabe sind vor Implementierung zu bestaetigen.

### App-Zugriff und Rechte

- Vorgesehen ist eine serverseitige Microsoft-Graph-Anbindung mit einer schulisch verwalteten Entra-Appregistrierung und Application-Authentifizierung. Der Supabase-Login bleibt der Benutzerzugang; Microsoft-Zugangsdaten werden ausschliesslich serverseitig verwaltet.
- Bevorzugt wird `Lists.SelectedOperations.Selected` mit expliziter Schreibfreigabe ausschliesslich fuer die Zielbibliothek; technische Eignung fuer die benoetigten Upload-, Lese- und Loeschoperationen ist vor Umsetzung zu pruefen. Alternativ kommt `Files.SelectedOperations.Selected` fuer den freigegebenen Zielordner infrage. `Sites.Selected` mit Schreibfreigabe nur fuer IT2 ist die breitere Rueckfalloption, falls Bibliotheks-/Ordnerbegrenzung nicht praktikabel ist. Keine tenantweiten `Files.ReadWrite.All`- oder `Sites.ReadWrite.All`-Rechte vorsehen.
- Entra-Administratorzustimmung allein reicht bei Selected-Rechten nicht aus: Auch die konkrete Ressource muss der App explizit freigegeben werden. Ordner-/Bibliotheksfreigaben koennen die Berechtigungsvererbung unterbrechen und muessen administrativ bewertet werden.
- App-seitig duerfen `admin` und `ipad_verwaltung` Fotos hinzufuegen. Entfernen wird erst nach Klaerung der Loeschregeln umgesetzt. Kein neuer Zugriff fuer anonyme Nutzer oder Schueler.
- Assumption: `readonly` liest Fotos zu lesbaren Faellen; `buchhaltung` liest Fotos ausschliesslich zu abrechenbaren Faellen. Diese Erweiterung der bestehenden Fall-Leserechte ist fachlich zu bestaetigen. Tabellen-RLS und serverseitige Graph-Zugriffe pruefen jeweils den konkreten Fall; Graph-Rechte ersetzen keine App-Autorisierung.
- Direkter Zugriff in SharePoint folgt den dortigen Berechtigungen und kann App-Rollen umgehen. Bestehende Bibliotheksleser und Freigabelinks muessen vor Freigabe geprueft werden; keine oeffentlichen Freigabelinks erzeugen.

### Ordnerstruktur und Datenmodell

Vorgesehene Struktur: `Freigegebene Dokumente/2.1_iPads und Applezeugs/CaseManagement/Cases/Schaden-<sechsstellig gepolsterte Nummer>_<Nachname>-<Vorname>/Fotos/<foto-id>.<endung>`. `Cases` ist der bestehende Stamm fuer aktive Schadensfaelle. Die eindeutige Schadensnummer und serverseitige Foto-UUIDs verhindern Kollisionen; vorhandene Dateien werden nicht ueberschrieben, unerwartete Namenskonflikte als Fehler behandelt. `Archiv` und `Vorlagen` behalten ihre bestehenden Zwecke; automatisches Archivieren und Vorlagenverwaltung sind nicht Teil dieser Fotoerweiterung. Die Schadensnummer bleibt die sichtbare Bezeichnung in der App. Fallordner enthalten auf ausdruecklichen Nutzerwunsch Schadensnummer und betroffenen Benutzernamen; Foto-Dateinamen enthalten keine Personennamen. Namensbezogene Datenschutzregeln stehen unten.

Geplantes Datenobjekt `damage_case_photo` mit 1:n-Beziehung zu `damage_case`: Foto-ID, Schadensfall-ID, Speicheranbieter, `site_id`, `drive_id`, `item_id`, gepruefter MIME-Typ, Dateigroesse, Sortierreihenfolge, Uploadstatus, hochladender App-Nutzer und Zeitstempel. Optionaler Originaldateiname nur nach Datenminimierungspruefung. `drive_id` und `item_id` bilden die dauerhafte Dateireferenz; Pfad und `webUrl` sind lediglich Anzeige-/Betriebsinformationen. Kurzlebige Download- und Upload-URLs werden nicht als dauerhafte Referenzen gespeichert und nicht protokolliert.

localhost und Vercel verwenden dieselbe Ablage nur bei explizit gleichen Backend-/Graph-Zielkonfigurationen; die App-Domain bestimmt keinen Speicherort. Entwicklungs- und Preview-Tests sollen eine separat freigegebene Testablage samt Testdaten nutzen. Produktionsdateien werden nicht automatisch in Entwicklungsumgebungen kopiert.

### Workflow, Datenschutz und Audit

- Mehrfachauswahl, Vorschau, einzelne Uploadfortschritte und verstaendliche Fehler pro Datei; nachtraegliches Hinzufuegen im Schadensdetail. Liste zeigt Fotoanzahl, beide Schadensdetailansichten eine Galerie mit Vergroesserung.
- Zulaessige Formate, Anzahl und Groessen werden noch festgelegt; Dateiinhalte und Groessen werden serverseitig geprueft. Standort-/EXIF-Metadaten werden vor Ablage entfernt. Uploads muessen die Vercel-Laufzeit- und Requestgrenzen beruecksichtigen.
- Supabase und SharePoint haben keine gemeinsame Transaktion: Uploadstatus und Wiederholungen werden explizit modelliert. Nur erfolgreich validierte und zugeordnete Dateien erscheinen in der Galerie; Bereinigung verwaister Dateien und Umgang mit extern entfernten Dateien sind Teil der Umsetzung.
- Hinzufuegen, Entfernen und fehlgeschlagene Speicheroperationen werden mit App-Nutzer, Zeitpunkt, Fall- und Foto-ID nachvollziehbar protokolliert; keine Bildinhalte, Tokens oder temporaeren Zugriffs-URLs im Audit. Bei App-only-Graph-Zugriff muss der tatsaechliche App-Nutzer in Supabase festgehalten werden.
- Aufbewahrung, Loeschung auch in SharePoint/Papierkorb, externe Dateiaenderungen und schulische Datenschutzfreigabe sind vor Umsetzung zu klaeren. Foto-Upload veraendert keinen Schadensstatus und loest keinen Austausch oder Zahlungsvorgang aus.

### Testbare Akzeptanzkriterien

- Mehrere zulaessige Fotos lassen sich einem neuen und einem bestehenden Schadens-/Problemfall zuordnen und nach erneutem Oeffnen anzeigen; die Liste zeigt die korrekte Anzahl.
- Unzulaessige, beschaedigte oder zu grosse Dateien werden abgewiesen; Standort-/EXIF-Metadaten sind in gespeicherten Bildern entfernt. Konkrete Grenzwerte werden vor Umsetzung ergaenzt.
- Unberechtigte Nutzer koennen Fotos auch durch direkte API-Aufrufe nicht lesen, hochladen oder entfernen. Buchhaltung erhaelt keinen Zugriff auf Fotos nicht abrechenbarer Faelle.
- Die Graph-App kann auf die freigegebene Zielressource zugreifen und hat keinen Zugriff auf nicht freigegebene Ressourcen; dies wird mit positiven und negativen Integrationstests nachgewiesen.
- Fehlgeschlagene Einzeluploads bleiben sichtbar wiederholbar; Wiederholung dupliziert keine erfolgreich gespeicherten Fotos. Unvollstaendige Metadaten und verwaiste Dateien werden nachvollziehbar bereinigt.
- Umbenennen einer Datei innerhalb des Drives unterbricht die Zuordnung nicht; externe Loeschung erzeugt einen erkennbaren Hinweis statt einer still leeren Galerie.
- Jeder erfolgreiche Upload und jede zugelassene Entfernung besitzt einen vor normalen Bearbeitern geschuetzten Audit-Eintrag mit dem handelnden App-Nutzer.

### Offene Freigaben

- Freigabe der unten beschriebenen benannten Unterordnerstruktur unter dem bestaetigten Stamm `2.1_iPads und Applezeugs/CaseManagement/Cases`; der Stammordnername ist geklaert.
- Aufbewahrungsfrist, Loeschberechtigung, Entfernen nach Fallabschluss und Umgang mit Papierkorb/Retention.
- Entra-Administratorzustimmung, explizite Ressourcenfreigabe und verantwortliche Stelle fuer Zugangsdatenrotation und Betrieb.

Weitere Definition-of-Ready-Punkte: Formate einschliesslich HEIC, Datei-/Anzahlgrenzen, Foto-Leserechte und eventuelle Aufnahme von Fotos in den PDF-Bericht bestaetigen.

Technische Quellen: [Selected-Berechtigungen](https://learn.microsoft.com/en-us/graph/permissions-selected-overview), [Application-Authentifizierung](https://learn.microsoft.com/en-us/graph/auth-v2-service), [stabile Dateireferenzen](https://learn.microsoft.com/en-us/graph/onedrive-addressing-driveitems), [Downloadzugriff](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0).

## Offene Fragen

- Welche Pflichtfelder muss ein Schadensbericht enthalten?
- Wer unterschreibt: Eltern, Schüler, Lehrer oder mehrere Personen?
- Wird das PDF aus einer Vorlage generiert?
- Wo werden hochgeladene PDFs gespeichert?
- Soll der initiale Status nach Speichern `entwurf` oder direkt `offen` sein?
- Soll ein Verlust direkt als potenziell abrechenbar markiert werden oder immer erst nach Pruefung?


### Verbindliche Benennung der Schadensfallordner

Schema: `Schaden-<sechsstellig gepolsterte Nummer>_<Nachname>-<Vorname>`, beispielsweise `Schaden-000238_Mustermann-Max`. Nummern werden mindestens auf sechs Stellen gepolstert, niemals abgeschnitten. Der Ordnername wird bei Anlage aus dem damaligen Anzeigenamen erzeugt und danach bei Namens- oder Zuordnungsaenderungen nicht automatisch umbenannt. Unveraenderliche `damage_case.id` und SharePoint-Fallordner-Item-ID werden in Supabase festgehalten; Dateizugriffe verwenden weiterhin Drive-ID/Foto-Item-ID statt Namenspfade. Das Schema ersetzt den vorherigen UUID-Fallordnerentwurf.

Normalisierung fuer Namens- und Inventarnummernteile: Unicode nach NFC normalisieren; Steuerzeichen und SharePoint-inkompatible Zeichen (`"`, `*`, `:`, `<`, `>`, `?`, `/`, `\`, `|`) sowie vorsorglich `#` und `%` durch Bindestriche ersetzen; Leerraum und wiederholte Bindestriche zusammenfassen; Rand-Leerzeichen/-Punkte entfernen. Leere Namensteile erhalten `Unbekannt`. Laengen vor Anlage gegen aktuelle Graph-/SharePoint-Pfadgrenzen pruefen; Nummer bleibt vollstaendig, Namensteile werden bei Bedarf deterministisch gekuerzt. Der feste Prefix verhindert reservierte reine Dateinamen. Existierende Ordner niemals allein wegen Namensgleichheit uebernehmen: gespeicherte Fall-ID/Item-ID pruefen, unerwartete Kollision abweisen und protokollieren.

Ohne Benutzerzuordnung: `Schaden-000238_Inventar-<normalisierte Inventarnummer>`; bevorzugt Inventarnummer der betroffenen Komponente, sonst Set-Inventarnummer. Ohne belastbare Inventarnummer: `Schaden-000238_Ohne-Zuordnung`. Keine Namen aus Notizen ableiten. Spaetere Benutzerzuordnung fuehrt nicht zur automatischen Umbenennung.

Datenschutz: Benutzernamen werden dadurch auch in SharePoint-Ordnerlisten sichtbar und koennen historisch erhalten bleiben. Bibliotheks-/Ordnerrechte, Aufbewahrung und Auskunft/Korrektur muessen diesen ausdruecklich gewuenschten Namensbezug abdecken. Akzeptanz: exakte Beispielbenennung, Zeichen-/Laengennormalisierung, eindeutige Nummer trotz gleicher Namen, unveraenderter Ordner nach Namensaenderung und benutzerloser Inventar-Fallback werden getestet. Keine Ordner werden in der Planungsphase angelegt.


## Konkretisierter Foto-Workflow und Implementierungsplan

Stand 30.09.2026: Planung autorisiert, keine Implementierung oder externe Konfiguration bis zur Klaerung der offenen Admin-Angaben.

### Verbindlicher Ablauf

Die Sektion `Fotos / Dateien` erscheint unmittelbar unterhalb von `Zeugen`. Bei technischen Problemen ohne sichtbares Zeugenfeld steht sie am Ende der Schaden-/Problembeschreibung vor `Austausch`. Der erste Schnitt verarbeitet Bilddateien; allgemeine Dokumenttypen benoetigen eine eigene Freigabe.

1. Server validiert die Meldung und legt den Schadensfall in Supabase an; die vorhandene Sequenz liefert `damage_number`. Der Client erhaelt Fall-ID und Nummer, ohne die ausgewaehlten Dateien durch einen Redirect zu verlieren.
2. Server erzeugt automatisch und idempotent den benannten Fallordner unter dem bestaetigten Cases-Stamm und darin `Fotos`. Auch ein neuer Fall ohne ausgewaehlte Fotos erhaelt den Fallordner. Namenssnapshot und technische Ordnerreferenz werden dauerhaft gespeichert.
3. Auf dem iPad koennen mehrere Bilder ueber einen Dateiinput mit `multiple` ausgewaehlt werden. Kamera und Fotomediathek bleiben zugaenglich; eine gesonderte Kameraaktion darf `capture` nutzen, der allgemeine Mehrfachinput erzwingt es nicht. Kameraoptionen sind browserabhaengig und werden auf echtem iPad/Safari geprueft. Weitere Aufnahmen koennen zur Auswahl hinzugefuegt werden.
4. Dateien werden einzeln validiert, mit Fortschritt ueber die App hochgeladen und serverseitig in SharePoint abgelegt. Pro Datei werden stabile Drive-/Item-ID, Fall-ID, Dateiname, MIME-Typ, Groesse, Uploader und Zeitstempel in Supabase gespeichert. Servergenerierter Speicherdateiname und optionaler angezeigter Originaldateiname werden getrennt; Originalnamen sind untrusted und koennen personenbezogen sein.
5. Vorschau und Oeffnen stehen Leseberechtigten zur Verfuegung, Wiederholen den Uploadberechtigten und Entfernen nur den noch festzulegenden Loeschrollen. Fehler und Erfolg sind pro Datei sichtbar. Bei Ordnerfehler bleibt der Fall erhalten, Upload ist nachholbar; erneutes Speichern darf keinen zweiten Fall erzeugen.

Dieser Ablauf ist systemuebergreifend konsistent, aber keine gemeinsame atomare DB-/Graph-Transaktion. Supabase-Zustandswechsel samt Audit erfolgen jeweils transaktional; externe Operationen erhalten Idempotenz und Kompensation. Ein Ordner-/Fotofehler darf bereits gespeicherte Meldung oder bestehende Austauschfolgen nicht rueckgaengig machen. Die vorhandenen, nicht atomaren Austauschschritte beim Anlegen werden nicht stillschweigend durch diese Erweiterung repariert; ihre Fehler werden getrennt vom Upload ausgewiesen.

### Bestehende Einfuegestellen

- `src/app/sets/[setId]/damage/new/page.tsx`: `createDamageCase` liefert bereits `id,damage_number`, endet aber mit Redirect; fuer Dateiauswahl und Fortschritt ist ein strukturierter Rueckgabepfad an eine Client-Komponente erforderlich. Der Fotoabschnitt folgt dem vorhandenen Feld `witnesses`.
- `src/app/schadensfaelle/page.tsx`: gemeinsamer Fotoabschnitt unter Zeugen im Bearbeitungsdialog und Galerie in den Listendetails; `src/app/schadensfaelle/[id]/page.tsx` nutzt dieselbe Galerie. Die Tabelle erhaelt Fotoanzahl ohne einzelne Bildabfragen je Zeile.
- `src/lib/auth/current-user.ts` und bestehender Supabase-Serverclient bleiben Basis der Rollenpruefung. Uploader ist `app_user.id`, nicht ungeprueft eine Supabase-Auth-ID.
- Es gibt bisher keinen Upload-/Graph-Dienst und keine Foto-Migration. Bestehende Kategorien, Austausch-, Status- und PDF-Logik werden durch Fotoaktionen nicht geaendert.

### Umsetzungsschritte nach Freigabe

1. **Migration:** per Supabase CLI erzeugte Migration fuer `damage_case_folder` (eindeutige Fall-ID, Namenssnapshot, Parent-/Drive-/Folder-/Fotos-Folder-IDs, Status pending/ready/failed, Versuch-/Fehlerzeitpunkte), `damage_case_photo` (Metadaten, Status pending/uploading/ready/failed/deleting/deleted) und geschuetztes Foto-Audit. Eindeutigkeit fuer Fallordner, Drive-/Item-Paare und Idempotenzschluessel. Ein fallbezogener Erstellschluessel verhindert doppelte Meldungen nach Antwortverlust. Bestehende Faelle erhalten erst beim angeforderten Upload einen Ordner, kein Massen-Backfill und keine SQLite-Aenderung.
2. **RLS/Serverrechte:** Foto-SELECT nur wenn der verknuepfte Fall lesbar ist; Schreiben admin/ipad_verwaltung, Entfernen gemaess Freigabe. Graph-Referenzen, Speicherstatus und Audit sind serververwaltet und duerfen nicht beliebig durch direkte authentifizierte API-Schreibzugriffe manipulierbar sein. Minimal begrenzter privilegierter Finalisierungspfad mit erneuter Nutzer-/Fallpruefung, keine globale Service-Key-Autorisierung als Ersatz fuer Rollenpruefung. Audit fuer normale Bearbeiter weder aenderbar noch loeschbar.
3. **Graph-Dienst:** `src/lib/sharepoint/` als server-only Modul fuer Tokenbeschaffung, Ressourcenpruefung, Ordnererstellung, Upload, Download und Entfernen. Namensnormalisierung zentral. Konfiguration fuer Tenant-/Client-ID, serverseitiges Secret oder Zertifikat, Site-/Drive-/Cases-Item-ID; keinerlei Zugangsdaten oder Graph-Token im Browser. Konkurrenzschutz durch DB-Eindeutigkeit, bedingte Zustandswechsel und feste Datei-IDs; bestehende Ordner nur bei nachgewiesener Fallreferenz wiederverwenden.
4. **API-Vorschlag:** `POST /api/schadensfaelle/[id]/folder` zum Wiederholen der Ordnerbereitstellung; `GET/POST /api/schadensfaelle/[id]/photos` fuer Metadaten/Uploadinitialisierung; `PUT /api/schadensfaelle/[id]/photos/[photoId]/chunks` fuer begrenzte Dateiteile; `POST .../[photoId]/complete` fuer validierte Finalisierung; `GET .../[photoId]/content` und `/thumbnail` fuer autorisiertes Oeffnen/Vorschau; `DELETE .../[photoId]` fuer Entfernung. Graph-Uploadsession bleibt serverseitig, Browser sendet nur App-Dateiteile. Requests pruefen Session, Fallrolle, Fotozugehoerigkeit, Origin/CSRF und Grenzwerte. Keine frei uebergebenen Download-URLs als Proxyziel.
5. **Upload-Laufzeit:** vor Umsetzung Vercel-Request-/Laufzeitlimits verifizieren. Servervalidierung und EXIF-Entfernung benoetigen einen begrenzten serverseitigen Verarbeitungs-/Stagingpfad fuer zusammengesetzte Bilder; Vercel-Dateisystem wird nicht als dauerhafter Session-Speicher genutzt. Staging-Backend, Verarbeitungsgrenzen und angepasster Uploadpfad werden im ADR konkretisiert, bevor eine Chunk-Route implementiert wird. Gepruefte, gepinnte Bildbibliothek erst nach Formatentscheidung waehlen.
6. **UI:** gemeinsame Client-Komponente fuer Auswahl, neue Kameraaufnahmen, Vorschau, Fortschritt, Fehler, Wiederholen und Entfernen. Fall zuerst speichern, Dateiliste fuer folgende Uploads erhalten. Nach Reload sind serverseitig gespeicherte Zustaende sichtbar; nicht mehr im Browser verfuegbare Dateien muessen erneut ausgewaehlt werden. Upload in anderen Ansichten nachholbar. Icons gemaess Projekt-Skill/zentraler Zuordnung, beschriftete Aktionen und zugaengliche Fortschritts-/Fehleranzeigen.
7. **Tests:** Logiktests fuer Benennung, Normalisierung, Grenzen und Idempotenz; DB/RLS-Tests fuer jede Rolle sowie geschuetzte Metadaten/Audit; Graph-Vertragstests fuer Ordnerkollision, parallele Versuche, Tokenfehler, Timeout nach erfolgreicher Speicherung und gescheiterte Kompensation. UI-Tests fuer Mehrfachauswahl, Teilfehler, erneute Auswahl nach Reload und Fall-Erhalt bei Ordnerfehler. Getrennte Testablage fuer Integration; echte iPad-/Safari-Pruefung fuer Kamera/Mediathek; Typecheck, Lint und Build.

### Zusaetzliche Akzeptanz

- Neuer Fall erzeugt nach Vergabe der Nummer automatisch genau einen Fallordner mit bestaetigtem Namensschema; doppelte/konkurrierende Wiederholung erzeugt keinen zweiten Fall oder Ordner.
- Bei Ordnerfehler bleibt Fall samt Nummer erreichbar, zeigt einen Uploadhinweis und erlaubt nachtraegliche Bereitstellung.
- Fotos/Dateien steht unter Zeugen, auch mobil; bei Problemen ohne Zeugen an der beschriebenen entsprechenden Position.
- Mehrfachauswahl und weitere Kameraaufnahmen funktionieren auf iPad/Safari; Fortschritt und Teilfehler sind je Datei sichtbar.
- Pro fertiger Datei sind alle verlangten Metadaten vorhanden. Keine kurzlebigen Links werden als technische Schluessel gespeichert und keine Graph-Zugangsdaten an Browser ausgeliefert.

### Minimal noch benoetigte Admin-Angaben

Entra-Tenant und Appregistrierung/Client-ID, freigegebene serverseitige Authentifizierungsart, Administratorzustimmung und explizite Ressourcenfreigabe, verifizierte Graph-Site-/Drive-/Cases-Item-IDs, Testressource und Betriebsverantwortlicher. Geheimnisse nur ueber sichere Umgebungsverwaltung bereitstellen, nicht in Chat oder Repository. Fachlich weiterhin Formate/Grenzen, Lesen/Entfernen, Aufbewahrung und PDF-Aufnahme klaeren.


## Bestaetigter erster Umsetzungsschnitt: SharePoint-Verlinkung

Stand 30.09.2026: Der Nutzer autorisiert die Implementierung der schlanken Verlinkungsvariante auch ohne reale Entra-Geheimnisse. Dieser Abschnitt hat Vorrang vor dem integrierten Foto-Uploadentwurf.

Nach erfolgreichem Anlegen einer Meldung stellt die App serverseitig den benannten Fallordner direkt unter Cases bereit. Supabase speichert Namenssnapshot, Drive-ID, Item-ID, Web-URL und Bereitstellungsstatus. Unter Zeugen erscheint `Fotos in SharePoint öffnen`; vor dem Speichern ein Hinweis, dass der Ordner danach verfügbar wird. Nach dem Speichern öffnet die App das Schadensdetail. Upload/Kamera, Vorschau und Dateiverwaltung erfolgen in SharePoint mit eigener Microsoft-Anmeldung und den dortigen Benutzerrechten. App-Leserechte geben keine zusätzlichen SharePoint-Rechte. Keine integrierten Uploads, Foto-Tabelle, EXIF-Verarbeitung, Datei-Loeschaktionen oder Uploadsessions in diesem Schnitt.

Lesen der Ordnerreferenz folgt den bestehenden Fall-Leserechten, Bereitstellen/Wiederholen nur admin/ipad_verwaltung. Schreibzugriffe auf Ordnerstatus und geschuetztes Audit bleiben server-only. Fehlende Konfiguration oder Graph-Fehler erhalten die Meldung; Detail zeigt einen klaren Fehler und Wiederholen. Bereitstellung nutzt atomare DB-Reservierung mit Lease, Namenssnapshot und Versuch-ID. Wiederholung nach verlorener Graph-Antwort darf nur einen exakt passenden, vom konfigurierten App-Client erzeugten Ordner wiederverwenden; fremde Namenskollisionen werden abgewiesen. Derselbe Cases-Stamm darf nicht mit voneinander unabhaengigen Fallnummern-Sequenzen verwendet werden. Nach erfolgreicher Zuordnung bleiben Name und IDs unveraenderlich.

DB-Statusabschluss und Audit laufen zusammen in einer Transaktion. Kein Rollback des Schadensfalls bei Graph-Fehlern, keine automatische Loeschung externer Ordner. Audit erfasst Bereitstellungsversuch und Ergebnis mit App-Nutzer und Zeitpunkt; Uploads innerhalb SharePoint unterliegen dessen Audit/Retention, nicht einem vorgetaeuschten App-Dateiaudit.

Akzeptanz: korrekt benannter Ordner und sichere HTTPS-Web-URL; Wiederholung/Parallelaufruf ohne doppelte Ordner; fremde Kollision abgewiesen; fehlende Konfiguration erhaelt Fall und bietet Nachholen; read-only/Buchhaltung koennen keine Bereitstellung starten; direkter Zugriff auf fremde/nicht lesbare Faelle abgewiesen; geschuetzte DB-Metadaten und Audit; Oeffnen nur auf ezshde.sharepoint.com. Keine Graph-Zugangsdaten im Browser.

Noch noetig fuer Inbetriebnahme: Tenant-ID, Client-ID, serverseitiges Client-Secret, Drive-ID der Bibliothek und Item-ID des Cases-Ordners, Selected-Adminzustimmung plus explizite Ressourcenfreigabe, schulische Microsoft-Benutzerrechte und Testablage. Die Site-ID ist fuer den gewaehlten direkten Drive-/Item-Zugriff nicht zwingend. Datenmigration und produktiver Graph-Test werden erst nach Bereitstellung dieser Angaben ausgefuehrt.

### Verifikation des Verlinkungsschnitts am 30.09.2026

14 neue Logik-, Graph-, Service-, API- und UI-Tests sowie 10 bestehende Ladepfadtests bestehen. Die echte Ordner-Migration besteht in isoliertem PostgreSQL (PGlite 0.5.8) mit minimalem Rollenschema: RLS/Grants, Lease, Snapshot, Finalisierung und Audit getestet. TypeScript, gezieltes ESLint und Produktionsbuild bestehen; Build benoetigte wegen lokaler Worker-Ports Ausfuehrung ausserhalb der Sandbox. Keine reale Supabase-Migration, Graph-Konfiguration, Ordneranlage oder Dateioperation ausgefuehrt. Echtintegration und iPad-Test warten auf Adminangaben. Inbetriebnahme und sichere Umgebungsvariablen: `specs/data/sharepoint-folder-operations.md`.
