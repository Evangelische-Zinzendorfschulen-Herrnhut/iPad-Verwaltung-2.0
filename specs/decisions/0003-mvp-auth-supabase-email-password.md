# ADR 0003: MVP-Auth mit Supabase E-Mail/Passwort

## Status

accepted

## Kontext

Das Zielbild ist Univention SSO. Fuer die fruehe Entwicklung soll die App aber ohne grossen Integrationsaufwand nutzbar sein.

## Entscheidung

Das MVP nutzt Supabase Auth mit E-Mail/Passwort.

Die fachliche Benutzer- und Rollenverwaltung wird getrennt davon modelliert:

- `app_user` fuer lokale Benutzerprofile
- `auth_identity` fuer Provider-Zuordnung
- `role` und `user_role` fuer App-Berechtigungen

Neue Benutzer und Rollenvergaben duerfen im MVP ausschliesslich durch `admin` erfolgen.

Das MVP startet mit drei aktiven Rollen:

- `admin`
- `ipad_verwaltung`
- `buchhaltung`

Die IT-Funktion ist im MVP in `admin` enthalten.

## Konsequenzen

- Die Entwicklung kann schnell starten.
- Testnutzer koennen ohne Univention-Konfiguration angelegt werden.
- Spaeterer Wechsel zu Univention bleibt moeglich.
- Passwort-Reset und Account-Einladungen laufen zunaechst ueber Supabase.
- Benutzer- und Rollenverwaltung braucht im MVP eine Admin-Oberflaeche oder einen kontrollierten Admin-Seed-Prozess.
- Vor echtem Produktivbetrieb muss entschieden werden, ob Supabase Auth bleiben darf oder Univention zwingend wird.

## Nicht-Ziele

- Kein Eltern-/Schuelerlogin im MVP.
- Keine automatische Rollenableitung aus Univention-Gruppen im MVP.
- Keine eigene Passwortspeicherung ausserhalb von Supabase Auth.
- Keine getrennten Rollen fuer Sekretariat, IT oder Schulleitung im MVP.
