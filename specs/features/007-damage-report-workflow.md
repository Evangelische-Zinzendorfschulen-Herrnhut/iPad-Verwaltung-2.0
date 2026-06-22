# Feature: Schadens- oder Problemmeldung mit PDF-Bericht

## Status

future

## Problem

Bei Schäden oder technischen Problemen müssen alle notwendigen Informationen erfasst werden. Nach vollständiger Eingabe soll ein Schadensbericht als PDF erzeugt werden, den Eltern zur Kenntnisnahme unterschreiben. Der unterschriebene Bericht wird digital abgelegt.

In der Legacy-Datenbank scheint `in Bearbeitung` auf diesen Prozess hinzuweisen.

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

## Datenobjekte

- Schadensfall
- Dokument
- Set
- Komponente
- Zusatzartikel
- Person
- Zahlungsvorgang
- Gerätetausch
- AuditLog

## Akzeptanzkriterien, Entwurf

- Schadensbericht kann erst erzeugt werden, wenn alle Pflichtfelder vollständig sind.
- Erzeugter PDF-Bericht wird versioniert oder nachvollziehbar gespeichert.
- Unterschriebener PDF-Bericht kann hochgeladen und dem Schadensfall zugeordnet werden.
- Statuswechsel werden auditierbar gespeichert.

## Nicht-Ziele

- Nicht Teil des ersten MVP-Set-Ausgabe/Rücknahme-Workflows.
- Keine automatische Versicherungskommunikation im ersten Schritt.

## Offene Fragen

- Welche Pflichtfelder muss ein Schadensbericht enthalten?
- Wer unterschreibt: Eltern, Schüler, Lehrer oder mehrere Personen?
- Wird das PDF aus einer Vorlage generiert?
- Wo werden hochgeladene PDFs gespeichert?
