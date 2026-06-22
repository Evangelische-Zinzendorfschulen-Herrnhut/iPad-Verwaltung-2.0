# AGENTS.md

## Projektkontext

Dieses Repository dient dem Aufbau einer WebApp zur Verwaltung von iPad-Sets an einer Schule. Die App soll mehrere Arbeitsbereiche unterstuetzen: Sekretariat, Buchhaltung, IT und iPad-Verwaltung.

Geplantes Deployment-Ziel: Vercel.

## Arbeitsweise

- Specs-first entwickeln: Vor Implementierung einer Funktion muessen Ziel, Nutzerrolle, Datenmodell, Rechte, Akzeptanzkriterien und offene Fragen dokumentiert sein.
- Keine groesseren Architekturentscheidungen ohne ADR in `specs/decisions/`.
- Fachbegriffe der Schule bevorzugen. Wenn technische Begriffe noetig sind, kurz und konsistent halten.
- Datenschutz und Rollenrechte sind Teil jeder Funktion, nicht nachgelagerte Arbeit.
- Kleine, nachvollziehbare Schritte bevorzugen: erst Spezifikation, dann Datenmodell, dann UI/API, dann Tests.

## Empfohlener Stack

- Framework: Next.js mit App Router und TypeScript
- Deployment: Vercel
- Styling/UI: Tailwind CSS plus shadcn/ui oder eine kleine eigene Komponentenbibliothek
- Datenbank: Postgres, bevorzugt Supabase oder Vercel Postgres/Neon
- Auth: Supabase Auth mit E-Mail/Passwort im MVP; Zielbild Univention SSO als externe Login-Quelle, bevorzugt OIDC/OpenID Connect, alternativ SAML-Integration
- Validierung: Zod
- ORM/DB-Zugriff: Prisma oder Drizzle; Entscheidung per ADR festhalten
- Tests: Vitest fuer Logik, Playwright fuer zentrale Workflows

## Verzeichnisregeln

- `specs/` enthaelt Produkt-, Fach- und Architekturentscheidungen.
- `specs/features/` enthaelt je Feature eine eigene Spezifikation.
- `specs/data/` enthaelt Datenmodell, Rollen, Datenschutz und Audit-Anforderungen.
- `specs/decisions/` enthaelt ADRs.
- `specs/questions/` enthaelt offene Fragen und Entscheidungen.

## Definition of Ready

Eine Funktion ist bereit zur Umsetzung, wenn:

- Zielgruppe und Workflow beschrieben sind.
- Primaere Nutzerrolle und Nebenrollen benannt sind.
- Betroffene Datenobjekte dokumentiert sind.
- Rechte fuer Lesen, Erstellen, Aendern und Loeschen beschrieben sind.
- Akzeptanzkriterien testbar formuliert sind.
- Datenschutz- und Audit-Anforderungen geklaert sind.

## Definition of Done

Eine Funktion ist fertig, wenn:

- Akzeptanzkriterien erfuellt sind.
- Rollenrechte serverseitig geprueft werden.
- Eingaben validiert werden.
- Kritische Aenderungen auditierbar sind.
- Relevante Tests laufen.
- Spezifikation und ADRs aktualisiert sind.

## Sicherheitsregeln

