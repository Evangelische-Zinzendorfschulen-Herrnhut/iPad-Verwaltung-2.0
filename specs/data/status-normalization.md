# Status-Normalisierung

## Ziel

Statuswerte aus der Legacy-Datenbank werden fachlich normalisiert, ohne Originalinformationen zu verlieren.

Quelle:

- `input/status-normalisierung.md`
- `db/iPad-Verwaltung.db`

## Grundsatz

Die neue App unterscheidet mehrere Statusdimensionen:

- Komponenten-Zustand: technischer oder physischer Zustand einer Komponente
- Komponenten-Verfügbarkeit: ob eine Komponente aktuell ausgegeben, verfügbar oder blockiert ist
- Set-Zustand: aus den drei Hauptkomponenten abgeleiteter Zustand
- Set-Verfügbarkeit: ob ein Set ausgegeben, verfügbar oder blockiert ist
- Ausleihstatus: Status eines konkreten Ausleihvorgangs

Legacy-Originalwerte werden gespeichert, angezeigt und im Importbericht verwendet.

## Komponenten-Zustand

Zielwerte:

| Wert | UI-Label | Bedeutung |
| --- | --- | --- |
| `ok` | OK | keine relevante Einschraenkung bekannt |
| `beschaedigt` | Beschädigt, nutzbar | sichtbarer oder dokumentierter Schaden, aber noch verwendbar |
| `defekt` | Defekt | nicht mehr zuverlaessig nutzbar, Reparatur oder Ersatz noetig |
| `unklar` | Unklar | fachlich noch zu pruefen |

Beispiele fuer Mapping:

| Legacy `Device.Status` | Komponenten-Zustand | Hinweis |
| --- | --- | --- |
| `ok` | `ok` | direkt |
| leer | `ok` oder `unklar` | fachlich pruefen; nicht still annehmen |
| `frei` | `ok` | Verfuegbarkeit separat bewerten |
| `defekt` | `defekt` | direkt |
| `funktionslos` | `defekt` | direkt |
| `Displayschaden` | `beschaedigt` oder `defekt` | je nach Nutzbarkeit |
| `Batterie leer` | `unklar` | kann Defekt oder Rueckgabehinweis sein |
| `Reparatur` | `defekt` | Verfuegbarkeit wird `in_reparatur` |
| `Reparatur?` | `unklar` | Klaerungsbedarf |
| `unvollständig` | `unklar` | bei Einzelkomponente unscharf |
| `verloren` | `unklar` | Zustand unbekannt, Verfuegbarkeit `verloren` |
| `ausgemustert` | `unklar` | Lebenszyklus/Verfuegbarkeit separat |
| `gesperrt, kein MDM` | `ok` oder `unklar` | Sperrgrund separat, nur iPad gueltig |

## Komponenten-Verfügbarkeit

Zielwerte:

- `verfuegbar`
- `ausgegeben`
- `reserviert`
- `in_reparatur`
- `gesperrt`
- `verloren`
- `ausgemustert`
- `unklar`

Ableitung:

- Aktive Ausleihe mit Set enthält Komponente: `ausgegeben`
- Legacy `Device.Status = Reparatur`: `in_reparatur`
- Legacy `Device.Status = verloren` oder `fehlt`: `verloren`
- Legacy `Device.Status = ausgemustert`: `ausgemustert`
- Legacy `Device.Status = gesperrt, kein MDM`: `gesperrt`
- Sonst, wenn keine aktive Ausleihe und Zustand nutzbar: `verfuegbar`

Regel:

- `gesperrt, kein MDM` ist nur fuer iPads gueltig.
- Ist ein iPad wegen `gesperrt, kein MDM` gesperrt, erzeugt das fuer das betroffene Set die Set-Verfügbarkeit `blockiert`.

## Set-Zustand

Zielwerte:

- `ok`
- `unvollstaendig`
- `defekt`
- `unklar`

Ableitung aus aktueller Set-Zuordnung:

| Bedingung | Set-Zustand |
| --- | --- |
| iPad, Pencil oder Tastatur fehlt | `unvollstaendig` |
| eine Hauptkomponente hat Zustand `defekt` | `defekt` |
| eine Hauptkomponente hat Zustand `unklar` | `unklar` |
| alle drei Hauptkomponenten vorhanden und Zustand `ok` oder `beschaedigt` | `ok` |

Priorität:

1. `unvollstaendig`
2. `defekt`
3. `unklar`
4. `ok`

Der Legacy-Wert `Sets.SetStatus` bleibt als Legacy-Status erhalten, ist aber nicht die führende Quelle.

## Set-Verfügbarkeit

Zielwerte:

- `verfuegbar`
- `ausgegeben`
- `blockiert`
- `in_pruefung`
- `unklar`

Ableitung:

| Bedingung | Set-Verfügbarkeit |
| --- | --- |
| aktive Ausleihe ohne RueckgabeDatum | `ausgegeben` |
| Set-Zustand `defekt` oder `unvollstaendig` | `blockiert` |
| Set-Zustand `unklar` | `in_pruefung` |
| mindestens eine Hauptkomponente ist gesperrt | `blockiert` |
| keine aktive Ausleihe und Set-Zustand `ok` | `verfuegbar` |

Priorität:

1. `ausgegeben`
2. `blockiert`
3. `in_pruefung`
4. `verfuegbar`

## Set auftrennen und Komponenten umbauen

Freie und blockierte Sets duerfen aufgetrennt werden, um Komponenten anderen Sets zuzuordnen und diese zu vervollstaendigen.

