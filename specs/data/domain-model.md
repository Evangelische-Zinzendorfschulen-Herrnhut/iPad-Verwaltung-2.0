# Fachliches Datenmodell

## Kernobjekte

### Person

Repraesentiert eine schulische Person oder einen externen Kontakt.

Moegliche Typen:

- Schueler
- Sorgeberechtigte
- Mitarbeitende
- externe Dienstleister

Ausleihrelevante Personentypen im MVP:

- schueler
- lehrer
- mitarbeiter
- referendar
- praktikant

Hinweise:

- Schulsozialarbeit wird als `mitarbeiter` gefuehrt.
- Referendare und Praktikanten sind eigene Personentypen.
- Fuer Referendare und Praktikanten gelten vorlaeufig dieselben Ausgabe- und Rueckgaberegeln wie fuer Lehrer.

Personenstatus:

- aktiv
- ausgeschieden
- verstorben
- dublette
- test
- unklar

Wichtige Felder:

- Vorname
- Nachname
- E-Mail
- Personentyp, z. B. schueler, lehrer, mitarbeiter
- Status
- Jahrgang, nur fuer Schueler
- Klasse, vor allem fuer Schueler
- Anmerkungen

Regeln:

- Personentyp und Status werden getrennt gespeichert.
- Der Jahrgang beschreibt bei Schuelern den Schuleintritt in Klasse 5 und bleibt ueber die Schulzeit konstant.
- Schueler, die nicht in Klasse 5 an die Schule kommen, erhalten den Jahrgang, der ihrer Eintrittsklasse entspricht.
- Die Klassenstufe ist normalerweise aus Jahrgang und aktuellem Schuljahr berechenbar.
- Die konkrete Klasse muss trotzdem einzeln gefuehrt werden, weil Schueler eine Klasse wiederholen oder innerhalb der Schule die Klasse wechseln koennen.

### Klasse

Konkrete organisatorische Klasse oder Jahrgangsgruppe in einem Schuljahr.

Wichtige Felder:

- Schuljahr
- Jahrgang, z. B. 2019
- Stufe, z. B. 5 bis 12
- Bezeichnung, z. B. `09-2`, `10-4`, `11JG2019`
- Zug optional, z. B. 1, 2, 3, 4
- ist_oberstufe
- aktiv

Regeln:

- Die Schule ist normalerweise dreizuegig in den Stufen 5 bis 9.
- In Stufe 10 kann es vier Klassen geben, z. B. `10-1` bis `10-4`.
- In der Oberstufe, Stufen 11 und 12, gibt es keine Klassen im engeren Sinn, sondern Jahrgangsgruppen, z. B. `11JG2019` oder `12JG2018`.
- Die Klasse einer Person wird als konkrete Zuordnung gefuehrt und nicht nur berechnet.
- Aus Jahrgang und Schuljahr kann eine erwartete Stufe vorgeschlagen werden.

### Schuljahr

Schulischer Zeitraum ueber zwei Kalenderjahre.

Beispiele:

- `2025/26`
- `2026/27`

Regeln:

- Ein Schuljahr startet am 1.8. des ersten Kalenderjahres.
- Ein Schuljahr endet am 31.7. des zweiten Kalenderjahres.
- Das aktuelle Schuljahr kann automatisch anhand des aktuellen Datums bestimmt werden.
- Beispiel: Der Zeitraum 01.08.2025 bis 31.07.2026 ist Schuljahr `2025/26`.
- Ein kommendes Schuljahr kann vor dem 01.08. vorbereitet werden.
- Vorbereitete Klassen- und Personenzuordnungen werden erst mit Aktivierung des neuen Schuljahres wirksam.
- Ein vorbereitetes Schuljahr wird automatisch am 01.08. aktiv.
- `admin` kann die Aktivierung manuell anstossen.

Status:

- geplant
- vorbereitet
- aktiv
- abgeschlossen

### PersonKlassenZuordnung

Historisierte Zuordnung einer Person zu einer Klasse oder Jahrgangsgruppe.

Wichtige Felder:

- Person
- Klasse
- gueltig_ab
- gueltig_bis optional
- Quelle, z. B. Import oder manuell
- Notiz optional

Regeln:

