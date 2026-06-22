# ADR 0007: Personentyp und Status trennen

## Status

accepted

## Kontext

Die Legacy-Tabelle `User` nutzt `BenutzerTyp` fuer verschiedene Bedeutungen, z. B. `Schüler`, `Schüler - Ausgeschieden`, `Lehrer`, `Lehrer - Ausgeschieden`, `Dublette` und `Testuser`.

Diese Werte vermischen fachlichen Personentyp, Status und Datenqualitaet.

## Entscheidung

Das Zielmodell trennt Personentyp und Status.

Personentypen im MVP:

- schueler
- lehrer
- mitarbeiter
- referendar
- praktikant

Schulsozialarbeit wird als `mitarbeiter` gefuehrt.

Referendare und Praktikanten sind eigene Personentypen. Fuer sie gelten vorlaeufig dieselben Ausgabe- und Rueckgaberegeln wie fuer Lehrer.

Personenstatus:

- aktiv
- ausgeschieden
- verstorben
- dublette
- test
- unklar

## Konsequenzen

- Ausgabelogik kann sauber nach Personentyp entscheiden.
- Ehemalige Personen bleiben historisch nachvollziehbar.
- Dubletten und Testuser werden nicht als normale aktive Personen behandelt.
- Legacy-Werte brauchen Importmapping und Importhinweise.
