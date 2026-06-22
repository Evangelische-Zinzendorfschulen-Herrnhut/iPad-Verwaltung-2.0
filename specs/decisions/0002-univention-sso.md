# ADR 0002: Univention SSO als Login-Quelle

## Status

accepted-for-target, deferred-for-mvp

## Kontext

Die Schule verwendet einen Univention SSO-Server. Langfristig soll die WebApp keine eigene Passwortverwaltung aufbauen und keine parallele Identitaetsquelle fuer Mitarbeitende einfuehren.

Fuer einen schnellen MVP-Start ist Supabase Auth akzeptabel, wenn die App so gebaut wird, dass die Authentifizierungsquelle spaeter gewechselt werden kann.

## Entscheidung

Langfristig integriert sich die App mit Univention SSO als externem Identity Provider.

Fuer das MVP verwenden wir Supabase Auth mit E-Mail/Passwort, sofern dadurch die Entwicklung deutlich einfacher startet.

Praeferenz:

1. OIDC/OpenID Connect, falls vom Univention-Setup bereitgestellt.
2. SAML nur dann direkt, wenn OIDC nicht verfuegbar ist oder schulische Vorgaben dies erzwingen.
3. App-Rollen werden lokal in der iPad-Verwaltung gepflegt oder spaeter aus Gruppenclaims gemappt.

## Konsequenzen

- Im MVP verwaltet Supabase Auth E-Mail/Passwort-Logins.
- Benutzerkonten in der App referenzieren eine externe Identitaet, anfangs Supabase, spaeter Univention.
- Fachliche Rollen muessen nicht zwingend identisch mit Univention-Gruppen sein.
- Login-Claims duerfen nicht ungeprueft als fachliche Berechtigung verwendet werden.
- Die konkrete Integration entscheidet, ob Auth.js, eine direkte OIDC-Implementierung oder eine SAML-Bridge genutzt wird.
- Domain-Logik darf nicht direkt von Supabase Auth abhaengen.

## Migrationsleitplanken

- Eine lokale App-Benutzertabelle ist die fachliche Referenz.
- Eine separate Identitaetszuordnung speichert Provider und Provider-User-ID.
- Rollen liegen in App-Tabellen.
- Auth-Zugriffe werden hinter einer kleinen Server-Abstraktion gebuendelt.
- Vor Produktivbetrieb mit echten Schulnutzerkonten wird Univention erneut bewertet.

## Offene Fragen

- Unterstuetzt das vorhandene Univention-Setup OIDC/OpenID Connect fuer eigene WebApps?
- Welche Claims liefert der SSO-Server: E-Mail, Anzeigename, Gruppen, UUID?
- Gibt es bereits Gruppen fuer Sekretariat, Buchhaltung, IT und iPad-Verwaltung?
- Soll Rollenmapping automatisch aus Gruppen erfolgen oder manuell in der App?
