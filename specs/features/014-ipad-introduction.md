# Feature: Set-Verfuegbarkeit iPad-Einfuehrung

## Status

Produktiv migriert, 08.10.2026, nach ausdruecklicher Nutzerfreigabe im Voice-Chat.
Datumslogik, interner Schadenstausch und Kompletttausch sind fachlich entschieden.
Die 26 geeigneten Sets in W4 wurden gesammelt auf `ipad_einfuehrung` gesetzt.
Weitere Bestandsumstellungen benoetigen einen eigenen Auftrag.

## Ziel und bestaetigte Bedeutung

`iPad-Einfuehrung` bezeichnet die Erstausgabe eines Sets an eine Schuelerin oder
einen Schueler zur eingeschraenkten Unterrichtsnutzung. Das Set ist personengebunden,
bleibt physisch im iPad-Wagen und darf noch nicht mit nach Hause genommen werden.
Wagen W1 bis W6 und konkreter Platz 1 bis 30 sind zwingend erforderlich. Schaden und technische Probleme muessen
bereits gemeldet werden koennen.

`zugeordnet` bezeichnet dagegen ausschliesslich Vorbereitung ohne Nutzung.
Eine bestehende Personenzuordnung oder Klassenstufe allein belegt keine Einfuehrung.

## Arbeitsgrundlage

Laut Bestandsaufnahme im Arbeitsdialog sind `frei`, `zugeordnet`, `ausgegeben`,
`blockiert` und `unklar` im Datenbank-Enum speicherbar. `reserviert` und
`zuruecksetzen` sind nur in der Oberflaeche vorbereitet. `iPad-Einfuehrung` ist
lokal als neuer stabiler Enum-Wert `ipad_einfuehrung` implementiert.

Die aktuelle Zieltabelle in `specs/data/status-normalization.md` ist entsprechend aktualisiert.

## Zielgruppe und Rechte

Primaere Rollen: `admin` und `ipad_verwaltung`; Empfaenger ausschliesslich Schueler
mit aktueller Klasse. `buchhaltung` bleibt Nebenrolle fuer zahlungsbezogene Faelle.

Assumption: Die bestehenden Ausleihrechte gelten auch fuer die Einfuehrung:

| Aktion | admin | ipad_verwaltung | buchhaltung |
| --- | --- | --- | --- |
| Einfuehrung und zugehoerige Ausleihe lesen | ja | ja | nur bestehender zahlungsbezogener Umfang |
| Einfuehrung beginnen, regulaer ausgeben, zuruecknehmen | ja | ja | nein |
| Schaden/Problem anlegen oder bearbeiten | ja | ja | nein |
| Abgeschlossene Rueckgabe korrigieren | ja | nein | nein |
| Ausleihhistorie/Audit loeschen | kein neues Recht | kein neues Recht | nein |

Serverseitige Rechtepruefung und bestehende Datenbank-Zugriffssicherung muessen
jede Aktion absichern, einschliesslich direkter Schreibzugriffe.

## Vorgeschlagene Uebergaenge

Assumption: Die Einfuehrung startet aus einem vorbereiteten Set und setzt eine
vollstaendige, nutzbare Ausstattung ohne gesperrtes iPad voraus.

| Von | Aktion / Ziel | Fachliche Folgen |
| --- | --- | --- |
| `zugeordnet` | Einfuehrung beginnen → `iPad-Einfuehrung` | bestehende Personenzuordnung fortfuehren; Nutzungsbeginn dokumentieren; Wagen/Platz behalten |
| `iPad-Einfuehrung` | Mitnahme manuell erlauben → `ausgegeben` | Personenzuordnung fortfuehren; Mitnahmebeginn dokumentieren; Lagerort entfernen und Wagenplatz freigeben |
| `iPad-Einfuehrung` | Ruecknahme | vorhandene Komponenten-/Zubehoerpruefung und abrechenbare Markierungen; Ausleihe abschliessen; technische Vorbereitung vor Freigabe |

Assumption: Ruecknahme fuehrt wie im bestehenden Workflow zunaechst zu `blockiert`.
Kein automatischer Wechsel aufgrund Datum oder Klassenstufe. Kein Auftrennen als
freies Quellset waehrend der Unterrichtsnutzung; Ruecknahme oder ausdruecklicher
Schadens-/Austauschworkflow ist erforderlich.

## Bestaetigte Wagen-Sammelaktion

