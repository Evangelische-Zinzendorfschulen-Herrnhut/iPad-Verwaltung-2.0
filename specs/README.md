# iPad-Verwaltung 2.0 Specs

Dieses Verzeichnis ist die fachliche und technische Quelle der Wahrheit fuer die App.

## Ziel

Eine WebApp zur Verwaltung schulischer iPad-Sets, ihrer Geraete, Nutzer, Ausleihen, Rueckgaben, Zahlungen, Schadensfaelle, Reparaturen und administrativen Aufgaben.

## Vorgehen

1. Fachliche Prozesse klaeren.
2. Rollen und Rechte definieren.
3. Datenmodell und Audit-Anforderungen festlegen.
4. Feature-Spezifikationen schreiben.
5. Architekturentscheidungen per ADR dokumentieren.
6. Erst danach implementieren.

## Struktur

- `product-vision.md`: Zielbild, Nutzergruppen und Leitplanken
- `tech-stack.md`: empfohlener Stack und Alternativen
- `data/domain-model.md`: fachliches Datenmodell
- `data/roles-and-permissions.md`: Rollen, Rechte und Verantwortlichkeiten
- `data/privacy-and-audit.md`: Datenschutz, Aufbewahrung und Audit
- `data/legacy-sqlite-source.md`: Analyse und Importregeln fuer die bestehende SQLite-Datenbank
- `data/status-normalization.md`: Zielmodell fuer normalisierte Statusdimensionen
- `data/schema-persons-classes.md`: konkretes Zielschema fuer Personen, Schuljahre und Klassen
- `data/schema-app-users-roles.md`: Zielschema fuer lokale App-Benutzer, Auth-Identitaeten und Rollen
- `features/`: Feature-Spezifikationen
- `decisions/`: Architecture Decision Records
- `questions/open-questions.md`: offene Fragen fuer die naechsten Entscheidungen

## Spec-Vorlage

Jede Feature-Spec sollte mindestens enthalten:

- Problem
- Zielgruppe
- Hauptworkflow
- Datenobjekte
- Rollen/Rechte
- Akzeptanzkriterien
- Nicht-Ziele
- Offene Fragen
