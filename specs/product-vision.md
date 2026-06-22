# Produktvision

## Kurzbeschreibung

Die iPad-Verwaltung 2.0 soll den gesamten Lebenszyklus schulischer iPad-Sets abbilden: Anschaffung, Inventarisierung, Zuordnung, Ausgabe, Rueckgabe, Reparatur, Schadensfaelle, Kommunikation und finanzielle Abwicklung.

Im MVP steht die Ausgabe und Ruecknahme von iPad-Sets im Mittelpunkt.

Ein iPad-Set besteht immer aus drei Komponenten:

- iPad
- Pencil
- Tastatur, also Huelle mit Tastatur

## Nutzergruppen

- Sekretariat: Schueler- und Elternkontakte, Formulare, Statusauskunft, organisatorische Rueckfragen
- Buchhaltung: Zahlungen, Rechnungen, Kautionen, Mahnungen, Kostenstellen
- IT: technische Geraetedaten, MDM-Status, Reparaturen, Sperrungen, Austauschgeraete
- iPad-Verwaltung: Set-Planung, Ausgabe/Ruecknahme, Dokumentation, Gesamtuebersicht
- Schulleitung: Auswertungen, Eskalationen, Datenschutz- und Prozesssicherheit

## Leitprinzipien

- Arbeitsoberflaeche statt Marketingseite
- Schnelle Suche nach Schueler, Geraet, Seriennummer, Set und Vorgang
- Nachvollziehbare Historie fuer kritische Aenderungen
- Klare Verantwortlichkeiten pro Prozessschritt
- Exportierbare Daten fuer Buchhaltung und Schulleitung
- Datenschutzfreundlich: nur notwendige personenbezogene Daten speichern

## Erste Prozessbereiche

- Set-Verwaltung
- Ausgabe und Rueckgabe
- Inventarverwaltung fuer Set-Komponenten
- Schadens- und Reparaturfaelle
- Zahlungen und Kautionen
- Dokumente und Einverstaendniserklaerungen
- Benachrichtigungen und Aufgaben
- Reporting

## MVP-Rollenfokus

Das MVP startet mit drei aktiven Rollen:

- admin
- ipad_verwaltung
- buchhaltung

Die IT-Funktion wird im MVP durch `admin` abgedeckt. Sekretariat und Schulleitung bleiben als spaetere Rollen im Zielbild erhalten.

## MVP-Prozessfokus

Der wichtigste MVP-Workflow ist:

1. iPad-Set aus iPad, Pencil und Tastatur zusammenstellen.
2. Set an eine Person ausgeben.
3. Ausgabezustand dokumentieren.
4. Set zuruecknehmen.
5. Rueckgabezustand je Komponente dokumentieren.
6. Bei fehlender oder beschaedigter Komponente Folgeprozess markieren.
