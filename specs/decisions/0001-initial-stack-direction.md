# ADR 0001: Vorlaeufige Stack-Richtung

## Status

proposed

## Kontext

Die App soll als WebApp fuer mehrere schulische Rollen entwickelt und auf Vercel deployt werden. Der Anwendungsfall ist daten- und rollenintensiv.

## Entscheidung

Wir planen vorerst mit:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Postgres
- Vercel Deployment
- Zod fuer Validierung
- Playwright und Vitest fuer Tests
- Univention SSO als externe Login-Quelle

Die finalen Entscheidungen fuer Auth-Integration, Datenbankanbieter und ORM bleiben offen, bis Univention-Protokoll, Datenschutz und Betriebsmodell geklaert sind.

## Konsequenzen

- Die Architektur bleibt Vercel-kompatibel.
- Das Datenmodell wird relational geplant.
- Rollenrechte und Audit werden frueh spezifiziert.
- Supabase, Vercel Postgres/Neon, Auth.js, Prisma und Drizzle werden gezielt verglichen.
- Supabase Auth wird vorerst nicht als primaere Identitaetsquelle geplant.