- Eine aktive Schueler-Person soll genau eine aktuelle Klassen-/Jahrgangsgruppenzuordnung haben.
- Wiederholung oder Klassenwechsel werden durch neue Zuordnungen abgebildet.
- Zum Schuljahreswechsel kann die App neue Zuordnungen vorschlagen.
- Vorschläge sollen gesammelt uebernehmbar sein.
- Einzelne Wiederholer oder Klassenwechsler werden manuell angepasst.

### Benutzerkonto

Login-faehige Identitaet fuer Mitarbeitende.

Wichtige Felder:

- E-Mail
- Anzeigename
- Auth-Provider-ID
- Auth-Provider, z. B. Supabase oder Univention
- externe Provider-Subjekt-ID
- aktive Rollen
- Status
- letzter Login

### AuthIdentity

Verknuepft ein lokales Benutzerkonto mit einer externen Login-Identitaet.

Wichtige Felder:

- Benutzerkonto-ID
- Provider, z. B. supabase oder univention
- Provider-User-ID
- E-Mail zum Zeitpunkt der Verknuepfung
- verknuepft seit
- zuletzt gesehen

## Vorgeschlagene Auth-Tabellen fuer MVP

### app_user

Lokales fachliches Benutzerprofil.

Felder:

- id
- email
- display_name
- status
- created_at
- updated_at
- last_seen_at

### auth_identity

Zuordnung zwischen lokalem Benutzer und Login-Provider.

Felder:

- id
- app_user_id
- provider
- provider_user_id
- provider_email
- created_at
- last_seen_at

### role

Fachliche Rolle.

Felder:

- id
- key
- name
- description

### user_role

Zuordnung von Benutzern zu Rollen.

Felder:

- app_user_id
- role_id
- assigned_by
- assigned_at

### Rolle

Fachliche Berechtigung innerhalb der App.

Erste Rollen:

- admin
- ipad_verwaltung
- buchhaltung
- sekretariat, spaeter
- it, spaeter oder in admin enthalten
- schulleitung, spaeter
- readonly, spaeter

### KomponentenKategorie

Beschreibt die fachliche Kategorie einer inventarisierbaren oder ausgebbaren Sache.

Beispiele:

- iPad
- Pencil
- Tastatur
- Adapter
- Maus
- HDMI-Kabel
- Netzteil
- Kabel

Startkategorien:

- iPad
- Pencil
- Tastatur
- Adapter
- HDMI-Kabel
- Netzteil
- Kabel
- Magic-Maus

Wichtige Felder:

- Name
- slug
- ist_hauptkomponente
- ist_zubehoer
- ist_zusatzartikel
- inventarnummer_erforderlich
- seriennummer_erforderlich
- kann_in_set_enthalten_sein
- kann_separat_ausgegeben_werden
- standard_rueckgabefrist_tage optional
- aktiv

Regeln:

- Neue Komponenten- und Zubehoerkategorien muessen ohne Schemaaenderung anlegbar sein.
- Das MVP nutzt iPad, Pencil und Tastatur als Hauptkomponenten des Grundsets.
- Adapter und Magic-Maeuse sind Zusatzartikel, koennen aber weiterhin inventarisiert sein.
- Weitere Startkategorien sind derzeit nicht vorgesehen.

### Komponente

Eine physische Komponente eines iPad-Sets.

Komponententypen im MVP:

- ipad
- pencil
- tastatur

Bekannte Modelle/Varianten im Bestand:

- Apple Pencil 1. Gen.
- Tucano Pencil 1. Gen.
- Logitech Slim Folio/Slimline
- Logitech Combo Touch

Wichtige Felder:

- Inventarnummer
- Inventarnummer-Praefix, z. B. `E123456`
- historischer Set-Nummernblock, z. B. `1234`
- Seriennummer
- KomponentenKategorie
- Modell
- Hersteller
- Generation/Variante
- interne Bezeichnung
- Beschreibung
- Speicher/Farbe
- Kaufdatum
- Anschaffungspreis optional
- Garantieinformationen
- MDM-ID
- aktueller Status
- aktueller Standort
- Lagerort
- Quelle/Legacy-ID optional

Hinweise:

