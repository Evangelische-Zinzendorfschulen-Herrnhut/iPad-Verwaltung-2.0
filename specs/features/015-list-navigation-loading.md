# Feature: Ladeanzeige bei Listen-Navigation

## Status und Ziel

Implementiert und automatisiert geprüft. Alle zentralen Listen zeigen beim Start einer Navigation
sofort „Liste wird geladen …“. Der bisherige Inhalt bleibt abgedeckt und inert,
bis die React-/Next-Navigation einschließlich neuer Serverdaten abgeschlossen ist.

## Rollen, Workflow und Umfang

Alle für die jeweilige Liste zugelassenen Rollen (admin, ipad_verwaltung,
buchhaltung, readonly) erhalten dieselbe Rückmeldung. Umfang: Sets, Lagerliste,
Geräte, Personen/Klassen, Aus-/Rückgaben, Aufgaben und Beschaffung sowie Schadensfälle.
Filter, Suche nach Ablauf der bestehenden 350-ms-Eingabepause, Sortierung,
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

Assumption: Die bestehende Such-Eingabepause bleibt bedienbar; gesperrt wird ab
Beginn der eigentlichen Navigation. Native Zurück-/Vorwärts-Navigation und initiale
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
