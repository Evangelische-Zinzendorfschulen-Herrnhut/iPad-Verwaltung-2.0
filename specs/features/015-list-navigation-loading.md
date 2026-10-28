# Feature: Ladeanzeige bei Listen-Navigation

## Status und Ziel

Implementiert und automatisiert geprüft. Alle zentralen Listen zeigen beim Start einer Navigation
sofort „Liste wird geladen …“. Der bisherige Inhalt bleibt abgedeckt und inert,
bis die React-/Next-Navigation einschließlich neuer Serverdaten abgeschlossen ist.

## Rollen, Workflow und Umfang

Alle für die jeweilige Liste zugelassenen Rollen (admin, ipad_verwaltung,
buchhaltung, readonly) erhalten dieselbe Rückmeldung. Umfang: Sets, Lagerliste,
Geräte, Personen/Klassen, Aus-/Rückgaben, Aufgaben und Beschaffung sowie Schadensfälle.
Filter, Freitextsuche per Enter, Sortierung,
Seitenwechsel, Seitengröße, Zurücksetzen und Links in diese Listen nutzen einen
geteilten React-Transition-Zustand. Modifizierte Klicks, Downloads und externe
Ziele behalten ihr Browser-Verhalten. GET-Formulare werden als Navigation behandelt;
Server-Actions und POST-Formulare bleiben unverändert.

## Datenmodell, Rechte, Datenschutz und Audit

Nur flüchtiger UI-Zustand; keine Schemaänderung und keine neuen Datenobjekte.
Listen lesen weiterhin die bestehenden Personen-, Inventar-, Vorgangs- und
Beschaffungsobjekte unter den bisherigen serverseitigen Rollenprüfungen/RLS.
Keine neuen Erstell-, Änderungs- oder Löschrechte. Keine fachlichen Datenänderungen,
keine neue Speicherung personenbezogener Daten oder Suchbegriffe, kein Audit-Ereignis.

## Umsetzung

Ein Provider im Root-Layout bündelt useTransition; Filter verwenden denselben Hook.
Die gemeinsame Ereignisbehandlung erfasst normale Links auf zentrale Listen und
GET-Formulare. Ein permanenter Live-Status liegt außerhalb des gesperrten Inhalts.
Die Transition (nicht allein die URL) entscheidet über den Abschluss. Fehler
beenden die Transition ebenfalls und geben die Fehleransicht frei. Keine neue
Architektur oder Abhängigkeit, daher kein ADR erforderlich.

## Akzeptanzkriterien

- Navigation zeigt ohne zusätzliche Verzögerung einen kontrastreichen Textstatus
  und Spinner; Bewegung ist bei reduzierter Animation abgeschaltet.
- Der alte Listeninhalt einschließlich Filter ist während der Navigation inert
  und visuell abgedeckt; weitere widersprüchliche Eingaben sind blockiert.
- Status wird mit role=status/aria-live angesagt; Inhalt trägt aria-busy.
- URL-Wechsel allein entfernt die Anzeige nicht; erst Transition-Abschluss
  einschließlich Commit der Listendaten gibt die Oberfläche frei.
- Mehrere programmatisch gestartete Navigationen bleiben bis zum gemeinsamen
  Abschluss gesperrt; keine selbstverwalteten Timer geben die Sperre vorzeitig frei.
- Fehler lassen keine dauerhafte Sperre zurück. Die Next-Fehlerbehandlung bleibt wirksam.
- Lokale Suchfelder werden bei neuen Server-Filterwerten neu initialisiert;
  alte Debounce-Timer werden beim Wechsel entfernt.
- Lint, Build und bestehende Tests sowie gezielte Navigationstests laufen.

## Grenzen / Annahmen

Freitextsuche startet per Enter; Sonderfelder behalten ihre Eingabepause. Gesperrt
wird ab Beginn der eigentlichen Navigation. Native Zurück-/Vorwärts-Navigation und initiale
Dokumentaufrufe nutzen den Browser-/Next-Ladeablauf und sind kein durch den Hook
initiierter Filterwechsel. Eine tatsächlich ausbleibende Netzwerkantwort beendet
die Transition nicht künstlich. Keine offenen fachlichen Fragen.

