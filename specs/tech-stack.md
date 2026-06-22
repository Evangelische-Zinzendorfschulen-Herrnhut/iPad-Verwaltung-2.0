# Tech-Stack-Empfehlung

## Empfehlung fuer den Start

- Next.js mit App Router und TypeScript
- Vercel als Hosting- und Preview-Plattform
- Tailwind CSS fuer Styling
- shadcn/ui fuer solide, anpassbare UI-Komponenten
- Postgres als relationale Datenbank
- Supabase als pragmatische Option fuer Postgres, Auth im MVP, Storage und Row Level Security
- Auth.js oder direkte OIDC-Integration fuer spaetere Univention-SSO-Anbindung
- Zod fuer Eingabevalidierung und geteilte Schemas
- Prisma oder Drizzle fuer Datenbankzugriff
- Playwright fuer End-to-End-Tests
- Vitest fuer Unit- und Domain-Tests

## Warum dieser Stack passt

Next.js passt gut zu Vercel und erlaubt Server Components, Server Actions oder Route Handler fuer serverseitige Logik. TypeScript hilft bei einem datenreichen Verwaltungsprodukt, in dem Rollen, Statuswerte und Prozessregeln sauber modelliert werden muessen.

Postgres ist fuer diesen Anwendungsfall sehr passend, weil Geraete, Sets, Personen, Zahlungen, Ausleihen, Reparaturen und Audit-Logs stark relationale Daten sind.

Supabase ist attraktiv, wenn schnelle Entwicklung, Auth, Storage und Datenbankbetrieb aus einer Hand gewuenscht sind. Fuer das MVP kann Supabase Auth verwendet werden, solange die App fachliche Rollen und Benutzerprofile nicht direkt an Supabase-spezifische Annahmen koppelt. Zielbild bleibt Univention SSO als Login-Quelle. Wichtig: Rollenrechte muessen fachlich sauber modelliert werden; bei Supabase gehoert Row Level Security frueh in die Architektur.

## Alternativen

- Auth.js plus eigener Postgres-Datenbank: gut, wenn Auth flexibel bleiben soll oder Schul-SSO speziell integriert wird.
- Vercel Postgres/Neon: gut, wenn Datenbank nah am Vercel-Oekosystem bleiben soll.
- Drizzle statt Prisma: schlanker und SQL-naeher.
- Prisma statt Drizzle: sehr ergonomisch, breiter bekannt, gutes Migrationsmodell.

## Vorlaeufige Entscheidung

Assumption: Wir starten mit Next.js, TypeScript, Tailwind, Supabase Postgres und Supabase Auth mit E-Mail/Passwort fuer das MVP.

Die finale Entscheidung fuer die langfristige Auth-Integration, Prisma oder Drizzle wird nach Klaerung der Univention-Protokolle, Datenschutzanforderungen und Betriebsverantwortung per ADR getroffen.

## Authentifizierung mit Univention SSO

Vorgabe: Die Schule nutzt einen Univention SSO-Server. Fuer das MVP ist Supabase Auth mit E-Mail/Passwort als pragmatische Zwischenloesung erlaubt.

Praeferenz fuer die App:

1. OIDC/OpenID Connect ueber Univention/Keycloak, wenn verfuegbar.
2. Auth.js mit generischem OIDC Provider oder direkter OAuth/OIDC-Konfiguration.
3. Falls nur SAML verfuegbar ist: SAML-Bridge, Keycloak als Broker oder ein anderer kompatibler Adapter pruefen.

Die App speichert lokale Benutzerprofile und App-Rollen getrennt vom Login-Provider. Im MVP kann `auth.users.id` von Supabase die externe Identitaet referenzieren. Bei Umstellung auf Univention wird diese Referenz durch die Univention-Subjekt-ID ersetzt oder ergaenzt. Die App startet mit den fachlichen Rollen `admin` und `ipad_verwaltung`; weitere Rollen koennen spaeter ergaenzt werden.

## Auth-Migrationsregel

Damit Supabase Auth spaeter austauschbar bleibt:

- Fachliche Rollen gehoeren in eigene App-Tabellen, nicht nur in Auth-Metadaten.
- Domain-Tabellen referenzieren ein lokales `app_user`-Profil, nicht direkt den Auth-Provider.
- Auth-Provider-spezifische IDs werden in einer separaten Identitaetstabelle gespeichert.
- Servercode nutzt eine interne Funktion wie `getCurrentAppUser()`, nicht ueberall direkte Supabase-Auth-Zugriffe.
- RLS-Policies muessen beim Wechsel zu Univention neu bewertet werden.

## Quellen

- Next.js Docs: https://nextjs.org/docs/app/getting-started/installation
- Vercel Next.js Docs: https://vercel.com/docs/frameworks/full-stack/nextjs
- Supabase Next.js SSR Docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs
- Auth.js Installation: https://authjs.dev/getting-started/installation
