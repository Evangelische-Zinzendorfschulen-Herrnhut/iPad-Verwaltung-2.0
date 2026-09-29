# Feature: Mietgeraete und Mietvertraege

## Status

ready

## Ziel

Gemietete iPad-Sets werden wie bestehende Sets ausgegeben und zurueckgenommen.
Ihre Herkunft bleibt ueber einen Mietvertrag nachvollziehbar, ohne sie als
gekaufte Geraete oder Einkaufsrechnung darzustellen.

## Zielgruppe

- `admin`
- `ipad_verwaltung`
- `buchhaltung` lesend fuer Vertrags- und Zahlungskontext

## Hauptworkflow

1. Admin erfasst einen Beschaffungsbeleg vom Typ `Mietvertrag`.
2. Admin erfasst Vertragsnummer, Vermieter, Vertragsbeginn, Laufzeit und
   Vertragsende sowie die Vertragspositionen.
3. Das System importiert die iPads mit Seriennummern und fortlaufenden
   Inventarnummern `M000001` bis `M000067`.
4. Das System erzeugt die Set-Kennungen `M1` bis `M67`.
5. Jedes Set erhaelt ein iPad, eine Tastatur und einen Stift. Alle drei
   Komponenten tragen dieselbe M-Inventarnummer; nur das iPad hat eine
   Seriennummer.
6. Ausgabe und Ruecknahme folgen dem bestehenden Set-Workflow.

## Datenobjekte

- Beschaffungsbeleg
- Beschaffungsposition
- Set
- Komponente
- Set-Komponenten-Zuordnung

## Rechte

- Lesen: `admin`, `ipad_verwaltung`, `buchhaltung`, `readonly`
- Erstellen und Aendern: `admin`
- Ausgabe und Ruecknahme: bestehende Rechte fuer `admin` und
  `ipad_verwaltung`
- Loeschen: nicht Bestandteil dieser Iteration

## Datenschutz und Audit

- Die Seriennummern sind technische Geraeteidentifikatoren und werden nur fuer
  Inventarisierung und MDM-Zuordnung gespeichert.
- Der Import schreibt keine Personenzuordnungen.
- Import und spaetere Vertragskorrekturen muessen ueber Quelle und Notiz
  nachvollziehbar bleiben.
- Bestehende RLS-Regeln fuer Inventar und Beschaffungsbelege gelten weiter.

## Akzeptanzkriterien

- Beschaffungsbelege koennen als `Rechnung` oder `Mietvertrag` gefiltert werden.
- Ein Mietvertrag speichert Vertragsnummer, Vermieter, Vertragsbeginn,
  Laufzeit in Monaten, Vertragsende, monatliche Bruttomiete und die gesamte
  Bruttosumme ueber die Grundlaufzeit.
- Vertragsende bleibt leer, solange der Vertragsbeginn noch nicht feststeht.
- Ein iPad mit Inventarnummer `M000001` gehoert zum Set `M1`; dieselbe Regel
  gilt fortlaufend bis `M000067` und `M67`.
- Alle 67 importierten iPad-Seriennummern sind befuellt und eindeutig.
- Tastatur und Stift besitzen Hersteller- und Modelldaten und verwenden die
  M-Inventarnummer des iPads, haben aber keine Seriennummer.
- Jedes Mietset besitzt genau eine aktuelle Zuordnung fuer iPad, Tastatur und
  Stift.
- Die Set-Liste zeigt fuer die Mietkomponenten kurze, scanbare Modellnamen:
  `iPad A16 · 128 GB`, `eiP Pencil 2` und `Smart Rugged Tastatur`.
- Zwei Poolsets koennen getrennt von den 65 regulaeren Mietsets markiert
  werden.
- Netzteil wird weiterhin nur als Zubehoer auf Vollstaendigkeit geprueft;
  Schutzfolie und Softwarelizenz werden nicht als Inventarkomponenten erfasst.

## Annahmen und offene Punkte

- Assumption: Die 65 regulaeren Sets gehoeren zum vorliegenden AfB-Mietvertrag.
- Assumption: Die zwei zusaetzlichen Mobilgeraete sind kostenlose Poolsets.
- Der Vertragsbeginn ist der Folgemonat der Auslieferung am 10.09.2026 und
  damit der 01.10.2026; das Vertragsende ist der 30.09.2029.
- Die monatliche Bruttomiete betraegt 1.308,45 EUR, die Vertragssumme ueber
  36 Monate 47.104,20 EUR.
- Offen: Die Quelldatei fuehrt die zwei Pool-iPads unter einer abweichenden
  Vertragsnummer. Vor der finalen Vertragszuordnung ist zu klaeren, ob dafuer
  ein zweiter Mietvertrag angelegt wird.
- Offen: Die 65 Zeilen `Sonstige` aus der Seriennummerndatei werden nicht
  importiert, solange ihr Gegenstand nicht sicher identifiziert ist.
