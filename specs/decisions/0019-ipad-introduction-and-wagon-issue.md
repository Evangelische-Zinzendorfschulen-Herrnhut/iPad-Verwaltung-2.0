# ADR 0019: iPad-Einfuehrung und atomare Wagen-Ausgabe

## Status

accepted, 08.10.2026

## Entscheidung

Set-Verfuegbarkeit erhaelt den stabilen technischen Enum-Wert `ipad_einfuehrung`
mit UI-Label „iPad-Einführung“. `ipad_introduction_at` dokumentiert Unterrichtsbeginn,
`issued_at` erst Mitnahme. Lagerort bleibt im bestehenden `storage_label` als
Wagen W1–W6 und Platz 1–30, ohne Umstellung alter Daten.

Beginn, Einzelfreigabe und Wagen-Sammelfreigabe laufen in Datenbankfunktionen mit
SECURITY INVOKER, bestehenden RLS- und expliziten Rollenpruefungen. Gesperrte
Zeilen werden vor Schreiben erneut geprueft. Die kurze Wagen-Transaktion
verwendet eine SHARE ROW EXCLUSIVE-Sperre auf der Set-Tabelle, damit auch direkte
Schreibzugriffe die Menge waehrend der bestaetigten Umstellung nicht veraendern. Die Wagenaktion vergleicht die
vollstaendige bestaetigte Vorschau (IDs und Versionen); geaenderte Mengen oder
Datensaetze fuehren zum Gesamtabbruch. Eine Transaktion verbindet Einzelwechsel,
Datumsfelder, Lagerortentfernung und geschuetztes Audit.

Datenbankpruefungen sichern auch direkte Schreibzugriffe ab. Ein Audit-Trigger
benoetigt ausschliesslich fuer die geschuetzte Auditablage definierte Rechte;
kein privilegierter RPC als Ersatz fuer RLS. Interner Schadenstausch nutzt den
bestehenden atomaren Austauschtrigger, auch beim Anlegen eines Falls fuer ein
Einfuehrungsset. Einfuehrungssets sind als Ersatzquelle ausgeschlossen.

## Konsequenzen

Keine automatische Klassenableitung, kein Backfill und keine produktive Migration.
Enum-Erweiterung wird vor Nutzung in nachfolgender Migration committed.
Neue Oberflaeche setzt Anwendung aller Migrationen voraus. Vorschau umfasst
immer den ganzen Wagen, unabhaengig von Such-/Speicherfiltern. Historische Daten
bleiben unveraendert; Datumsreihenfolge und Freigabevoraussetzungen werden getestet.