- Direkt in der Lagerliste des jeweiligen Wagens W1–W6 anbieten.
- Abschlussbox nur anzeigen, wenn der ausgewaehlte Wagen mindestens ein Set mit
  gespeicherter Verfuegbarkeit `ipad_einfuehrung` enthaelt. Bei null Treffern
  vollstaendig ausblenden; keine feste Beschraenkung auf W4. Suchfilter aendern
  diese wagenweite Pruefung nicht.
- Nur `admin` und `ipad_verwaltung` duerfen sie manuell ausloesen.
- Vor Schreiben Anzahl der betroffenen Sets anzeigen und bewusste Bestaetigung verlangen.
- Ausschliesslich personengebundene Sets dieses Wagens mit gespeichertem
  Einfuehrungsstatus auf `ausgegeben` umstellen; andere Zustaende nicht veraendern.
- Lagerort der umgestellten Sets entfernen; Wagenplaetze werden frei.
- Jede einzelne Aenderung mit vorherigem/neuem Zustand und Lagerort auditieren.
- Assumption: Vorschau betrifft den ganzen Wagen, auch bei aktiven Suchfiltern;
  die Oberflaeche benennt dies ausdruecklich. Bei geaenderter betroffener Setmenge
  zwischen Vorschau und Bestaetigung abbrechen und neue Vorschau verlangen.

## Betroffene Daten und Konsistenz

- `inventory_set`: Verfuegbarkeit, Personenzuordnung, Wagen und Platz.
- `set_person_assignment`: bestehende Zuordnung und Historie; Unterrichtsnutzung
  muss von Vorbereitung und spaeterer Mitnahme unterscheidbar bleiben.
- Set-Komponenten-Zuordnungen und Komponenten-Verfuegbarkeit: Bestand darf nicht
  fuer eine zweite Ausgabe oder als freie Ersatzquelle angeboten werden.
- Schadensfall: aktuelle Person, Set, Zuordnung und betroffene Komponente.
- Ruecknahmechecks, Folgeforderungen und Audit: bestehende Fachregeln weiterverwenden.

Bestaetigte Datumslogik:

- `set_person_assignment.ipad_introduction_at` (date, optional) speichert das
  Datum der iPad-Einfuehrung. Beim Beginn wird ausschliesslich dieses Datum gesetzt;
  `issued_at` bleibt leer.
- Erst manuelle Freigabe zur Mitnahme setzt das regulaere Ausgabedatum `issued_at`.
- Das Einfuehrungsdatum bleibt bei spaeterer Ausgabe erhalten. Ausgabe und
  Rueckgabe duerfen nicht vor einem bekannten Einfuehrungsdatum liegen.
- Ohne Einfuehrung bleibt das neue Feld leer; kein Backfill bestehender Ausgaben.
- Die Aus- und Rueckgabeliste zeigt beide Daten separat. Ein Eintrag mit
  Einfuehrungsdatum und ohne Ausgabedatum ist bereits genutzt, nicht `Vorbereitet`.
- Ausgabeprotokolle behalten `issued_at` als regulaeres Ausgabedatum; das
  Einfuehrungsdatum wird nicht ersatzweise als Ausgabedatum angezeigt.

Status,
Zuordnung, Zeitpunkte und Audit muessen bei Umsetzung atomar konsistent wechseln.

## Schaden und Problem

Meldungen sind waehrend der Einfuehrung mit aktueller Person/Zuordnung moeglich.
Eine Meldung allein erlaubt keine Mitnahme. Bestehende Defekt-, Sperr-, Zahlungs-
und Austauschregeln gelten; insbesondere darf ein Ersatzset nicht unbemerkt die
Mitnahme erlauben oder Wagen/Platz verlieren. Interner Tausch und Kompletttausch
sind unten beschrieben.

## Datenschutz und Audit

Keine zusaetzlichen Kontakte oder personenbezogenen Freitextangaben erforderlich.
Bestehende Ausleih- und Schadensleserechte sowie Aufbewahrungsregeln gelten.
Beginn, regulaere Ausgabe, Ruecknahme, Korrektur, Lagerplatzwechsel und Austausch
sind mit handelnder Person, Zeitpunkt, betroffenen IDs und vorherigen/neuen
Werten nachvollziehbar zu protokollieren. Unterrichtsnutzung und Mitnahme muessen
in der Historie unterscheidbar sein. Keine automatischen Bestandskorrekturen oder
Migrationen aus Klassenstufe, Lagerort oder SQLite ableiten.

