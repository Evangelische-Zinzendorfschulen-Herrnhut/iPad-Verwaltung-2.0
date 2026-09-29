# ADR 0012: Mietsets erhalten eigene Set-Kennungen

## Status

accepted

## Kontext

Bei den bisherigen Bestandssets besitzen iPad, Pencil und Tastatur jeweils
eigene Inventarnummern. Die neue Mietausstattung wird dagegen als
zusammengehoeriges Set inventarisiert. Die gemeinsame Inventarnummer
bezeichnet das gesamte dreiteilige Set.

## Entscheidung

- Gemietete iPads erhalten sechsstellige Inventarnummern `M000001` bis
  `M000067`.
- Die fachliche Set-Kennung laesst die fuehrenden Nullen weg und lautet `M1`
  bis `M67`.
- Die Zuordnung zwischen Inventarnummer und Set-Kennung wird explizit
  gespeichert und nicht aus einer historischen Slash-Nummer abgeleitet.
- Tastatur und Stift bleiben eigenstaendige Komponenten fuer Zustands- und
  Vollstaendigkeitspruefungen und tragen dieselbe M-Inventarnummer wie das
  iPad, aber keine Seriennummer.
- Bestehende E-Bestaende und ihre historischen Nummern bleiben unveraendert.

## Konsequenzen

- `inventory_set` benoetigt eine textuelle Set-Kennung neben der optionalen
  Legacy-Setnummer.
- Eine M-Inventarnummer darf je Komponentenkategorie genau einmal vorkommen;
  bestehende E-Inventarnummern bleiben global eindeutig.
- Ansichten und Suchfunktionen verwenden bevorzugt die neue Set-Kennung und
  fallen fuer Altbestaende auf die Legacy-Setnummer zurueck.
- Die Vollstaendigkeit eines Sets wird weiterhin ueber drei aktuelle
  Komponentenrollen geprueft, nicht ueber die Anzahl vorhandener
  Inventarnummern.
