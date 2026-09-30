---
name: ipad-etikettendruck
description: Erstelle Komponentenetiketten mit Inventarnummer und QR-Code zur aktuellen Set-Zuordnung in einer geöffneten Word-Etikettenvorlage der iPad-Verwaltung.
---

# Etikettendruck in Word

Nutze die vorhandene, geöffnete Word-Etikettenvorlage und ihre nächste tatsächlich verfügbare Position. Die Festlegungen stammen aus dem Chat „Probe Etikett in Word erstellen“ vom 30.09.2026; maßgeblich ist dessen bestätigte Endfassung.

## Daten und Ziel

- Ermittle die vollständige Inventarnummer der gewünschten Komponente und ihre aktuelle aktive Set-Zuordnung aus Supabase oder bereits aktuell verifizierter Evidenz. Eine Nummer wie `E001082 / 0232` enthält keine verlässliche aktuelle Setkennung. Bei keiner/einer mehrdeutigen Zuordnung erst klären.
- Sichtbarer Text ist die vollständige Komponenten-Inventarnummer einschließlich Leerzeichen und Schrägstrich, nicht nur die Setnummer.
- Der QR-Code öffnet die produktive Set-Liste mit Filter: `https://i-pad-verwaltung-2-0.vercel.app/sets?setId=<aktuelle Setkennung>`. Setkennung URL-kodieren. Keine Komponentenliste, kein localhost und kein alter Testpfad.
- Beispiel der bestätigten Endfassung: Tastatur `E001082 / 0232` gehörte zum Zeitpunkt der Prüfung zu Set `565`. Dieses Beispiel nicht als dauerhafte Zuordnung verwenden.

## Gestaltung

Erstelle eine einzige horizontale Gesamtgrafik auf weißem Hintergrund: schwarzer QR links, rechts die Inventarnummer fett und darunter exakt `Schulstiftung d. ev. Brüder-Unität` vollständig in einer Zeile. Keine Lokal/Test-Zeile. Eine Gesamtgrafik verhindert die in Word beobachteten verschachtelten Tabellen, Textreste und abgeschnittenen Beschriftungen.

Bewährte Referenzgeometrie: PNG 600 × 190 Pixel; QR in einem Bereich von maximal 154 × 154 bei (14,18); Textbeginn x=182; Inventarnummer Arial Bold 36 Pixel bei y=40; Stiftungsname Arial 27 Pixel bei y=111. PNG mit 300-dpi-Metadaten. Schriftgrößen bei längeren Nummern so anpassen, dass beide Zeilen mit Innenabstand vollständig passen. Diese Pixelgrößen sind Grafikwerte, keine Word-Punktgrößen.

Die Referenzgrafik wurde in Word mit etwa 1,65 Zoll / 41,9 mm Breite und proportionaler Höhe verwendet. Vorhandene Zellgeometrie und ein passendes Nachbaretikett haben Vorrang; nicht Tabellenbreiten oder Seitenränder ändern. QR scharf und ohne Verzerrung erzeugen, mit weißem Rand und Fehlerkorrektur M. Bei Skalierung möglichst ganzzahlige QR-Modulgrößen erhalten. Qrcode und Pillow eignen sich für die deterministische Grafik; Abhängigkeiten außerhalb des Repositories halten.

## Word-Ablauf

1. Aktuelles Word-Fenster, Tabellenraster, belegte Positionen und Nutzerangaben prüfen. Eine leere Zelle kann auf einem teilweise verbrauchten Bogen bereits benutzt worden sein. Die nächste Position aus dem bestätigten Verlauf oder sichtbarer Belegung bestimmen; bei echtem Zweifel nur die Zielposition erfragen.
2. Nur die beauftragte Zelle bearbeiten. Bereits gedruckte oder bewusst entfernte Etiketten nicht wiederherstellen. Die damalige Löschung des M40-Etiketts war beabsichtigt.
3. Gesamtgrafik bevorzugt über Word „Einfügen > Bilder > Bild aus Datei“ in der Zielzelle einsetzen. Im Dateidialog den exakten Grafikpfad wählen; nicht versehentlich eine alte Grafik. Keine fest gespeicherten Accessibility-Indizes wiederverwenden: vor jedem neuen Bedienabschnitt aktuelle UI erfassen.
4. Grafik proportional an die Vorlage anpassen. Bei Ersatz nur das betreffende Bildobjekt tauschen; keine zusätzliche Textzeile zurücklassen.
5. Aus der Bildauswahl herausklicken und das tatsächliche Drucklayout prüfen: Nummer vollständig, Schulzeile einzeilig, QR frei, kein Abschneiden/Überlagern, Nachbarzellen unverändert. Die reine Accessibility-Textansicht reicht hierfür nicht.
6. QR nach Möglichkeit dekodieren und mit der erwarteten produktiven Set-URL vergleichen. Eine nur erzeugte URL ist kein Nachweis eines erfolgreichen Scans. Nicht behaupten, gedruckt oder gespeichert zu haben, ohne dies zu verifizieren.

## Speichern und Drucken

Die früher vereinbarte Bearbeitung erfolgte im geöffneten Dokument ohne neue Word-Datei und ohne „Speichern unter“. Dies als Standard für die Fortsetzung verwenden, solange der Nutzer nichts anderes anfordert. Einen unerwarteten Speichern-unter-Dialog abbrechen. Temporäre PNG-Dateien sind Hilfsdateien, keine neue Word-Vorlage.

Etikettenerstellung allein beauftragt keinen physischen Druck. Bei beauftragtem Druck vorhandenes Bogenformat und tatsächlichen Drucker verwenden, Originalgröße / 100 Prozent prüfen und automatische Seitenanpassung vermeiden. Keine spekulativen Druckereinstellungen festlegen. Ergebnis mit Zielposition und Speicher-/Druckstatus berichten.