- Bei `ipad` ist eine Seriennummer verpflichtend.
- Pencil und Tastatur haben eigene Inventarnummern.
- Inventarnummern haben das Format `E123456 / 1234`.
- Der zweite Zahlenblock war urspruenglich als Set-Nummer gedacht, ist durch Schaeden und Tauschaktionen aber nicht mehr verlaesslich.
- Die aktuelle Set-Zuordnung muss deshalb separat modelliert werden.
- Der Begriff `tastatur` meint im Projekt die Huelle mit Tastatur.

### ZubehoerTyp

Beschreibt erwartetes Zubehoer fuer eine Komponente oder Komponentenvariante.

Beispiele:

- Netzteil zum iPad
- Kabel zum iPad
- Kappe fuer Apple Pencil 1. Gen.
- USB-C-Ladekabel fuer Tucano Pencil 1. Gen.
- Lightning-USB-Adapter fuer Lehrer standardmaessig sowie fuer Schueler und Mitarbeiter optional
- HDMI-Kabel fuer Lehrer standardmaessig

Wichtige Felder:

- Name
- gehoert zu Komponententyp
- gehoert optional zu Modell/Variante
- gilt fuer Personentyp optional
- Ausgabeart, z. B. standard oder optional_auf_anfrage
- ersatzpflichtig

Hinweise:

- Lightning-USB-Adapter und HDMI-Kabel haben aktuell keine Inventarnummer.
- Magic-Maeuse werden nur auf Anfrage ausgegeben und gehoeren nicht zum Standard-Set.

### ZusatzartikelAusgabe

Dokumentiert optionale oder nicht zum Grundset gehoerende Zusatzartikel.

Beispiele:

- Lightning-USB-Adapter fuer Schueler und Mitarbeiter auf Anfrage beziehungsweise temporaer
- Magic-Maus auf Anfrage

Wichtige Felder:

- Ausleihe
- Artikeltyp
- Anzahl
- AusgabeDatum
- RueckgabeDatum optional
- erwartetes RueckgabeDatum optional
- Zustand bei Ausgabe
- Zustand bei Rueckgabe optional
- Notiz

Regeln:

- Fuer temporaer an Schueler ausgegebene Lightning-USB-Adapter betraegt die Rueckgabefrist 14 Tage.
- Weitere Zusatzartikel und Kategorien sollen ohne Schemaaenderung ergaenzbar sein.

### KomponentenZubehoerCheck

Dokumentiert bei Ausgabe oder Rueckgabe, ob erwartetes Zubehoer vorhanden ist.

Wichtige Felder:

- Ausleihe
- Komponente
- ZubehoerTyp
- Pruefzeitpunkt, z. B. ausgabe oder rueckgabe
- vorhanden
- fehlt
- beschaedigt
- Notiz
- abrechenbar
- Betrag optional

### Ersatzpreis

Versionierter Ersatzbetrag fuer fehlende oder beschaedigte Komponenten und Zubehoerteile.

Wichtige Felder:

- id
- Zieltyp, z. B. Komponententyp, Komponentenmodell oder ZubehoerTyp
- Ziel-ID oder Zielschluessel
- Betrag
- Waehrung
- gueltig_ab
- gueltig_bis optional
- aktiv
- Notiz
- erstellt_von
- erstellt_am

Regeln:

- Ersatzpreise werden nicht ueberschrieben, sondern versioniert.
- Pro Ziel darf es zu einem Zeitpunkt nur einen aktiven gueltigen Ersatzpreis geben.
- Beim Erzeugen einer Abrechnung/Zahlungsforderung wird der zu diesem Zeitpunkt gueltige Betrag als Snapshot am Zahlungsvorgang gespeichert.
- Aeltere Abrechnungen duerfen sich nicht veraendern, wenn ein Ersatzpreis spaeter angepasst wird.

### Set

Eine feste verwaltete Kombination aus genau drei Komponenten: iPad, Pencil und Tastatur.

Wichtige Felder:

- Set-Nummer
- Name
- Schuljahr
- Status
- Lagerort, besonders fuer freie oder blockierte Sets
- Lagerplatz optional
- iPad-Komponente
- Pencil-Komponente
- Tastatur-Komponente
- zugeordnete Person optional
- Ausgabeart, z. B. personengebunden oder lagergebunden

