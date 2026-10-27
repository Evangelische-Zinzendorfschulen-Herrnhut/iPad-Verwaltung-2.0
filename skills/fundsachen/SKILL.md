---
name: fundsachen
description: Klaert gefundene inventarisierte iPad-Komponenten, ermittelt die wahrscheinliche zugehoerige Person und bereitet eine ungesendete Abholmail vor. Verwenden bei liegengebliebenen iPads, Pencils oder Tastaturen mit Inventarnummer.
---

# Fundsachen

Gefundene Komponenten erst zuordnen, dann Kontakt aufnehmen. Supabase ist die fuehrende Datenquelle; die Legacy-SQLite-Datenbank nur lesend und nur zur Plausibilisierung verwenden.

## Ablauf

1. Die vollstaendige Inventarnummer und die Komponentenkategorie erfassen.
2. In Supabase die aktuelle Set-Zuordnung, Ausgabehistorie, Personenzuordnung und moegliche Set-Wechsel pruefen.
3. Widersprueche sichtbar benennen. Ein als frei markiertes Set reicht nicht als Gegenbeweis, wenn eine offene Ausgabe existiert; vor der Kontaktaufnahme zusaetzlich nach parallelen aktuellen Ausstattungen der Person suchen.
4. Die Person nur dann als Empfaengerin oder Empfaenger behandeln, wenn die Zuordnung eindeutig oder nach dem Gegencheck fachlich ausreichend belastbar ist. Bei verbleibender Mehrdeutigkeit erst nachfragen und keine Mail vorbereiten.
5. Den Abholort vom Nutzer uebernehmen und bei undeutlicher Spracheingabe exakt bestaetigen, insbesondere Schreibweisen wie `2.24`.
6. In Outlook ausschliesslich einen Entwurf anlegen. Empfaengeradresse vollstaendig aufloesen und den Entwurf nicht senden.
7. Kurz mitteilen, dass die Komponente im Schulhaus gefunden wurde und wo sie abgeholt werden kann. Keine unnoetigen Bestands- oder Personendaten in die Mail aufnehmen.

## Mailkonventionen

- Der eigentliche Text steht oberhalb der vorhandenen Signatur.
- Nach `Viele Gruesse` keinen Namen in den Nachrichtentext einfuegen, wenn die Signatur den Namen bereits enthaelt.
- Den Namen nicht zusaetzlich in einen Satz wie `bei mir, Vorname Nachname, ...` aufnehmen. Formuliere stattdessen beispielsweise: `Du kannst sie bei mir in Raum 2.24 abholen.`
- Die vorhandene Signatur weder ersetzen noch umformatieren.
- Nach jeder Bearbeitung den sichtbaren Entwurf erneut pruefen. Insbesondere sicherstellen, dass Anrede, Satzzeichen und Signatur unveraendert korrekt sind.
- Ohne ausdrueckliche Freigabe niemals senden.

## Daten und Aenderungen

- Die reine Zuordnungsklaerung ist lesend.
- Bestandsstatus, Set-Zuordnungen oder Ausgaben nicht allein wegen eines Fundstuecks veraendern.
- Falls eine Datenkorrektur notwendig wird, diese als eigenen, auditierbaren Auftrag behandeln und vor dem Schreiben bestaetigen lassen.