## Ergänzung: lange Wartezeit und Fehler

Nach acht Sekunden ergänzt der Live-Status eine verständliche Warteinformation;
der Timer endet beim Unmount und hebt die Sperre niemals auf. Unerwartete Ladefehler
zeigt die gemeinsame Next-Fehlergrenze ohne technische Fehlerdetails an. Ihre
Überschrift erhält Tastaturfokus; Wiederholen und Startseite bleiben bedienbar.
Bestehende fachliche Validierungsfehler bleiben in ihren jeweiligen Formularen.


## Verifikation (28.10.2026)

- Neun neue Tests mit kontrolliertem Router prüfen Zielabdeckung, Beginn/Abschluss,
  Sperre weiterer Klicks, überlappende Übergänge, Fehlerfreigabe, GET versus POST,
  Browser-Ausnahmen, geteilten Filter-Hook, Wartehinweis/Timerbereinigung und Fehlerfokus/Retry.
- Gesamtsuite: 49 erfolgreich, sieben bestehende Datenbank-Integrationstests ohne
  konfigurierte Testdatenbank übersprungen; keine fachlichen Daten verändert.
- Produktionsbuild erfolgreich einschließlich TypeScript. Turbopack benötigt einen
  lokalen Prozess-Port und wurde wegen der Sandbox-Portbeschränkung außerhalb der
  Sandbox ausgeführt.
- Lint erfolgreich mit sieben bestehenden unused-vars-Warnungen in geraete/page.tsx.
- Nutzer bestätigt am 28.10.2026 nach Browserprüfung, dass die Ladeanzeige
  gefällt und zu funktionieren scheint. Keine automatisierte Browser-Ende-zu-Ende-Prüfung;
  Router-/Transition-Abschlüsse sind in den Komponententests kontrolliert, nicht
  gegen echte Netzwerkverzögerungen geprüft.

## Geräteliste: Suche per Enter (28.10.2026)

Ziel: Leseberechtigte Nutzer können den Suchtext vollständig eingeben, bevor die
Geräteliste navigiert. Rollen, Datenmodell, serverseitige Rechte, Datenschutz und
Audit entsprechen dem obigen Abschnitt; ausschließlich flüchtiger Formularzustand.
Keine Fachdatenänderung, neue Abhängigkeit oder Architekturentscheidung. Offene Fragen: keine.

Akzeptanzkriterien:

- Mehrere Eingaben im Feld „Suche“ bleiben lokal, auch nach 350 ms; keine Navigation
  und keine Ladeanzeige allein durch Tippen oder Leeren.
- Enter im Suchfeld übermittelt den getrimmten Text genau einmal über die bestehende
  Listen-Transition und startet damit die gemeinsame Ladeanzeige.
- Enter mit leerem oder nur aus Leerzeichen bestehendem Text entfernt `q` aus der URL.
- Bestehende URL-Filter initialisieren das Formular weiterhin; neue Serverwerte
  initialisieren es über den bestehenden React-Key neu.
- Kategorie, Zustand, Zuordnung, Sortierung und Setnummer behalten ihr Verhalten.
  Ihre Navigation verwendet den bereits angewandten Suchwert aus der URL; ein
  unbestätigter Suchentwurf wird erst mit Enter angewandt.
- Bestehende Filterwerte bleiben bei Enter erhalten; die Seitennummer wird wie
  bisher bei Filteränderungen zurückgesetzt.

Verifikation: Fünf neue Komponententests mit kontrolliertem Router prüfen mehrere
Tasteneingaben ohne Navigation, Enter mit Suchtext und leerem Text, bestehende
URL-Werte sowie unveränderte Auslöser anderer Filter. Gesamtsuite: 58 bestanden,
sieben Datenbanktests ohne konfigurierte Testdatenbank übersprungen. Build inklusive
TypeScript erfolgreich; Lint ohne Fehler mit sieben bestehenden unused-vars-Warnungen
in `geraete/page.tsx`. Keine Browser-Ende-zu-Ende-Prüfung und keine Fachdatenänderung.

