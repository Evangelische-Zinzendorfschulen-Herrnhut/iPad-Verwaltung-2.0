# Schema-Spec: Personen und Klassen

## Ziel

Diese Spec beschreibt das erste konkrete Postgres/Supabase-Zielschema fuer Personen, Schuljahre, Klassen und Klassenhistorie.

Quelle fuer Erstimport:

- Legacy-Tabelle `User` aus `db/iPad-Verwaltung.db`

## Enums

### person_type

- `schueler`
- `lehrer`
- `mitarbeiter`
- `referendar`
- `praktikant`

### person_status

- `aktiv`
- `ausgeschieden`
- `verstorben`
- `dublette`
- `test`
- `unklar`

### school_year_status

- `geplant`
- `vorbereitet`
- `aktiv`
- `abgeschlossen`

### class_assignment_source

- `import`
- `rollover`
- `manual`

## Tabellen

Lokale Migration:

- `supabase/migrations/20260623132419_create_people_and_classes.sql`

### person

Speichert Personen, denen Sets zugeordnet oder fuer die Ausleihen dokumentiert werden.

| Feld | Typ | Regel |
| --- | --- | --- |
| id | uuid | primary key |
| legacy_user_id | integer | unique nullable |
| first_name | text | nullable |
| last_name | text | nullable |
| email | citext | nullable |
| person_type | person_type | not null |
| status | person_status | not null default `aktiv` |
| jahrgang | integer | nullable, bei Schuelern fachlicher Jahrgang |
| notes | text | nullable |
| import_hint | text | nullable |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Regeln:

- `person_type` und `status` werden getrennt gespeichert.
- `jahrgang` bleibt bei Schuelern ueber die Schulzeit konstant.
- Schueler, die nicht in Klasse 5 an die Schule kommen, erhalten den Jahrgang, der ihrer Eintrittsklasse entspricht.
- E-Mail ist nicht zwingend unique, da Legacy-Dubletten und Leerwerte vorkommen koennen.
- `legacy_user_id` dient der Rueckverfolgbarkeit des Imports.

Empfohlene Indizes:

- `person(legacy_user_id)`
- `person(person_type, status)`
- `person(last_name, first_name)`
- `person(email)`

### school_year

Speichert Schuljahre ueber zwei Kalenderjahre.

| Feld | Typ | Regel |
| --- | --- | --- |
| id | uuid | primary key |
| label | text | unique, z. B. `2025/26` |
| start_date | date | not null, 01.08. |
| end_date | date | not null, 31.07. |
| status | school_year_status | not null |
| activated_at | timestamptz | nullable |
| activated_by | uuid | nullable, app_user |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Regeln:

- Ein Schuljahr startet am 01.08. und endet am 31.07.
- Ein vorbereitetes Schuljahr wird automatisch am 01.08. aktiv.
- `admin` kann die Aktivierung manuell anstossen.

### school_class

Speichert konkrete Klassen oder Oberstufen-Jahrgangsgruppen in einem Schuljahr.

| Feld | Typ | Regel |
| --- | --- | --- |
| id | uuid | primary key |
| school_year_id | uuid | references school_year |
| jahrgang | integer | nullable |
| grade_level | integer | nullable, 5 bis 12 |
| label | text | not null, z. B. `09-2`, `10-4`, `11JG2019` |
| track | integer | nullable, z. B. 1 bis 4 |
| is_upper_school | boolean | not null default false |
| active | boolean | not null default true |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Constraints:

- unique `(school_year_id, label)`
- `grade_level` zwischen 5 und 12, wenn gesetzt
- `track` fuer Stufen 5 bis 9 normalerweise 1 bis 3
- `track` fuer Stufe 10 optional 1 bis 4
- Oberstufe nutzt Labels wie `11JG2019` und `12JG2018`

### person_class_assignment

Historisierte Zuordnung von Schuelern zu Klassen oder Jahrgangsgruppen.

| Feld | Typ | Regel |
| --- | --- | --- |
| id | uuid | primary key |
| person_id | uuid | references person |
| school_class_id | uuid | references school_class |
| valid_from | date | not null |
| valid_until | date | nullable |
| source | class_assignment_source | not null |
| note | text | nullable |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Regeln:

- Eine aktive Schueler-Person soll pro Zeitpunkt genau eine aktuelle Klassen-/Jahrgangsgruppenzuordnung haben.
- Wiederholung oder Klassenwechsel werden durch neue Zuordnungen abgebildet.
- Historische Zuordnungen werden beendet, nicht ueberschrieben.

Empfohlener DB-Schutz:

- Exclusion Constraint oder partial unique index fuer nur eine aktive Zuordnung pro Person.

Pragmatischer Start:

- partial unique index auf `(person_id)` where `valid_until is null`

## Import aus Legacy `User`

### Feldmapping

| Legacy `User` | Ziel |
| --- | --- |
| `UserID` | `person.legacy_user_id` |
| `Vorname` | `person.first_name` |
| `Nachname` | `person.last_name` |
| `Email` | `person.email` |
| `BenutzerTyp` | `person.person_type` + `person.status` |
| `Jahrgang` | `person.jahrgang` |
| `Klasse` | `school_class.label` + `person_class_assignment` |
| `Anmerkung` | `person.notes` |

### BenutzerTyp-Mapping

| Legacy-Wert | person_type | status | Hinweis |
| --- | --- | --- | --- |
| `Schüler` | `schueler` | `aktiv` |  |
| `Schüler - Ausgeschieden` | `schueler` | `ausgeschieden` |  |
| `Lehrer` | `lehrer` | `aktiv` |  |
| `Lehrer - Ausgeschieden` | `lehrer` | `ausgeschieden` |  |
| `Lehrer - ausgeschieden` | `lehrer` | `ausgeschieden` | Schreibweise normalisieren |
| `Lehrer - Verstorben` | `lehrer` | `verstorben` |  |
| `Mitarbeiter` | `mitarbeiter` | `aktiv` |  |
| `Schulsozialarbeit` | `mitarbeiter` | `aktiv` | Ursprung in import_hint |
| `Referendarin` | `referendar` | `aktiv` |  |
| `Praktikant` | `praktikant` | `aktiv` |  |
| `Dublette` | `schueler` oder `unklar` | `dublette` | Typ aus Datenlage pruefen |
| `Testuser` | `mitarbeiter` oder `unklar` | `test` | Typ aus Datenlage pruefen |
| leer/unbekannt | `mitarbeiter` oder `unklar` | `unklar` | Importwarnung |

## Klassenlogik

Aus `jahrgang` und Schuljahr kann eine erwartete Stufe berechnet werden.

Beispiel im Schuljahr `2025/26`:

- `jahrgang = 2025` -> Stufe 5
- `jahrgang = 2024` -> Stufe 6
- `jahrgang = 2019` -> Stufe 11
- `jahrgang = 2018` -> Stufe 12

Die konkrete Klasse aus `User.Klasse` wird trotzdem importiert und fuehrend gespeichert.

Importvalidierung:

- Wenn berechnete Stufe und Klassenlabel nicht zusammenpassen, Importwarnung erzeugen.
- Leere Klassen bei aktiven Schuelern markieren.
- Oberstufenlabels wie `11JG2019` und `12JG2018` als `is_upper_school = true` importieren.

## RLS- und Rollenhinweise

- `admin`: lesen und bearbeiten.
- `ipad_verwaltung`: lesen und eingeschraenkt bearbeiten, insbesondere Klasse/Status nur wenn fachlich erlaubt.
- `buchhaltung`: eingeschraenktes Lesen fuer Zahlungsfaelle, keine allgemeine Personenpflege.

Implementierungsregel:

- RLS nicht nur auf Frontend-Rollen verlassen.
- Personenbezogene Daten muessen serverseitig nach Rolle gefiltert werden.
- Import- und Admin-Aenderungen auditieren.

## Offene Fragen

- Wie sollen Dubletten beim Import typisiert werden, wenn `BenutzerTyp = Dublette` keine Personengruppe enthaelt?
- Soll `email` spaeter unique fuer aktive Personen werden oder wegen Legacy-Daten dauerhaft nicht unique bleiben?
- Welche Felder darf `ipad_verwaltung` an Personen selbst bearbeiten?
