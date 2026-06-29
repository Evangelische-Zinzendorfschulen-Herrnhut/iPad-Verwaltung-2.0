# Schema-Spec: App-Benutzer und Rollen

## Ziel

Lokale App-Benutzer und fachliche Rollen werden getrennt von Supabase Auth modelliert. Dadurch bleibt spaeter ein Wechsel zu Univention SSO moeglich.

## Tabellen

- `app_user`
- `auth_identity`
- `role`
- `user_role`

### app_user

| Feld | Bedeutung |
| --- | --- |
| `email` | Primaere Kontakt- und Login-Adresse |
| `first_name` | Vorname des App-Benutzers |
| `last_name` | Nachname des App-Benutzers |
| `display_name` | Anzeigename/Fallback, falls Vor- und Nachname fehlen |
| `status` | `active` oder `disabled` |

Vor- und Nachname werden getrennt gespeichert, damit der aktive App-Benutzer in Workflows wie Schadensmeldungen als Bearbeiter eindeutig vorausgefuellt werden kann. Beim spaeteren Univention-SSO sollen diese Felder aus Profilclaims befuellt werden.

## Rollen zum Start

- `admin`
- `ipad_verwaltung`
- `buchhaltung`

## Auth-Provider

Im MVP wird `auth_identity.provider = supabase` verwendet und `provider_user_id` referenziert `auth.users.id`.

Spaeter kann ein weiterer Provider, z. B. `univention`, ergaenzt werden.

## Hilfsfunktionen

- `current_app_user_id()`
- `current_app_user_has_role(role_key text)`
- `current_app_user_has_any_role(role_keys text[])`
- `is_admin()`

## RLS-Grundsatz

- Benutzer- und Rollenverwaltung ist admin-only.
- Nutzer duerfen ihr eigenes App-Profil und eigene Rollen lesen.
- `admin` und `ipad_verwaltung` duerfen Personen/Klassen lesen.
- Nur `admin` darf Personen/Klassen im ersten Schritt verwalten.

## Migration

- `supabase/migrations/20260623135656_create_app_users_roles_and_policies.sql`
- `supabase/migrations/20260625131542_add_app_user_names.sql`

## Offene Fragen

- Soll `ipad_verwaltung` spaeter einzelne Personenfelder bearbeiten duerfen?
- Soll `buchhaltung` eingeschraenkte Personen-Leserechte direkt per RLS erhalten oder nur ueber Zahlungs-Views?
