# Datenschutz und Audit

## Datenschutzprinzipien

- Datenminimierung: Nur speichern, was fuer Verwaltung, Nachweis oder Buchhaltung erforderlich ist.
- Zweckbindung: Personen-, Zahlungs- und Schadensdaten duerfen nicht zweckfremd ausgewertet werden.
- Rollenbasierter Zugriff: Finanz-, Kontakt- und technische Daten nur nach Bedarf anzeigen.
- Aufbewahrung: Fristen pro Dokument- und Vorgangstyp definieren.
- Export/Loeschung: Verfahren fuer Auskunft, Korrektur und Loeschung klaeren.

## Besonders schuetzenswerte Bereiche

- Kontaktdaten von Schuelern und Sorgeberechtigten
- Zahlungsstatus und Mahnungen
- Schadensbeschreibungen mit moeglicher Verantwortlichkeitszuordnung
- Unterschriften und Einverstaendniserklaerungen
- Seriennummern und MDM-Informationen

## Audit-pflichtige Aktionen

- iPad-Set an Person ausgeben
- iPad-Set zuruecknehmen
- Zahlungsstatus aendern
- Schadensfall anlegen oder abschliessen
- Reparaturstatus aendern
- Komponente oder Set sperren, als verloren markieren oder ausmustern
- Rollen oder Rechte aendern
- Benutzer anlegen, deaktivieren oder reaktivieren
- Dokumente hochladen oder loeschen

## Offene Datenschutzfragen

- Welche Schulsysteme sind fuehrend fuer Personen- und Klassendaten?
- Gibt es bereits eine Datenschutzfolgeabschaetzung oder Vorlage des Schultraegers?
- Welche Aufbewahrungsfristen gelten fuer Ausleihvertraege, Kautionen und Schadensfaelle?
- Duerfen Dokumente in einem Cloud-Speicher liegen, und wenn ja, bei welchem Anbieter?

## Audit der iPad-Einfuehrung

`set_introduction_audit` dokumentiert Einfuehrungs-/Ausgabe-/Ruecknahmewechsel
mit App-Nutzer, Zeitpunkt, Objekt-ID und relevanten alten/neuen Zuordnungs-,
Status-, Lagerort- und Datumsfeldern. Kontakte und Freitexte werden nicht dupliziert.
Normale App-Rollen duerfen Audit nicht bearbeiten oder loeschen; Lesen bleibt
Admin/iPad-Verwaltung vorbehalten. Direkte Audit-Inserts sind unzulaessig.
Komponententausch nutzt das bestehende geschuetzte Austauschprotokoll; Kompletttausch
verknuepft beide Sets/Zuordnungen, Schadensfall und Austauschdatum. Bestehende
Aufbewahrungsfragen gelten weiterhin; keine neue personenbezogene Datenerhebung.
