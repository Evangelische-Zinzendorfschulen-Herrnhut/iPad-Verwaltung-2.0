# Feature: Temporäre Schüler-Adapter zurückfordern

## Status

future

## Problem

Schüler können temporär einen Lightning-USB-Adapter zur Datenübertragung erhalten. Diese Adapter sollen nach 14 Tagen zurückgefordert beziehungsweise angemahnt werden.

## Zielgruppe

- ipad_verwaltung
- admin

## Hauptworkflow, Zielbild

1. Nutzer gibt einem Schüler temporär einen Lightning-USB-Adapter aus.
2. System speichert Ausgabedatum und erwartetes Rückgabedatum, standardmäßig 14 Tage nach Ausgabe.
3. Nach Ablauf der Frist erscheint der Adapter als überfällig.
4. System erinnert die iPad-Verwaltung oder erzeugt eine Mahnung.
5. Bei Rückgabe wird der Vorgang abgeschlossen.

## Datenobjekte

- ZusatzartikelAusgabe
- Person
- Benachrichtigung
- AuditLog

## Akzeptanzkriterien, Entwurf

- Temporäre Adapterausgaben an Schüler haben ein erwartetes Rückgabedatum.
- Die Standard-Rückgabefrist für Schüler-Adapter beträgt 14 Tage.
- Überfällige Adapter können gefiltert werden.
- Rückforderungen oder Mahnungen werden nachvollziehbar dokumentiert.
- Rückgabe beendet den offenen Vorgang.

## Nicht-Ziele

- Nicht Teil des ersten MVP-Workflows für Set-Ausgabe und Set-Rücknahme.
- Keine automatische Eskalation, solange Fristen und Empfänger nicht definiert sind.

## Offene Fragen

- Wer erhält die Erinnerung: Schüler, iPad-Verwaltung, Klassenleitung oder Sekretariat?
- Soll eine Mail automatisch versendet oder nur eine Aufgabe erzeugt werden?