Regeln:

- Ausgegebene Sets duerfen nicht ohne Ruecknahme aufgetrennt werden.
- Freie Sets duerfen aufgetrennt werden.
- Blockierte Sets duerfen aufgetrennt werden, wenn sie nicht aktiv ausgegeben sind.
- Jede Entnahme oder Neuzuordnung einer Komponente erzeugt Audit-Logs.
- Die Historie der bisherigen Set-Zuordnung bleibt nachvollziehbar.
- Eine Komponente darf zu einem Zeitpunkt nur einem aktiven Set zugeordnet sein.

## Ausleihstatus

Zielwerte:

- `geplant`
- `aktiv`
- `abgeschlossen`
- `storniert`
- `unklar`

Ableitung fuer Legacy `SetUserZuordnung`:

- `RueckgabeDatum` leer und `AusgabeDatum` gesetzt: `aktiv`
- `RueckgabeDatum` gesetzt: `abgeschlossen`
- Legacy-Status mit eindeutiger Rueckgabe-Bedeutung, z. B. `zurückgegeben` oder `zurueckgegeben`: `abgeschlossen`
- Legacy-Status mit Ausgabe-Bedeutung, z. B. `ausgegeben`, `Ausgabe`, `Aktiv`: `aktiv`, wenn kein RueckgabeDatum gesetzt ist
- Unklare Prozesswerte bleiben `unklar` mit Importhinweis

Wichtig:

`SetUserZuordnung.Status` wird nicht zu `frei` oder `blockiert` normalisiert. Diese Werte gehören zur Set-Verfügbarkeit, nicht zum historischen Ausleihvorgang.

## Prozess- und Importhinweise

Diese Legacy-Werte sollen nicht als alleinige Zielstatus verwendet werden:

- `Zurücksetzen`
- `Gerätetausch neu`
- `Gerätetausch alt`
- `Prüfung Rückgabe`
- `in Bearbeitung`
- `nicht zugeordnet`

Sie werden als Importhinweis, Workflow-Hinweis oder Prüfmarkierung übernommen.

## Einordnung bekannter Prozesswerte

### Zurücksetzen

`Zurücksetzen` beschreibt den Übergang nach Rückgabe, bevor ein Set wieder frei für eine neue Ausgabe ist.

Zielmodell:

- Set-Verfügbarkeit: `in_pruefung` oder `blockiert`, bis Rückgabeprüfung und technische Vorbereitung abgeschlossen sind.
- Danach Set-Verfügbarkeit: `verfuegbar`.
- Als Workflow-Hinweis erhalten, nicht als dauerhafter Status.

### Gerätetausch neu und Gerätetausch alt

`Gerätetausch neu` und `Gerätetausch alt` markieren den Zeitraum, in dem ein Benutzer wegen technischer Probleme oder Schaden zwei Geräte beziehungsweise Sets zugeordnet hat, um Daten zu übertragen.

Zielmodell:

- eigener Zukunftsworkflow `Gerätetausch`
- alte und neue Komponente/Set explizit verknüpfen
- Grund des Tauschs dokumentieren
- Startdatum und erwartetes Rückgabedatum speichern
- Standardfrist für Rückgabe des alten Geräts/Sets: 14 Tage
- Erinnerung oder Mahnung nach Ablauf der Frist

### Prüfung Rückgabe

`Prüfung Rückgabe` ist fachlich noch nicht eindeutig. In der Legacy-Datenbank tritt der Wert u. a. bei unklarer Rückgabe beziehungsweise Bestandsprüfung auf, z. B. bei einem verstorbenen Lehrer.

Zielmodell:

- als Prüfmarkierung und Importhinweis übernehmen
- vorläufig Set-Verfügbarkeit `in_pruefung`
- nicht automatisch als abgeschlossene Rückgabe interpretieren

### nicht zugeordnet

`nicht zugeordnet` scheint kein Workflow zu sein, sondern ein Hinweis auf ungeklärte Zuordnung, Importzustand oder Bestandsklärungsbedarf.

Zielmodell:

- als Importhinweis übernehmen
- Set-Verfügbarkeit abhängig von Set-Zustand und aktiver Ausleihe berechnen
- nicht als eigener Workflow modellieren

### in Bearbeitung

`in Bearbeitung` gehört fachlich eher zum Schadens-/Problemmeldungsprozess. Daraus entsteht nach vollständiger Eingabe der nötigen Werte ein Schadensbericht.

Zielmodell:

- eigener Zukunftsworkflow `Schadens- oder Problemmeldung`
- nach vollständiger Eingabe PDF-Schadensbericht erzeugen
- PDF wird den Eltern zur Kenntnisnahme/Unterschrift gegeben
- unterschriebener Schadensbericht wird als PDF digital abgelegt

## Migrationsstrategie

Phase 1:

- Originalwerte aus Legacy-Datenbank nur lesen.
- Normalisierte Statuswerte app-seitig oder in Import-Views berechnen.
- Importbericht mit Konflikten und unklaren Zuordnungen erzeugen.

Phase 2:

- Nach fachlicher Freigabe normalisierte Felder oder Tabellen anlegen.
- Originalwerte weiterhin speichern.
- UI und Filter auf normalisierte Felder umstellen.

## Offene Fragen

- Welche Detailfelder braucht der Zukunftsworkflow `Gerätetausch`?
- Welche Detailfelder braucht der Zukunftsworkflow `Schadens- oder Problemmeldung`?
