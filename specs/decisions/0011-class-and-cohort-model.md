# ADR 0011: Jahrgang und konkrete Klasse getrennt modellieren

## Status

accepted

## Kontext

Bei Schuelern beschreibt der Jahrgang den Schuleintritt in Klasse 5 und bleibt ueber die Schulzeit konstant. Die konkrete Klasse kann sich dagegen jaehrlich aendern. Zudem koennen Schueler eine Klasse wiederholen oder innerhalb der Schule die Klasse wechseln.

Die Schule ist in den Stufen 5 bis 9 normalerweise dreizuegig. In Stufe 10 kann es vier Klassen geben. In der Oberstufe gibt es keine Klassen mehr, sondern Jahrgangsgruppen.

## Entscheidung

Jahrgang und konkrete Klasse werden getrennt modelliert.

- `Person.jahrgang` speichert die stabile Kohorte.
- `Klasse` beschreibt die konkrete Klasse oder Jahrgangsgruppe in einem Schuljahr.
- `PersonKlassenZuordnung` verknuepft Schueler historisiert mit Klasse/Jahrgangsgruppe.

## Regeln

- Stufen 5 bis 9: normalerweise `05-1` bis `09-3`.
- Stufe 10: `10-1` bis `10-4` moeglich.
- Stufen 11 und 12: Jahrgangsgruppen, z. B. `11JG2019`, `12JG2018`.
- Die erwartete Stufe kann aus Jahrgang und Schuljahr berechnet werden.
- Die konkrete Klasse wird separat gespeichert und kann von der erwarteten Stufe abweichen.
- Schueler, die nicht in Klasse 5 an die Schule kommen, erhalten den Jahrgang, der ihrer Eintrittsklasse entspricht.

## Konsequenzen

- Wiederholungen und Klassenwechsel sind abbildbar.
- Import kann Abweichungen zwischen Jahrgang und Klasse markieren.
- Ausgabelogik fuer Klasse 5/6 versus ab Klasse 7 kann die konkrete aktuelle Stufe nutzen.
- Zum Schuljahreswechsel sollen neue Klassen-/Jahrgangsgruppenzuordnungen vorgeschlagen und gesammelt uebernommen werden koennen.
- Einzelne Wiederholer oder Klassenwechsler werden manuell angepasst.
