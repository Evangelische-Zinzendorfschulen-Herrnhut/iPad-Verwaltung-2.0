# Inbetriebnahme: Schadensordner-Verlinkung

Stand 30.09.2026. Implementiert ist ausschliesslich Ordnerbereitstellung und Verlinkung. Keine produktive Migration oder Graph-Konfiguration wurde ausgefuehrt.

## Administratorangaben

Serverseitige Umgebungsvariablen aus `.env.example`, sowohl fuer localhost als auch fuer die gewuenschte Vercel-Umgebung:

- `SHAREPOINT_TENANT_ID`: UUID des schulischen Microsoft-Tenants.
- `SHAREPOINT_CLIENT_ID`: UUID der freigegebenen Entra-Appregistrierung.
- `SHAREPOINT_CLIENT_SECRET`: App-Secret aus sicherer Umgebungsverwaltung, nicht in Chat/Repository. Ablauf und Rotation organisatorisch festlegen.
- `SHAREPOINT_DRIVE_ID`: Drive-ID von IT2 / Freigegebene Dokumente.
- `SHAREPOINT_CASES_ITEM_ID`: Item-ID von `2.1_iPads und Applezeugs/CaseManagement/Cases`.
- Bestehende `SUPABASE_SECRET_KEY`: privilegierter serverseitiger Datenbankzugriff fuer ausschliesslich die kontrollierte Bereitstellung; niemals NEXT_PUBLIC.

Erforderlich: Administratorzustimmung fuer passende Selected-Berechtigung und explizite Schreibzuweisung auf Cases/Bibliothek, alternativ nur IT2; keine tenantweiten Schreibrechte. Ressourcen-IDs und Rechte durch den Administrator verifizieren. Site-ID ist fuer direkte Drive-/Item-Aufrufe nicht notwendig. App-Schreibrechte und Microsoft-Benutzerrechte sind getrennt: App-Nutzer muessen den Link mit einem berechtigten schulischen Microsoft-Konto oeffnen koennen.

Die Migration `supabase/migrations/20260930121758_damage_sharepoint_folder_link.sql` wird nach Review in der Zielumgebung angewendet. Ohne Migration bleibt der Fall anlegbar, die Detailansicht zeigt eine nicht verfuegbare Verknuepfung. Ohne Graph-Konfiguration wird nach Migration ein auditierter Fehler `not_configured` gespeichert. Kein automatisches Schema-Update durch die App.

## Betrieb und Recovery

Ein Fallordner und sein Namenssnapshot bleiben unveraendert. Lease und Versuch-ID verhindern parallele Finalisierung. Graph erstellt mit Konfliktverhalten `fail`; bei Konflikt muss Name, Parent, Drive und erzeugende App-Identitaet stimmen. Wenn Microsoft die App-Identitaet nicht in `createdBy.application.id` zurueckliefert, wird ein Konflikt absichtlich nicht automatisch uebernommen: Administrator muss die vorhandene Referenz pruefen. Dies muss im echten Tenant getestet werden, bevor Recovery als produktiv verifiziert gilt.

Fehler behalten Fall und Nummer. Nach abgebrochenem Versuch kann die Reservierung nach zwei Minuten erneut beansprucht werden. Keine externe Ordnerloeschung als Kompensation. Unbekannte/fremde Ordner und geaenderte Zielkonfiguration werden abgewiesen; Zuordnung nur nach administrativer Pruefung korrigieren. DB-Abschluss und Audit erfolgen in einer Transaktion. Keine Tokens, Secret-Werte, Graph-Fehlerantworten oder temporaeren Links im App-Audit.

Alle Instanzen fuer dieselben echten Faelle verwenden dasselbe fuehrende Supabase-Projekt und dieselbe Graph-Zielkonfiguration. Getrennte Testdatenbanken brauchen einen separaten Test-Cases-Stamm; unabhaengige Schadensnummern-Sequenzen duerfen nicht denselben Stamm teilen. Archiv und Vorlagen bleiben unberuehrt. Die schulische Aufbewahrung/Retention und direkten SharePoint-Benutzerrechte sind vor Produktion zu bestaetigen.

## Verifikation

Lokale Logik-/Service-/UI-/Route-Tests: `node --test tests/sharepoint-folder.test.mjs`.

Isolierter PostgreSQL-Test ohne Schuldaten: PGlite 0.5.8 ausserhalb des Repositories installieren und `PGLITE_TEST_MODULE=/absoluter/pfad/pglite/dist/index.js node --test tests/sharepoint-folder-db.test.mjs` ausfuehren. Test verwendet die echte Migration mit minimalem Rollenschema und prueft Grants/RLS, Lease, ungueltige Finalisierung, Namenssnapshot und Audit. Das ersetzt keine Integration mit dem produktiven Supabase-Rollenschema.

Vor Inbetriebnahme: Migration mit realem Zielschema in Testumgebung pruefen, Supabase-Sicherheitsadvisor ausfuehren, Graph-positiv/negativ-Test gegen die freigegebene Testressource, Recovery nach Antwortverlust und Oeffnen/Fotoupload in iPad-Safari. Diese externen Pruefungen sind ohne Adminangaben noch offen.