## Akzeptanzkriterien

1. Vorbereitung zeigt `zugeordnet`; erst bestaetigter Nutzungsbeginn zeigt
   `iPad-Einfuehrung`. Listen/Details duerfen diese Zustaende nicht gleichsetzen.
2. Einfuehrung verlangt Schueler, aktuelle Klasse, eindeutige Personenzuordnung
   und gueltigen Wagen W1–W6 mit Platz 1–30; ungueltige Eingaben werden serverseitig abgewiesen.
3. Beginn erhaelt Wagen und Platz und verhindert parallele Ausgabe/Zuordnung.
4. Schaden/Problem kann mit der aktiven Zuordnung angelegt werden; die Meldung
   allein aendert die Mitnahmeberechtigung nicht.
5. Ruecknahme nutzt dieselben Vollstaendigkeits-, Zubehoer- und Abrechnungsregeln
   wie andere genutzte Sets und setzt das Set nicht unmittelbar frei.
6. Uebergang zur regulaeren Ausgabe erhaelt die Historie des Nutzungsbeginns.
7. Unberechtigte Schreibzugriffe scheitern serverseitig und auf Datenbankebene.
8. Jeder Zustandswechsel ist auditierbar; Konflikte erzeugen keine Teilzuordnung.
9. Klassenstufe allein setzt weder Einfuehrung noch Mitnahmeberechtigung.
10. Nach Umsetzung wird die Bedeutung im passenden Projekt-Skill dokumentiert;
    der betreffende Skill wird anhand des umgesetzten Workflows festgelegt.

11. Die Wagen-Lagerliste zeigt vor Bestaetigung die Zahl der Einfuehrungssets
    dieses ganzen Wagens. Ohne bewusste Bestaetigung erfolgt keine Aenderung.
12. Die Sammelaktion entfernt nur fuer diese Sets den Lagerort; freie, zugeordnete,
    blockierte, unklare oder bereits ausgegebene Sets bleiben unveraendert.
13. Sammelaktion, Historie und Einzel-Audit werden gemeinsam gespeichert;
    fehlgeschlagene Pruefungen erzeugen keine Teilergebnisse.
14. Wagen ohne gespeicherte Einfuehrungssets zeigen keine Abschlussbox. Im
    aktuellen produktiven Bestand erscheint sie nur fuer W4 (26 Sets);
    W1, W2, W3, W5 und W6 zeigen sie nicht. Ein spaeteres Einfuehrungsset in
    einem anderen Wagen aktiviert dort die Box datenbasiert.

## Bestaetigte Tauschregel und Umsetzungsschnitt

Einmalige Nutzerfreigabe 13.10.2026: Tastatur E001068 / 0218 aus Set 552
trotz offener Ausgabe manuell nach Set 89 uebernehmen; bisherige Tastatur
E000939 / 0089 historisch austragen und defekt markieren. Set 552 unvollstaendig,
sonstige Set-/Ausleihdaten erhalten. Kein fingierter Schadensfall. Diese konkrete
Ausnahme wird unter exklusiver Tabellensperre in einer Transaktion mit Vorher-/
Nachher-Audit ausgefuehrt; der Komponentenentnahmeschutz wird ausschliesslich
innerhalb dieser Transaktion ausgesetzt und vor Abschluss wieder aktiviert.
Die allgemeine Austauschregel bleibt unveraendert.

Ein Einfuehrungsset ist niemals Komponentenquelle fuer andere Sets. Ein interner
Schadenstausch bleibt erlaubt: neue Komponente aus erlaubter freier Quelle,
defekte Komponente historisch austragen, Zielperson, Einfuehrungsstatus und
Wagenplatz erhalten, atomar mit Schadensfall und Austausch-Audit speichern.
Schaden und technisches Problem bleiben auch ohne Ersatz erfassbar.

Assumption: Der erste Schnitt beginnt aus `zugeordnet`, gilt ohne automatische
Klassenstufenentscheidung fuer aktive Schueler mit aktueller Klasse und setzt
manuell bestaetigte Daten nicht in die Zukunft. Einfuehrungssets mit Defekt oder
Sperre duerfen nicht zur Mitnahme freigegeben werden. Die Sammelaktion bricht
bei ungueltigen Mitgliedern insgesamt ab und nennt den Handlungsbedarf.

