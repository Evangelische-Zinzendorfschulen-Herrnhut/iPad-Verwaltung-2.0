# ADR 0008: Statuswerte nach fachlichen Dimensionen trennen

## Status

accepted

## Kontext

Die Legacy-Datenbank nutzt Statusfelder uneinheitlich:

- `Device.Status`
- `Sets.SetStatus`
- `SetUserZuordnung.Status`

Diese Felder vermischen technische Zustände, Verfügbarkeit, Lebenszyklus, Prozesshinweise und historische Ausleihinformationen.

## Entscheidung

Das Zielmodell trennt Statuswerte in mehrere fachliche Dimensionen:

- Komponenten-Zustand
- Komponenten-Verfügbarkeit
- Set-Zustand
- Set-Verfügbarkeit
- Ausleihstatus
- Zahlungsstatus
- Schadensfallstatus

Legacy-Originalwerte bleiben erhalten und werden beim Import zusätzlich normalisiert. In der ersten Phase werden keine Legacy-Werte überschrieben.

## Konsequenzen

- Filter und UI können mit klaren Zielwerten arbeiten.
- Historische Originalwerte bleiben sichtbar und nachvollziehbar.
- `SetUserZuordnung.Status` wird nicht als Set-Verfügbarkeit verwendet.
- Set-Zustand wird aus iPad, Pencil und Tastatur abgeleitet.
- Set-Verfügbarkeit wird aus aktiver Ausleihe, Set-Zustand und Blockierungsgründen abgeleitet.
- Prozesswerte wie `Zurücksetzen`, `Gerätetausch neu` oder `Prüfung Rückgabe` werden als Workflow-/Importhinweise behandelt, nicht als alleiniger Status.
