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

## Prioritaet 3: Finanzen

11. Gibt es Kautionen, Mietzahlungen, Eigenanteile oder nur Schadens-/Ersatzkosten?
12. Muss ein Buchhaltungssystem angebunden werden?
13. Welche Rollen duerfen Zahlungsdaten sehen?

## Prioritaet 4: Technikbetrieb

14. Gibt es ein MDM-System, und soll es angebunden werden?
15. Muessen Reparaturdienstleister oder externe Ticketsysteme eingebunden werden?
16. Soll die App Dateien speichern, z. B. Vertraege, Fotos und Unterschriften?

## Aktuelle naechste Frage

Bitte zuerst klaeren: Wie sollen Dubletten beim Personenimport behandelt werden: importieren mit Status `dublette`, zusammenführen, oder zunächst vom Import ausschließen?
