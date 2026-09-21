# Offene Fragen

## Prioritaet 1: Grundlage

1. Wer soll sich in der ersten Version einloggen koennen: nur Mitarbeitende oder auch Schueler/Eltern?
2. Univention SSO ist Zielbild: Stellt euer Univention-Server OIDC/OpenID Connect, SAML oder beides fuer eigene WebApps bereit?
3. Die bestehende SQLite-Datenbank `db/iPad-Verwaltung.db` dient als erste Datenquelle, muss aber validiert und bereinigt werden.
4. Soll die App personenbezogene Daten selbst speichern oder nur referenzieren/importieren?
5. Gibt es Vorgaben des Schultraegers zu Hosting, Cloud-Anbietern und Datenschutz?

## Prioritaet 2: Prozesse

6. iPad-Sets werden im MVP ausgegeben und zurueckgenommen. Ein Set besteht aus iPad, Pencil und Tastatur. Die Set-Zuordnung wird separat gespeichert und nicht aus der Inventarnummer abgeleitet.
7. Gibt es kurzfristige Ausleihen, Jahresausleihen und Ersatzgeraete als getrennte Prozesse?
8. Welche Dokumente muessen bei Ausgabe/Rueckgabe erzeugt oder hochgeladen werden?
9. Werden Sets oder einzelne Komponenten per Barcode/QR-Code gescannt?
10. Welche Status sind im Alltag wirklich relevant?
11. Temporaer an Schueler ausgegebene Lightning-USB-Adapter sollen nach 14 Tagen zurueckgefordert oder angemahnt werden.
12. Aufgabenverwaltung startet admin-only. Welche Aufgaben sollen spaeter an `ipad_verwaltung`, `buchhaltung` oder weitere Rollen gehen?

## Prioritaet 3: Finanzen

11. Gibt es Kautionen, Mietzahlungen, Eigenanteile oder nur Schadens-/Ersatzkosten?
12. Muss ein Buchhaltungssystem angebunden werden?
13. Welche Rollen duerfen Zahlungsdaten sehen?

## Prioritaet 4: Technikbetrieb

14. Gibt es ein MDM-System, und soll es angebunden werden?
15. Muessen Reparaturdienstleister oder externe Ticketsysteme eingebunden werden?
16. Soll die App Dateien speichern, z. B. Vertraege, Fotos und Unterschriften?

## Aktuelle naechste Frage

### USB-Adapter-Nachtrag, Stand 2026-09-15

- Teilnachtrag erledigt: Zehn eindeutig zuordenbare Adapter sind aktuellen Sets zugeordnet; historische Adapter-Ausgaben aus Excel sind in der Herkunft dokumentiert, nicht als unbelegte historische Set-Zugehoerigkeit zurueckdatiert. Eine belegte abgeschlossene Adapter-Zuordnung wurde nachgetragen. Weitere Eintraege warten auf die untenstehende Modellentscheidung beziehungsweise auf Antworten zu Namensabweichungen, Doppel-Ausgaben, fehlenden Personen und bestehenden Bestandszuordnungen. Personenbezogene Details verbleiben in Supabase und im Arbeitsdialog.

- Personenunabhaengige Setbindung: Sollen Adapter direkt Personen zugeordnet werden koennen, auch ohne aktuelles Set? Entscheidung ausstehend.
- Historische Nachtraege: Fehlende Rueckgabedaten und Setnummern nicht aus anderen Vorgaengen ableiten. Konkrete Rueckfragen stehen im Arbeitsdialog; bestaetigte personenbezogene Angaben sind ausschliesslich in Supabase dokumentiert.
- Set-Rueckfrage am 2026-09-15 geklaert: Die Angabe 406 wurde auf das vorhandene Set 403 korrigiert und dessen Personenzuordnung in Supabase nachgetragen. Urspruengliches Ausgabedatum bleibt unbekannt; kein Datum erfunden. Die angefragte historische Setnummer und das Adapter-Rueckgabedatum wurden ebenfalls bestaetigt und in Supabase nachgetragen.
- Zwei bestehende gleichnamige Personeneintraege mit gleicher E-Mail bleiben nach der bestaetigten Personentyp-Korrektur bis zur gesonderten Dublettenentscheidung erhalten.

Bitte zuerst klaeren: Wie sollen Dubletten beim Personenimport behandelt werden: importieren mit Status `dublette`, zusammenführen, oder zunächst vom Import ausschließen?