Auch der Kompletttausch ist bestaetigt: Ersatzset uebernimmt dieselbe Person,
`ipad_einfuehrung` und Wagen/Platz. Altes Set wird blockiert, verliert aktuelle
Person und Lagerort. Historische Zuordnung des alten Sets endet am Austauschdatum;
neue Zuordnung behaelt das urspruengliche Einfuehrungsdatum, `issued_at` bleibt leer.
Audit verknuepft beide Sets/Zuordnungen mit dem Schadensfall und Austauschdatum.

## Umfang und spaetere Erweiterungen

- Assumption: Beginn aus bestehender Vorbereitung `zugeordnet`; direkte
  Erstausgabe aus `frei` ist kein neuer Workflow dieses Schnitts.
- Assumption: Kein festes Ende und keine Einschraenkung auf Klassen 5/6;
  manuelle Freigabe fuer aktive Schueler mit aktueller Klasse.
- Lagerort kann durch bestehende Bearbeitungsaktionen geaendert werden, aber
  waehrend Einfuehrung nur auf gueltigen Wagenplatz. Eindeutige Belegung ueber
  alle anderen Bestandszustaende/Reservierungen ist eine separate Erweiterung.
- Defektes/gesperrtes Einfuehrungsset bleibt in dieser Verfuegbarkeit sichtbar,
  sein Zustand erscheint separat; Freigabe zur Mitnahme wird serverseitig abgewiesen.
- Einfuehrungsdatum ist in den Oberflaechen lesend sichtbar; eigene nachtraegliche
  Korrekturaktion oder Stornierung ohne Ruecknahme ist nicht neu eingefuehrt.
- Neue Unterschrifts-/Einfuehrungsprotokolle bleiben spaeter zu klaeren.
  Bestehende Ausgabeprotokolle behalten das regulaere Ausgabedatum.

## Verifikation und Inbetriebnahme

Neue Migrationen erweitern Enum/Datum und implementieren Invarianten, atomare
Aktionen, geschuetztes Audit und atomare Tauschpfade. Sie muessen in ihrer
Reihenfolge vor dem neuen App-Stand angewendet werden; produktive Anwendung nur
nach ausdruecklicher Freigabe. Kein Backfill, keine SQLite-Schreibzugriffe.

Isolierte PostgreSQL-Tests pruefen die echten Migrationen und RLS-Policies,
getrennte Daten, Rolle, Bestandskonflikte, Gesamtabbruch, Ruecknahme sowie internen
und kompletten Tausch. Formular-/Aktionspruefungen testen ausdrueckliche
Bestaetigung, vollständige Vorschau und serverseitige Eingabevalidierung.

## Bezuege

- `002-set-issue-return-workflow.md`
- `007-damage-report-workflow.md`
- `../data/status-normalization.md`
- `../data/roles-and-permissions.md`
- `../data/privacy-and-audit.md`
- `../decisions/0010-person-assigned-sets-can-remain-in-storage.md`

Verifiziert am 08.10.2026: 24 gezielte Tests bestehen (10 neue Einfuehrungs-
pruefungen, 4 bestehende Schadenspruefungen und 10 Set-Ladepruefungen), ohne
uebersprungene PostgreSQL-Tests. Typpruefung, gezieltes ESLint, Produktionsbuild
und Diff-Pruefung bestehen. Skill-Metadaten wurden geprueft. Kein Live-Supabase-
oder Browser-Workflow gegen produktive Daten ausgefuehrt; Inbetriebnahme wartet
auf gesonderte Migrationsfreigabe.

## Gespeicherter Zwischenstand vor App-Neustart, 08.10.2026

Historischer Zwischenstand; durch die folgende Inbetriebnahme ergaenzt.

Runtime-Ursache in Browser und `.next/dev/logs/next-development.log` bestaetigt:
SQLSTATE 42703, `set_person_assignment.ipad_introduction_at` fehlt im verbundenen
Schema. Keine produktive Migration ausgefuehrt. Neue Kompatibilitaetspruefung
erkennt fehlende Einfuehrungsspalte, Audit-Tabelle oder Enum-Wert gezielt; sonstige
Fehler werden weitergereicht. Lager-, Set-, Personen- und Ausgabenlesepfade waehlen
dann nur bisherige Spalten. Neue Einfuehrungsaktionen bleiben deaktiviert; regulaere
vorbereitete Einzelausgabe verwendet bis dahin den bisherigen Workflow.