Regeln:

- Ein aktives Set enthaelt genau ein iPad, genau einen Pencil und genau eine Tastatur.
- Eine Komponente kann zur selben Zeit nur in einem aktiven Set enthalten sein.
- Ein Set kann nur ausgegeben werden, wenn alle drei Komponenten verfuegbar und nicht gesperrt sind.
- Die Set-Zuordnung basiert auf der separaten Set-Tabelle, nicht auf dem zweiten Zahlenblock der Inventarnummer.
- Das Grundset bleibt immer iPad, Pencil und Tastatur. Rollenabhaengiges Zusatzmaterial wird nicht Teil der Set-Identitaet.
- Freie und blockierte Sets duerfen aufgetrennt werden, um andere Sets zu vervollstaendigen.
- Ausgegebene Sets duerfen nicht ohne Ruecknahme aufgetrennt werden.
- Komponenten-Neuzuordnungen muessen historisiert und auditierbar sein.
- Fuer freie und blockierte Sets soll ein Lagerort dokumentierbar sein.
- Sets werden immer Personen zugeordnet.
- Schueler sind immer einer Klasse zugeordnet.
- Bei Schuelern der 5. und 6. Klassen werden Sets einer Person zugeordnet, aber nicht physisch ausgegeben; sie verbleiben im Lager beziehungsweise in Lagerwaegen.
- Ab Klasse 7 werden zugeordnete Sets auch physisch ausgegeben.
- Wagenplaetze sollen vorrangig mit kompletten Sets belegt werden.

### Lagerort

Ort, an dem freie oder blockierte Sets beziehungsweise einzelne Komponenten gelagert werden.

Startwerte:

- W1, Typ iPadwagen, 30 Plätze
- W2, Typ iPadwagen, 30 Plätze
- W3, Typ iPadwagen, 30 Plätze
- W4, Typ iPadwagen, 30 Plätze
- W5, Typ iPadwagen, 30 Plätze
- W6, Typ iPadwagen, 30 Plätze
- Schrank1
- Schrank2
- Regal1

Wichtige Felder:

- Name
- Typ, z. B. iPadwagen, Schrank, Regal
- Kapazität optional
- hat_plaetze
- aktiv
- Notiz optional

Regeln:

- iPadwägen W1 bis W6 haben jeweils Plätze 1 bis 30.
- Schrank1, Schrank2 und Regal1 haben vorerst keine festen Plätze.

### Lagerplatz

Konkreter Platz innerhalb eines Lagerorts.

Wichtige Felder:

- Lagerort
- Platznummer
- Bezeichnung, z. B. `W1-01`
- aktiv

Regeln:

- Pro iPadwagen werden die Plätze 1 bis 30 als Lagerplätze angelegt.
- Ein Lagerplatz kann zur selben Zeit nur durch ein Set oder eine einzelne lagernde Komponente belegt sein.
- Wagenplätze sollen vorrangig durch komplette Sets belegt werden.
- Einzelkomponenten sollen nur dann Wagenplätze belegen, wenn sie nicht sinnvoll in Schrank oder Regal gelagert werden können.
- Der Lagerplatz ist optional, wenn der Lagerort keine festen Plätze hat.

### SetKomponentenZuordnung

Historisierte Zuordnung einer Komponente zu einem Set.

Wichtige Felder:

- Set
- Komponente
- Slot, z. B. ipad, pencil, tastatur
- gueltig_ab
- gueltig_bis optional
- Grund, z. B. Set-Auftrennung, Ersatz, Reparatur, Rueckgabepruefung
- erstellt_von

Regeln:

- Pro Set darf je Slot zu einem Zeitpunkt nur eine aktive Komponente zugeordnet sein.
- Pro Komponente darf zu einem Zeitpunkt nur eine aktive Set-Zuordnung existieren.
- Alte Zuordnungen werden beendet, nicht geloescht.

### Ausleihe

Zeitliche Zuordnung eines iPad-Sets an eine Person.

Wichtige Felder:

- ausleihende Person
- Set
- Ausgabedatum
- Rueckgabedatum
- Zustand bei Ausgabe
- Zustand bei Rueckgabe
- Dokumente/Unterschriften
- Status

