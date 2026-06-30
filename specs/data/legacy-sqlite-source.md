# Legacy SQLite Datenquelle

## Datei

`db/iPad-Verwaltung.db`

Diese SQLite-Datenbank enthaelt die bisherige Verwaltungsdatenbank. Sie dient als Datenquelle fuer Migration, Analyse und Datenbereinigung. Sie ist nicht als fehlerfreie fachliche Wahrheit zu behandeln.

## Tabellen

| Tabelle | Zeilen | Zweck im Import |
| --- | ---: | --- |
| Device | 2112 | Komponenten und Zubehoerbestand |
| Sets | 667 | bisherige Set-Zuordnungen und Vollstaendigkeitsfelder |
| User | 721 | Personen/Schueler/Nutzer |
| SetUserZuordnung | 570 | Ausgabe- und Rueckgabehistorie |
| Schaden | 378 | Schadens- und Austauschhistorie |
| Rechnung | 8 | Einkaufs-/Rechnungsstammdaten |
| Rechnungsposition | 15 | Einkaufs-/Positionsdaten |

## Relevante Quellfelder

### Device

- `InvNr`
- `SetNr`
- `Kategorie`
- `Typ`
- `Status`
- `Seriennummer`
- `RechnungsPositionsNr`
- `Anmerkungen`
- `Lager`

### Sets

- `SetID`
- `UserID`
- `SetStatus`
- `iPad`
- `Pencil`
- `Tastatur`
- `Standort`
- `Anmerkung`
- `iPadVorhanden`
- `NetzteilVorhanden`
- `LadekabelVorhanden`
- `PencilVorhanden`
- `PencilKappeVorhanden`
- `TastaturVorhanden`

### SetUserZuordnung

- `UserID`
- `SetID`
- `AusgabeDatum`
- `RueckgabeDatum`
- `Status`
- `AusgabeBemerkung`
- `RueckgabeBemerkung`
- Rueckgabe-Vollstaendigkeitsfelder

### User

- `UserID`
- `Vorname`
- `Nachname`
- `Email`
- `BenutzerTyp`
- `Jahrgang`
- `Klasse`
- `Anmerkung`

Analyse `BenutzerTyp`:

- Schüler: 578
- Schüler - Ausgeschieden: 64
- Lehrer: 60
- Mitarbeiter: 5
- Lehrer - Ausgeschieden: 3
- Dublette: 3
- Testuser: 2
- weitere Einzelfaelle, z. B. Schulsozialarbeit, Referendarin, Praktikant, Lehrer - Verstorben, leer

Importregel:

- `BenutzerTyp` wird nicht 1:1 als Typ uebernommen.
- Zielmodell trennt `person_typ` und `status`.
- `Schüler` wird `person_typ = schueler`, `status = aktiv`.
- `Schüler - Ausgeschieden` wird `person_typ = schueler`, `status = ausgeschieden`.
- `Lehrer` wird `person_typ = lehrer`, `status = aktiv`.
- `Lehrer - Ausgeschieden` und `Lehrer - ausgeschieden` werden `person_typ = lehrer`, `status = ausgeschieden`.
- `Lehrer - Verstorben` wird `person_typ = lehrer`, `status = verstorben`.
- `Mitarbeiter` und `Schulsozialarbeit` werden als `person_typ = mitarbeiter` importiert.
- `Referendarin` wird als `person_typ = referendar` importiert.
- `Praktikant` wird als `person_typ = praktikant` importiert.
- `Dublette` wird `status = dublette`.
- `Testuser` wird `status = test`.
- Leere oder unbekannte Werte werden mit `status = unklar` markiert.

Fachliche Hinweise:

- Bei Schuelern ist `Jahrgang` der Schuleintritt in Klasse 5 und bleibt konstant.
- Schueler, die nicht in Klasse 5 an die Schule kommen, erhalten den Jahrgang, der ihrer Eintrittsklasse entspricht.
- `Klasse` aendert sich jaehrlich.
- Die konkrete Klasse wird einzeln importiert, auch wenn die erwartete Stufe aus Jahrgang und Schuljahr berechnet werden kann.
- In Stufe 10 sind Klassen `10-1` bis `10-4` moeglich.
- In der Oberstufe gibt es Jahrgangsgruppen wie `11JG2019` und `12JG2018`.

### Schaden

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
- `Kurzbeschreibung`
- `SchadenBeschreibung`
- `BetroffeneKomponenten`

### Rechnung

- `RechnungsNr`
- `RechnungsDatum`
- `Lieferant`

### Rechnungsposition

- `RechnungsPositionsNr`
- `Titel`
- `Einzelpreis`
- `Anzahl`
- `RechnungsNr`

## Erste Analyse

Device-Kategorien:

- Pencil: 686
- iPad: 653
- Tastatur: 653
- Adapter: 70
- Maus: 50

Fachliche Einordnung:

- `iPad`, `Pencil` und `Tastatur` sind Hauptkomponenten des Grundsets.
- `Adapter` ist Zubehoer beziehungsweise Zusatzmaterial, nicht Teil der Set-Identitaet.
- `Maus` steht fuer Magic-Maeuse; diese werden nur auf Anfrage ausgegeben und gehoeren nicht zum Grundset.

Set-Statuswerte enthalten u. a.:

- OK
- unvollstaendig
- defekt
- nicht zugeordnet
- Zuruecksetzen
- Ausgegeben
- Geraetetausch neu/alt
- Pruefung Rueckgabe
- verloren

