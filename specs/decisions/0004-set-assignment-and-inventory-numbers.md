# ADR 0004: Set-Zuordnung nicht aus Inventarnummer ableiten

## Status

accepted

## Kontext

Die vorhandenen Inventarnummern haben das Format `E123456 / 1234`. Der zweite Zahlenblock war urspruenglich als Set-Nummer gedacht. Durch Schaeden, Reparaturen und Tauschaktionen sind diese historischen Set-Zuordnungen nicht mehr konsistent.

Zudem haben iPad, Pencil und Tastatur jeweils eigene Inventarnummern. Ein ausgebbares Set besteht aus genau diesen drei Hauptkomponenten, kann aber je nach Modell weiteres Zubehoer erwarten.

## Entscheidung

Die aktuelle Set-Zuordnung wird in einer eigenen Set-Struktur gespeichert und nicht aus der Inventarnummer abgeleitet.

Die Inventarnummer wird weiterhin als Identifikationsmerkmal der einzelnen Komponente gespeichert. Der zweite Zahlenblock kann als historischer Hinweis erfasst werden, darf aber keine fachliche Wahrheit fuer aktuelle Set-Zuordnung sein.

## Konsequenzen

- Sets koennen nach Schaeden oder Tausch sauber neu zusammengestellt werden.
- Historische Inventarnummern bleiben suchbar.
- Ausgabe und Ruecknahme beziehen sich auf die aktuelle Set-Zuordnung.
- Rueckgabepruefungen muessen Komponenten und modellabhaengiges Zubehoer anzeigen.
- Fehlende oder beschaedigte Teile koennen dokumentiert und abrechenbar markiert werden.
