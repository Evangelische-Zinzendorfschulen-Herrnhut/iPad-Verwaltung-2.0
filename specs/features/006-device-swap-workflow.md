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
- Temporäre Doppelzuordnung ist nur innerhalb dieses Workflows erlaubt.
- Standard-Rückgabefrist für das alte Gerät/Set beträgt 14 Tage.
- Überfällige Gerätetausche können gefiltert werden.
- Erinnerungen oder Mahnungen werden nachvollziehbar dokumentiert.

## Nicht-Ziele

- Nicht Teil des ersten MVP-Workflows.
- Keine automatische Datenübertragung oder MDM-Aktion.

## Offene Fragen

- Wird beim Gerätetausch immer ein ganzes Set getauscht oder manchmal nur eine Komponente?
- Wer erhält die Erinnerung: Benutzer, iPad-Verwaltung, Klassenleitung oder Sekretariat?
- Soll der Gerätetausch zwingend mit einem Schadensfall verknüpft sein?