## Einheitliche Freitextsuche der zentralen Listen (28.10.2026)

Inventar der Suchpfade:

| Liste | Suchpfad | Bisher / Änderung |
| --- | --- | --- |
| Geräte | `GeraeteFilterForm`, q | Enter beibehalten, gemeinsame Behandlung |
| Sets | `SetsFilterForm`, q | Such-Debounce durch Enter ersetzen |
| Lager | `StorageFilterForm`, q | Such-Debounce durch Enter ersetzen |
| Aus-/Rückgaben | `AssignmentFilterForm`, q | Such-Debounce durch Enter ersetzen |
| Aufgaben | `TasksFilterForm`, q | Such-Debounce durch Enter ersetzen |
| Schadensfälle | `DamageCasesFilterForm`, q | Suche von Schadens-ID-Debounce trennen |
| Personen/Klassen | natives GET-Formular, q | Enter/Filtern beibehalten, leeres q entfernen |
| Beschaffung/Rechnungen | nur Auswahlfilter | keine Freitextsuche, unverändert |

Personen-Auswahl und Ersatzgeräte-/Komponentensuche in Ausgabe-/Schadensdialogen
sind fachliche Auswahlhilfen innerhalb eines Vorgangs und keine zentrale Liste.
Sie bleiben unverändert. Setkennung, Setnummer, Schadens-ID und Datumsfelder behalten
ihre bisherigen Auslöser; Auswahlfilter ebenfalls.

Zielgruppe sind die bereits leseberechtigten Rollen der jeweiligen Liste. Rechte,
Datenmodell, Datenschutz und Audit bleiben wie oben: nur flüchtiger UI-Zustand,
keine Fachdatenänderungen. Keine offenen Fragen oder neue Architekturentscheidung.
Die sechs Client-Filter verwenden eine gemeinsame Enter-Behandlung; das native
GET-Formular nutzt weiterhin den gemeinsamen Listen-Provider.

Akzeptanzkriterien für alle Suchpfade:

- Tippen und Leeren bleiben lokal, auch nach Ablauf bisheriger Timer.
- Enter übernimmt den getrimmten Suchtext genau einmal und startet die gemeinsame
  Ladeanzeige. Enter während IME-Komposition übernimmt noch keinen Suchtext.
- Leeres Enter entfernt ausschließlich den Suchfilter, erhält die anderen
  fachlichen Filter und setzt die Seitennummer wie bisher zurück.
- Andere Filterwechsel und Exporte verwenden den angewandten URL-Suchwert,
  niemals einen unbestätigten Suchentwurf. Native Personenfilter werden weiterhin
  gemeinsam über Enter oder „Filtern“ abgeschickt.
- Bestehende URL-Werte initialisieren die Felder; die bestehenden Keys der
  Client-Filter initialisieren sie bei Servernavigation neu.
- Regressionen prüfen alle sechs Client-Filter sowie den nativen GET-Pfad,
  einschließlich Sonderfeld-Timern, Enter, leerem Enter und Filtererhalt.

Verifikation der einheitlichen Suche: 67 Tests bestanden, sieben bestehende
Datenbanktests ohne konfigurierte Testdatenbank übersprungen. Die kontrollierten
Komponententests decken alle sechs Client-Filter, den nativen GET-Pfad,
Sonderfeld-Timer, IME und den Export mit unbestätigtem Suchentwurf ab.
Produktionsbuild einschließlich TypeScript erfolgreich; ESLint ohne Fehler mit
sieben bestehenden unused-vars-Warnungen in `geraete/page.tsx`. Keine
Browser-Ende-zu-Ende-Prüfung. Keine Fachdaten verändert, kein Commit oder Push.
