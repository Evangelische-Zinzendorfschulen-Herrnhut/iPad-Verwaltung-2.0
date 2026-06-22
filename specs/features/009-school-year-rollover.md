# Feature: Schuljahreswechsel und Klassenfortschreibung

## Status

draft

## Problem

Zum Schuljahreswechsel muessen Klassen und Jahrgangsgruppen fortgeschrieben werden. Die meisten Schueler wechseln regulär in die nächste Stufe, einzelne Schueler können aber wiederholen oder die Klasse wechseln.

## Zielgruppe

- admin
- ipad_verwaltung

## Hauptworkflow

1. Nutzer startet vor dem 01.08. die Vorbereitung des kommenden Schuljahres.
2. System legt das kommende Schuljahr im Status `vorbereitet` an.
3. System schlägt neue Klassen und Jahrgangsgruppen vor.
4. System schlägt für aktive Schueler neue Klassen-/Jahrgangsgruppenzuordnungen vor.
5. Nutzer prüft die Vorschläge.
6. Nutzer übernimmt die Vorschläge gesammelt in den Vorbereitungsstand.
7. Einzelne wiederholende oder wechselnde Schueler werden manuell angepasst.
8. Zum 01.08. wird das neue Schuljahr automatisch aktiv, sofern es vorbereitet ist.
9. Alternativ kann `admin` die Aktivierung manuell anstossen.
10. System historisiert alte und neue Klassen-/Jahrgangsgruppenzuordnungen.

## Fortschreibungsregeln

- Stufe 5 bis 9: regulaerer Wechsel in die nächste Stufe.
- Stufe 10: Wechsel in Oberstufe oder Abschluss/Austritt muss fachlich geprüft werden.
- Stufe 11: Wechsel nach Stufe 12 als Jahrgangsgruppe.
- Stufe 12: Abschluss/Austritt muss fachlich geprüft werden.
- Wiederholer werden manuell angepasst.
- Klassenwechsel innerhalb einer Stufe werden manuell angepasst.

## Datenobjekte

- Schuljahr
- Klasse
- Person
- PersonKlassenZuordnung
- AuditLog

## Akzeptanzkriterien

- Ein kommendes Schuljahr kann vor dem 01.08. vorbereitet werden.
- Die App kann neue Klassen-/Jahrgangsgruppen fuer ein neues Schuljahr vorschlagen.
- Vorschläge können gesammelt übernommen werden.
- Einzelne Personen können vor oder nach Übernahme manuell angepasst werden.
- Vorbereitete Zuordnungen werden erst mit Aktivierung des neuen Schuljahres wirksam.
- Ein vorbereitetes Schuljahr wird automatisch am 01.08. aktiv.
- `admin` kann die Aktivierung manuell anstossen.
- Automatische und manuelle Aktivierung werden auditierbar gespeichert.
- Alte Klassen-/Jahrgangsgruppenzuordnungen bleiben historisch erhalten.
- Änderungen werden auditierbar gespeichert.

## Nicht-Ziele

- Keine automatische Entscheidung über Wiederholer.
- Keine automatische Abmeldung von Absolventen ohne fachliche Prüfung.

## Offene Fragen

- Wer liefert die finale Liste der Wiederholer und Klassenwechsel?
- Wie werden Abgänge nach Klasse 10 oder 12 importiert beziehungsweise bestätigt?
