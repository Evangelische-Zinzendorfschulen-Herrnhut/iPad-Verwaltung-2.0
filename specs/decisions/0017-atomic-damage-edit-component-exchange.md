# Atomarer Komponententausch beim Bearbeiten

Status: angenommen, 2026-09-11

Der bestehende Anlegeworkflow schreibt den Komponententausch in mehreren API-Aufrufen. Beim Bearbeiten koennte das bei Abbruch inkonsistente Zuordnungen hinterlassen.

Ein SECURITY-INVOKER-Trigger auf die Aenderung von `damage_case.replacement_component_id` validiert und erledigt den Austausch innerhalb derselben Transaktion wie die Schadensbearbeitung. Bestehende RLS-Policies bleiben wirksam. Komponenten und Zuordnungen werden gesperrt; Konkurrenzkonflikte brechen die Transaktion ab. Eine eigene, fuer Anwender nicht aenderbare Audit-Tabelle dokumentiert Akteur, Zeitpunkt und Zuordnungen.

Ein dokumentierter Austausch bleibt unveraenderlich. Derselbe Ersatzwert ist idempotent; ein weiterer Austausch benoetigt einen neuen Schadensfall. Die Zuordnungshistorie verwendet den Speicherzeitpunkt, das fachliche Datum bleibt am Schadensfall.

Der Trigger greift nur beim Bearbeiten. Eine Vereinheitlichung mit dem bisherigen Anlegeworkflow bleibt eine separate Aenderung.

Validierung: Transaktion mit temporaeren Testdatensaetzen als authenticated/Admin, danach ROLLBACK. Falsche Kategorie abgewiesen, alte Zuordnung dabei erhalten; erfolgreicher Tausch mit Defektmarkierung und genau einem Audit-Eintrag; erneutes Speichern ohne doppelten Austausch. TypeScript und ESLint geprueft. Supabase-Sicherheitspruefung meldet keine neuen Befunde an diesen Objekten; bestehende Projektbefunde bleiben separat.
