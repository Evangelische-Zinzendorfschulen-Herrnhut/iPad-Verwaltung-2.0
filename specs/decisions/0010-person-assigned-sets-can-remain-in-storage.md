# ADR 0010: Personenzugeordnete Sets koennen physisch im Lager bleiben

## Status

accepted

## Kontext

Sets werden immer Personen zugeordnet. Schueler sind immer einer Klasse zugeordnet.

Die iPads der 5. und 6. Klassen werden nicht dauerhaft physisch an die Schueler ausgegeben. Sie verbleiben zur Nutzung im Lager beziehungsweise in iPadwaegen. Ab Klasse 7 werden die zugeordneten Sets auch physisch ausgegeben.

## Entscheidung

Fachliche Personenzuordnung und physische Ausgabe werden getrennt modelliert.

Ein Set kann:

- einer Person zugeordnet sein
- physisch in einem Lagerort oder Lagerplatz liegen
- nicht physisch an diese Person ausgegeben sein

## Konsequenzen

- Der Status `ausgegeben` darf nicht allein aus Personenzuordnung abgeleitet werden.
- Lagerort und Lagerplatz bleiben auch fuer personenzugeordnete Sets relevant.
- Klassenstufe beeinflusst die physische Ausgabe.
- Schueler brauchen eine Klassen-/Stufeninformation.
- iPadwagenplaetze sollen vorrangig komplette Sets enthalten.