Device-Statuswerte enthalten u. a.:

- ok
- defekt
- leer
- ausgemustert
- unklar
- gesperrt, kein MDM
- unvollstaendig
- fehlt
- Reparatur
- verloren

## Bekannte Datenqualitaetsrisiken

- `Sets.iPad`, `Sets.Pencil` und `Sets.Tastatur` verweisen zwar auf existierende `Device.InvNr`, aber es gibt fehlende Komponenten in Sets.
- Einige Komponenten sind in mehreren Sets eingetragen.
- Der zweite Zahlenblock der Inventarnummer ist historisch und darf nicht als aktuelle Set-Zuordnung interpretiert werden.
- Bei iPad-Schäden wurde fachlich in der Regel das ganze Set getauscht. Eine abweichende iPad-Inventarnummer in `Sets.iPad`, deren letzte Slash-Ziffern nicht zu `Sets.SetID` passen, darf deshalb nicht als aktiver iPad-Komponententausch in dieses Set importiert werden.
- Bei Pencil- und Tastatur-Schäden wurde in der Regel nur die betroffene Komponente getauscht. Abweichende Slash-Ziffern bei `Sets.Pencil` oder `Sets.Tastatur` koennen daher als aktive Komponenten-Zuordnung importiert werden, muessen aber als Bereinigungs-/Tauschhinweis nachvollziehbar bleiben.
- Statuswerte sind nicht normalisiert.
- Leerwerte in Statusfeldern muessen beim Import fachlich bewertet werden.
- Vollstaendigkeitsfelder existieren bereits teilweise, sind aber wahrscheinlich nicht vollstaendig oder konsistent.
- Statuswerte werden kuenftig in getrennte Dimensionen normalisiert: Komponenten-Zustand, Komponenten-Verfuegbarkeit, Set-Zustand, Set-Verfuegbarkeit und Ausleihstatus.

## Importprinzipien

- Legacy-Daten nur lesend analysieren.
- Import in neue Struktur immer mit Validierungsbericht.
- Jede importierte Zeile braucht eine Rueckverknuepfung zur Legacy-Quelle.
- Inkonsistente Sets nicht still korrigieren, sondern als Importwarnung markieren.
- Aktive Set-Zuordnung in der neuen App aus `Sets` uebernehmen, aber Dubletten und fehlende Komponenten markieren.
- Fuer `Sets.iPad` nur dann eine aktive Set-Komponenten-Zuordnung importieren, wenn die letzten Slash-Ziffern der iPad-Inventarnummer zur `SetID` passen. Abweichungen werden als Settausch-Hinweis behandelt.
- Fuer `Sets.Pencil` und `Sets.Tastatur` duerfen abweichende Slash-Ziffern als Komponentenwechsel importiert werden, sofern die Komponente eindeutig ist und keine aktive Doppelzuordnung entsteht.
- Historische Ausgabe/Rueckgabe aus `SetUserZuordnung` uebernehmen, wenn Person und Set aufloesbar sind.
- Schaeden aus `Schaden` uebernehmen und mit Komponenten, Sets und Zuordnungen verknuepfen, soweit eindeutig.
- Originalstatuswerte behalten und normalisierte Statuswerte zunaechst app-seitig oder im Import berechnen.

## Ziel-Mapping, erster Entwurf

| Legacy | Zielmodell |
| --- | --- |
| Device | Komponente |
| Device.Kategorie | KomponentenKategorie |
| Device.Typ | Modell/Variante |
| Sets | Set |
| Sets.iPad/Pencil/Tastatur | Set-Komponentenzuordnung |
| User | Person |
| User.Vorname | Person.Vorname |
| User.Nachname | Person.Nachname |
| User.Email | Person.E-Mail |
| User.BenutzerTyp | Personentyp + Personenstatus |
| User.Jahrgang | Person.Jahrgang |
| User.Klasse | Klasse + PersonKlassenZuordnung |
| User.Anmerkung | Person.Anmerkungen |
| SetUserZuordnung | Ausleihe |
| Device.Status | Komponenten-Zustand + Komponenten-Verfuegbarkeit + Importhinweis |
| Sets.SetStatus | Set-Zustand + Set-Verfuegbarkeit + Importhinweis |
| SetUserZuordnung.Status | Ausleihstatus + Importhinweis |
| Rueckgabe*-Vorhanden | AusleiheKomponentenCheck oder KomponentenZubehoerCheck |
| Schaden | Schadensfall |
| Rechnung | Einkaufsrechnung |
| Rechnungsposition | Einkaufs-/Beschaffungsposition |
| Device.RechnungsPositionsNr | Komponenten-Verknuepfung zur Rechnungsposition |

## Offene Importfragen

- Sind alle `Adapter`-Eintraege Lightning-USB-Adapter, oder enthaelt die Kategorie weitere Adapterarten?
- Sollen `Maus`-Eintraege als inventarisierte Zusatzartikel migriert werden?
- Welche Hersteller- und Modellwerte koennen aus Legacy-Feldern abgeleitet werden und welche muessen manuell ergaenzt werden?
- Sollen weitere Legacy-`BenutzerTyp`-Sonderfaelle eigene Personentypen werden?
- Welche Prozesswerte sollen als eigene Workflow-Zustaende modelliert werden?
- Welche Legacy-Set-Dubletten sollen automatisch markiert werden?
