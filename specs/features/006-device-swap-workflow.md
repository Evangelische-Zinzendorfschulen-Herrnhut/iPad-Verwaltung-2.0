# Feature: Gerätetausch mit temporärer Doppelzuordnung

## Status

future

## Problem

Bei technischen Problemen oder Schäden kann ein Benutzer vorübergehend zwei Geräte oder Sets haben: das alte Gerät/Set und ein Ersatzgerät/Set. Dieser Zeitraum dient der Datenübertragung und muss nachvollziehbar begrenzt werden.

In der Legacy-Datenbank wurde dies mit `Gerätetausch neu` und `Gerätetausch alt` markiert.

## Zielgruppe

- ipad_verwaltung
- admin

## Zielbild

1. Nutzer startet einen Gerätetausch aus einem Schadensfall oder einer Problemmeldung.
2. System verknüpft altes und neues Gerät/Set.
3. System dokumentiert Grund, Startdatum und erwartetes Rückgabedatum.
4. Der Benutzer darf während der Übergangszeit zwei Geräte/Sets zugeordnet haben.
5. Nach 14 Tagen erinnert oder mahnt das System die Rückgabe des alten Geräts/Sets an.
6. Nach Rückgabe wird der Tausch abgeschlossen.

## Fachregel: Settausch vs. Komponententausch

Bei einem beschädigten iPad wird in der Regel nicht nur die iPad-Komponente
getauscht, sondern das ganze Set. Eine abweichende iPad-Inventarnummer in der
Legacy-Spalte `Sets.iPad`, deren letzte Slash-Ziffern nicht zur `SetID` passen,
ist deshalb als Hinweis auf einen Settausch zu behandeln, nicht als aktive
iPad-Komponenten-Zuordnung zu diesem Set.

Bei defektem Pencil oder defekter Tastatur wird dagegen in der Regel nur die
betroffene Komponente getauscht. Abweichende Slash-Ziffern bei Pencil oder
Tastatur koennen daher eine echte Komponenten-Neuzuordnung innerhalb des Sets
beschreiben.

Assumption: Fuer iPads gilt die Setnummer aus den letzten Ziffern der
iPad-Inventarnummer als Konsistenzregel fuer die Set-Komponenten-Zuordnung. Fuer
Pencil und Tastatur ist eine Abweichung erlaubt, muss aber als Komponententausch
nachvollziehbar bleiben.

## Datenobjekte

- Gerätetausch
- Ausleihe
- Set
- Komponente
- Schadensfall
- Benachrichtigung
- AuditLog

## Akzeptanzkriterien, Entwurf

- Gerätetausch kann altes und neues Set oder alte und neue Komponente eindeutig verknüpfen.
- iPad-Schäden führen fachlich zu einem Settausch, sofern kein expliziter
  Ausnahmefall dokumentiert ist.
- Pencil- und Tastaturschäden können als Komponententausch innerhalb eines Sets
  dokumentiert werden.
- Temporäre Doppelzuordnung ist nur innerhalb dieses Workflows erlaubt.
- Standard-Rückgabefrist für das alte Gerät/Set beträgt 14 Tage.
- Überfällige Gerätetausche können gefiltert werden.
- Erinnerungen oder Mahnungen werden nachvollziehbar dokumentiert.

## Nicht-Ziele

- Nicht Teil des ersten MVP-Workflows.
- Keine automatische Datenübertragung oder MDM-Aktion.

## Offene Fragen

- Wer erhält die Erinnerung: Benutzer, iPad-Verwaltung, Klassenleitung oder Sekretariat?
- Soll der Gerätetausch zwingend mit einem Schadensfall verknüpft sein?
- Gibt es dokumentierte Ausnahmefälle, in denen ausnahmsweise nur ein iPad ohne
  Settausch ersetzt wurde?