### AusleiheKomponentenCheck

Zustands- und Vollstaendigkeitsdokumentation pro Set-Komponente bei Ausgabe oder Rueckgabe.

Wichtige Felder:

- Ausleihe
- Komponente
- Pruefzeitpunkt, z. B. ausgabe oder rueckgabe
- Zustand
- fehlt
- beschaedigt
- Notiz
- Foto/Dokument optional
- abrechenbar
- Betrag optional

### Zahlungsvorgang

Finanzieller Vorgang zu einer Ausleihe, Kaution, Reparatur oder Ersatzbeschaffung.

Wichtige Felder:

- Bezugsperson
- Betrag
- Zahlungsart
- Faelligkeit
- Zahlungsstatus
- Buchungsreferenz
- Kostenstelle
- Bezug zu fehlender oder beschaedigter Komponente/Zubehoer optional
- verwendeter Ersatzpreis-Snapshot
- Ersatzpreis-ID optional
- erstellt_von
- Buchhaltung-benachrichtigt-am optional

### Benachrichtigung

Dokumentiert systemseitige Benachrichtigungen, z. B. Mail an die Buchhaltung bei neuer Zahlungsforderung.

Wichtige Felder:

- Empfaengerrolle oder Empfaengeradresse
- Bezug zu Objekt, z. B. Zahlungsvorgang
- Kanal, z. B. email
- Status
- gesendet_am
- Fehlertext optional

Initiale Konfiguration:

- Buchhaltung-Empfaenger: anja.desmaretz@ezsh.de

### Schadensfall

Dokumentierter Schaden, Verlust oder technischer Defekt.

Wichtige Felder:

- betroffenes Geraet
- betroffenes Zubehoer optional
- meldende Person
- Datum
- Beschreibung
- Fotos/Dokumente
- Verantwortlichkeit
- Kostenentscheidung
- Status

### Reparatur

Technischer Reparatur- oder Servicevorgang.

Wichtige Felder:

- betroffenes Geraet
- Dienstleister
- Einsendedatum
- Ruecklaufdatum
- Kosten
- Status
- Ersatzgeraet

### Dokument

Datei oder Nachweis zu einem Prozess.

Wichtige Felder:

- Dokumenttyp
- Bezug zu Person, Geraet, Ausleihe oder Schadensfall
- Speicherort
- Erstelldatum
- Aufbewahrungsfrist

### AuditLog

Unveraenderliche Historie kritischer Aktionen.

Wichtige Felder:

- Akteur
- Aktion
- Objektart
- Objekt-ID
- alter Wert
- neuer Wert
- Zeitpunkt
- IP/User-Agent optional

## Statuswerte

Komponenten-Zustand:

| Wert | UI-Label |
| --- | --- |
| ok | OK |
| beschaedigt | Beschädigt, nutzbar |
| defekt | Defekt |
| unklar | Unklar |

Komponenten-Verfuegbarkeit:

- verfuegbar
- ausgegeben
- reserviert
- in_reparatur
- gesperrt
- verloren
- ausgemustert
- unklar

Set-Zustand:

- ok
- unvollstaendig
- defekt
- unklar

Set-Verfuegbarkeit:

- verfuegbar
- ausgegeben
- blockiert
- in_pruefung
- unklar

Ausleihe:

- geplant
- aktiv
- abgeschlossen
- storniert
- unklar

Zahlung:

- offen
- teilweise_bezahlt
- bezahlt
- gemahnt
- erlassen

Schadensfall:

- gemeldet
- in_pruefung
- wartet_auf_entscheidung
- in_reparatur
- abgeschlossen

## Offene Modellierungsfragen

- Wird ein Set dauerhaft einer Klasse zugeordnet oder flexibel pro Ausleihe?
- Werden Schuelerdaten importiert oder manuell gepflegt?
- Gibt es Eltern-/Schuelerzugriff oder nur interne Mitarbeitende ueber Univention SSO?
- Muss MDM synchronisiert werden oder reicht manuelle Dokumentation?
- Welche Ersatzbetraege gelten fuer fehlende oder beschaedigte Zubehoerteile?
