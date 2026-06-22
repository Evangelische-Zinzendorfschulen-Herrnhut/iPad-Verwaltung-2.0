# ADR 0005: Initiale Buchhaltungs-Benachrichtigung

## Status

accepted

## Kontext

Wenn aus einer Ruecknahme-Markierung eine Abrechnung/Zahlungsforderung erstellt wird, soll die Buchhaltung per Mail informiert werden.

## Entscheidung

Fuer das MVP wird die direkte E-Mail-Adresse der ersten Buchhaltungsnutzerin verwendet:

- anja.desmaretz@ezsh.de

Diese Nutzerin erhaelt die Rolle `buchhaltung`.

## Konsequenzen

- Die Benachrichtigung kann ohne Verteilerlisten-Konfiguration starten.
- Die Adresse sollte als konfigurierbarer Seed-/Systemwert angelegt werden.
- Spaeter kann auf eine Verteilerliste oder mehrere Buchhaltungsnutzer erweitert werden.