- Keine Geheimnisse, Zugangsdaten oder Tokens commiten.
- Personenbezogene Daten nur speichern, wenn sie fuer den Schulprozess noetig sind.
- Rollenrechte niemals nur im Frontend absichern.
- Aenderungen an Sets, Komponenten, Ausleihen, Zahlungen, Schadensfaellen und Nutzerzuordnungen auditieren.
- Bei Supabase: RLS fuer exponierte Tabellen einplanen und Policies fachlich begruenden.
- Supabase Auth darf fuer das MVP genutzt werden. Auth-Zugriffe kapseln, damit spaeter Univention SSO angebunden werden kann.
- Benutzeranlage und Rollenvergabe sind im MVP admin-only.
- MVP-Rollen sind `admin`, `ipad_verwaltung` und `buchhaltung`; IT ist im MVP in `admin` enthalten.
- Wichtigster MVP-Workflow ist iPad-Sets ausgeben und zuruecknehmen.
- Ein iPad-Set besteht im MVP immer aus iPad, Pencil und Tastatur. `Tastatur` meint Huelle mit Tastatur.
- iPad, Pencil und Tastatur haben eigene Inventarnummern.
- Inventarnummern im Format `E123456 / 1234` duerfen nicht als aktuelle Set-Zuordnung interpretiert werden; Sets brauchen eine eigene Zuordnung.
- Bei Ruecknahme muss Vollstaendigkeit der Komponenten und ihres Zubehoers protokollierbar und bei Bedarf abrechenbar sein.
- Ersatzbetraege muessen versioniert werden; der Betrag wird erst beim Erstellen einer Abrechnung/Zahlungsforderung festgeschrieben.
- `admin` und `ipad_verwaltung` duerfen Zahlungsforderungen erstellen; `buchhaltung` wird dabei per Mail informiert.
- Initiale Buchhaltungsadresse: anja.desmaretz@ezsh.de.
- Legacy-Datenquelle ist `db/iPad-Verwaltung.db`. Sie enthaelt bekannte Inkonsistenzen und darf nur mit Validierungs-/Bereinigungslogik migriert werden.
- Ausleihrelevante Personentypen sind Schueler, Lehrer, Mitarbeiter, Referendar und Praktikant.
- Personentyp und Personenstatus werden getrennt gespeichert; Legacy-`BenutzerTyp` wird normalisiert.
- Schulsozialarbeit wird als `mitarbeiter` gefuehrt; fuer `referendar` und `praktikant` gelten vorlaeufig Lehrer-Regeln.
- Schueler erhalten das Grundset und koennen temporaer Lightning-USB-Adapter erhalten; Lehrer erhalten zusaetzlich Lightning-USB-Adapter und HDMI-Kabel; Mitarbeiter erhalten Adapter nur auf Anfrage.
- Magic-Maeuse sind Zusatzartikel auf Anfrage und gehoeren nicht zum Set.
- Zukunftsaufgabe: temporaer an Schueler ausgegebene Lightning-USB-Adapter sollen nach 14 Tagen zurueckgefordert beziehungsweise angemahnt werden.
- Komponenten- und Zusatzartikelkategorien sollen erweiterbar modelliert werden; nicht hart auf die aktuellen Kategorien codieren.
- Startkategorien: iPad, Pencil, Tastatur, Adapter, HDMI-Kabel, Netzteil, Kabel, Magic-Maus. Im Moment keine weiteren.
- Statuswerte werden in getrennte Dimensionen normalisiert: Komponenten-Zustand, Komponenten-Verfuegbarkeit, Set-Zustand, Set-Verfuegbarkeit und Ausleihstatus. Legacy-Originalwerte bleiben erhalten.
- Komponenten-Zustand `beschaedigt` wird in der UI als "Beschädigt, nutzbar" angezeigt und blockiert Sets nicht automatisch.
- `Zurücksetzen` ist ein Übergang nach Rückgabe bis zur erneuten Verfügbarkeit.
- `Gerätetausch neu/alt` wird als Zukunftsworkflow mit temporärer Doppelzuordnung und 14-Tage-Rückgabeerinnerung modelliert.
- `Prüfung Rückgabe` wird vorläufig als Prüfmarkierung/Importhinweis behandelt.
- `nicht zugeordnet` ist kein Workflow, sondern Import-/Bestandsklärungsbedarf.
- `in Bearbeitung` gehört zum Zukunftsworkflow Schadens-/Problemmeldung mit PDF-Schadensbericht und Upload des unterschriebenen PDFs.
- `gesperrt, kein MDM` bei iPads blockiert das betroffene Set.
- Freie und blockierte Sets duerfen aufgetrennt werden, um andere Sets zu vervollstaendigen; ausgegebene Sets nicht ohne Ruecknahme.
- Beim Vervollstaendigen von Sets soll die App passende Komponenten aus freien/blockierten Sets vorschlagen und Lagerorte anzeigen.
- Fuer freie und blockierte Sets soll ein Lagerort dokumentierbar sein.
- Start-Lagerorte: W1 bis W6 als iPadwaegen mit je 30 Plaetzen, plus Schrank1, Schrank2 und Regal1. Bei W1-W6 wird der konkrete Platz 1-30 dokumentiert.
- Sets werden immer Personen zugeordnet; Schueler sind immer einer Klasse zugeordnet.
- Sets fuer Schueler der 5. und 6. Klassen koennen personenzugeordnet sein und trotzdem physisch im Lager/Wagen bleiben; ab Klasse 7 werden sie physisch ausgegeben.
- Wagenplaetze sollen vorrangig komplette Sets enthalten.
- Jahrgang ist die stabile Kohorte, Klasse/Jahrgangsgruppe wird separat und historisiert gefuehrt. Stufen 5-9 meist dreizuegig, Stufe 10 bis 10-4, Oberstufe als 11JG/12JG.
- Im Schema den fachlichen Begriff `jahrgang` verwenden, nicht `entry_year`.
- Schuljahr laeuft vom 01.08. bis 31.07. und wird automatisch aus dem Datum bestimmt, z. B. 2025/26.
- Beim Schuljahreswechsel sollen Klassen-/Jahrgangsgruppenzuordnungen vorgeschlagen und gesammelt uebernommen werden; Wiederholer werden manuell angepasst.
- Das kommende Schuljahr soll vor dem 01.08. vorbereitet werden koennen; vorbereitete Zuordnungen werden erst bei Aktivierung wirksam.
- Vorbereitetes Schuljahr wird automatisch am 01.08. aktiv; `admin` kann Aktivierung manuell anstossen.
- Personen/Klassen-Zielschema ist in `specs/data/schema-persons-classes.md` beschrieben.

## Agentenhinweise

- Erst vorhandene Specs lesen, dann Code schreiben.
- Bei Unsicherheit offene Frage in `specs/questions/open-questions.md` ergaenzen.
- Fachliche Annahmen als `Assumption:` in der passenden Spec markieren.
- Keine UI-Landingpage bauen, bevor Kernworkflows geklaert sind.
- Fuer Vercel-kompatible Implementierung serverseitige Laufzeitgrenzen beachten.