Im internen Browser `http://localhost:3000/sets/w1` nach Neuladen erfolgreich
verifiziert: normale Lagerliste mit 20 Sets und Hinweis auf ausstehende Migration,
kein Runtime-Overlay. Keine Schreibaktion an produktiven Fachdaten ausgefuehrt.

Fortsetzung: Ergebnisse der zuletzt gestarteten Typ-/Regressionspruefung im
Chat beachten; Kompatibilitaetspruefung separat fuer fehlendes/vollstaendiges
Schema und unveraendertes Weiterreichen von Berechtigungs-/Netzfehlern testen,
dann gezieltes Lint und Build des letzten Korrekturstands abschliessen.
Produktive Migration und Commit sind weiterhin nicht beauftragt.

## Produktive Inbetriebnahme W4, 08.10.2026

Explizite Freigabe aus Nutzerturn `01a11b06-9d90-7112-b462-10d160dc4791`
im Voice-Chat `01a0f0fc-c99b-7711-8981-d613cc7d63ab` nachgelesen:
produktive Migration und alle Eintraege W4 auf den neuen Wert setzen.
Die zunaechst fehlende Freigabeevidenz der automatischen Pruefung wurde damit
aufgeklaert; beide Migrationen anschliessend erfolgreich angewendet.

- Projekt `svcppqqredtolctsvvph`; Migrationen `ipad_introduction_date` und
  `ipad_introduction_workflows` in getrennten Transaktionen in Reihenfolge.
- Vorpruefung: 26 Sets, alle `zugeordnet`, Zustand `ok`, aktive Schueler mit
  aktueller Klasse, jeweils eine passende offene Zuordnung ohne Ausgabedatum,
  drei nutzbare Komponenten und gueltiger Wagenplatz. Keine Ausnahmen.
- Vorher-Stand ausserhalb des Repositorys gespeichert:
  `/private/tmp/ipad-w4-before-20261008.json`.
- Atomare Sammelaktion als Rolle `authenticated` mit dokumentiertem Nutzerakteur,
  Tabellen-/Zeilensperren, erneutem Vergleich von Setversionen, Wagenmitgliedschaft
  und vollstaendigen offenen Zuordnungen; Einzelwechsel durch `change_set_issue`.
- Ergebnis: 26 Sets `ipad_einfuehrung`, Einfuehrungsdatum `2026-10-08`,
  `issued_at` weiterhin leer, Personen/Zuordnungs-IDs/Wagenplaetze unveraendert.
- Geschuetztes Audit: 26 Set- und 26 Zuordnungsereignisse, insgesamt 52,
  Zeitpunkt 08.10.2026 12:25:46 Europe/Berlin.
- Rueckleseabgleich aller 26 Sets bestanden. Pruefsummen von 691 anderen Sets,
  659 anderen Zuordnungen, 2313 Komponenten und 3817 Komponentenverknuepfungen
  vor/nach identisch. Keine anderen Wagen oder Komponenten veraendert.
- Sechs echte PostgreSQL-Pruefungen erneut bestanden. Supabase-Security-Advisors
  vor/nach zeigen dieselben bestehenden Hinweise, keine neuen Befunde.
- W4-Lagerliste im internen Browser neu geladen: 26 Einfuehrungssets,
  26/30 Plaetze, 0 Auffaelligkeiten, neuer Status sichtbar.
- Nachher-Stand `/private/tmp/ipad-w4-after-20261008.json`, Browserbild
  `/private/tmp/ipad-w4-after-20261008.jpg`. Kein Git-Commit ausgefuehrt.

Anzeige-Nachpruefung am 08.10.2026: Abschlussbox wird anhand der ungefilterten
Wagenvorschau nur bei mindestens einem gespeicherten Einfuehrungsset gerendert.
Im internen Browser W1, W2, W3, W5, W6 jeweils ohne Box bestaetigt; W4 mit Box
fuer 26 Sets bestaetigt und als geoeffnete Ansicht belassen. Regressionstest
prueft jeden Wagen mit 0, 1 und 26 Einfuehrungssets. Alle fuenf Aktion-/UI-Tests,
gezieltes ESLint, Typpruefung und Diff-Pruefung bestehen. Keine Fachdaten geaendert.
