---
name: ipad-ui-icons
description: Verwende konsistente Icons bei UI-Änderungen an der WebApp iPad-Verwaltung 2.0, insbesondere für Navigation, Buttons und Objekt-Links. Gilt nicht für Icons in Chat-Berichten oder anderen Schulprojekten.
---

# Icons der iPad-Verwaltung

Die Bedeutung eines Icons bleibt über Startseite, Listen und Detailseiten hinweg gleich. Bestehende Zuordnungen haben Vorrang vor einer neuen optischen Auswahl.

## Verbindliche Zuordnung

| Bedeutung | Font-Awesome-Icon | Zentraler Schlüssel |
| --- | --- | --- |
| Set / Set-Zuordnung | `faList` | `set` |
| Geräte / Geräteliste | `faLayerGroup` | `devices` |
| Person / Personen und Klassen | `faUser` | `person` |
| Schadensfall / Schadensfälle | `faClipboard` | `damage` |
| MDM-Link | `faTabletScreenButton` | `mdm` |
| Aus- und Rückgabeliste | `faArrowRightArrowLeft` | `assignments` |
| Aufgaben | `faListCheck` | `tasks` |
| Lagerliste | `faWarehouse` | `storage` |

## Umsetzung

- Lies vor einer Änderung `src/app/object-link-icon.tsx` relativ zum Projektroot. Nutze dessen `objectIconByKind` für die zentral definierten Bedeutungen, statt diese lokal erneut zuzuordnen.
- Nutze für kompakte Objekt-Links `ObjectLinkIcon` und `objectLinkIconClassName`, damit Größe und bestehende semantische Farben erhalten bleiben. Auf der Startseite werden dieselben Icon-Definitionen mit einheitlich 20 × 20 Pixeln und neutraler Farbe verwendet.
- Verwende `faLayerGroup` nicht für Sets und `faTabletScreenButton` nicht für die allgemeine Geräteliste; beide haben bereits eine andere Bedeutung.
- Nutze die vorhandenen Font-Awesome-Abhängigkeiten. Neue Bedeutungen erhalten ein passendes, noch nicht anders belegtes Icon; bei mehrfacher Verwendung die Zuordnung zentral ergänzen.
- Icons neben sichtbarer Beschriftung sind dekorativ (`aria-hidden="true"`). Reine Icon-Links brauchen einen verständlichen zugänglichen Namen am Link, der das Ziel benennt.
- Prüfe bei Änderungen, dass Beschriftung, Linkziel und Icon-Bedeutung zusammenpassen. Halte diese Tabelle bei einer ausdrücklich gewünschten Änderung der Bedeutung aktuell.

- Für Startseite und Bereichsmenü `navigationIconByKind` aus derselben Datei nutzen; diese Zuordnung erweitert `objectIconByKind` um Aus-/Rückgaben, Aufgaben und Lagerliste. Menü-Icons sind 16 × 16 Pixel groß und übernehmen die Textfarbe des aktiven beziehungsweise inaktiven Links.
