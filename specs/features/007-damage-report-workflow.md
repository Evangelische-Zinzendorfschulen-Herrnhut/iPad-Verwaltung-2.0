# Feature: Schadens- oder Problemmeldung mit PDF-Bericht

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

Aus der Schadensfallliste koennen bestehende Datensaetze von `admin` und `ipad_verwaltung` bearbeitet werden. `buchhaltung` bleibt lesend und sieht keine Bearbeiten-Aktion.

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
- Bearbeiter, Austauschstatus, Ersatz-Ausgabedatum und interne Notiz

Nicht im Listenformular bearbeitet werden Verknuepfungen zu Person, Set, Komponente, Ersatzset und Ersatzkomponente. Diese Zuordnungen bleiben sichtbar, weil ihre Aenderung eigene fachliche Folgeprozesse betrifft.

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

## Offene Fragen

- Welche Pflichtfelder muss ein Schadensbericht enthalten?
- Wer unterschreibt: Eltern, Schüler, Lehrer oder mehrere Personen?
- Wird das PDF aus einer Vorlage generiert?
- Wo werden hochgeladene PDFs gespeichert?
- Soll der initiale Status nach Speichern `entwurf` oder direkt `offen` sein?
- Soll ein Verlust direkt als potenziell abrechenbar markiert werden oder immer erst nach Pruefung?
