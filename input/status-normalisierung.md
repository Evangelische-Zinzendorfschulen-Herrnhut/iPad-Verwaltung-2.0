# Feature-Spec: Status-Normalisierung

## Ziel

Die Statuswerte in `Device.Status`, `Sets.SetStatus` und `SetUserZuordnung.Status` sollen fachlich vereinheitlicht werden, ohne historische Informationen zu verlieren. Vor einer Datenbankänderung wird zuerst eine Ziel-Normalform definiert.

## Ausgangslage

Die bestehende Datenbank nutzt Statuswerte uneinheitlich:

- unterschiedliche Schreibweisen wie `ok` und `OK`
- leere Werte
- technische Zustände wie `defekt`, `Displayschaden`, `Batterie leer`
- Verwaltungszustände wie `Ausgabe`, `nicht zugeordnet`, `Zurücksetzen`
- Prozesshinweise wie `Gerätetausch neu`, `Gerätetausch alt`, `in Bearbeitung`

Diese Bedeutungen sollten nicht in einem einzigen undifferenzierten Statusfeld vermischt werden.

## Grundsatz

Die App soll kuenftig zwischen diesen drei Statusarten unterscheiden:

- Geraetezustand
- Set-Zustand
- Ausgabe-/Rueckgabe-Status

Historische Originalwerte sollen mindestens in der ersten Migrationsphase erhalten bleiben oder nachvollziehbar protokolliert werden.

## Vorgeschlagene Zielwerte fuer Device.Status

Empfohlene Normalform:

- `ok`
- `defekt`
- `unklar`
- `gesperrt kein MDM`

Der Status `gesperrt kein MDM` ist nur fuer Geraete der Kategorie `iPad` gueltig. Wenn dieser Status bei anderen Kategorien vorkommt, soll die App dies als Datenkonflikt markieren und den normalisierten Status fuer die fachliche Bewertung als `unklar` behandeln.

### Vorgeschlagenes Mapping fuer Device.Status

| Aktueller Wert | Neuer Wert | Hinweis |
| --- | --- | --- |
| `ok` | `ok` | bleibt |
| leer | `ok` | nach fachlicher Vorgabe |
| `defekt` | `defekt` | bleibt |
| `ausgemustert` | `defekt` | wird nicht separat gefuehrt |
| `funktionslos` | `defekt` | technischer Defekt |
| `gesperrt, kein MDM` bei Kategorie `iPad` | `gesperrt kein MDM` | Schreibweise vereinheitlichen |
| `gesperrt, kein MDM` bei anderer Kategorie | `unklar` | Datenkonflikt markieren |
| `unklar` | `unklar` | bleibt |
| `Reparatur` | `defekt` | wird nicht separat gefuehrt |
| `Reparatur?` | `defekt` | wird nicht separat gefuehrt |
| `Totalschaden` | `defekt` | wird nicht separat gefuehrt |
| `Displayschaden` | `defekt` | Detail gehoert in Anmerkung oder Schadensfeld |
| `Batterie leer` | `defekt` | ggf. Detail in Anmerkung |
| `beschädigt aber noch funktionsfähig` | `defekt` | fachlich pruefen |
| `Umtausch` | `defekt` | Prozesshinweis, Status wird auf defekt reduziert |
| `umtausch auf Garantie` | `defekt` | Prozesshinweis, Status wird auf defekt reduziert |
| `getauscht` | `defekt` | Prozesshinweis, Status wird auf defekt reduziert |
| `verloren` | `unklar` | nicht in Zielwerten enthalten |
| `fehlt` | `unklar` | nach fachlicher Vorgabe |
| `frei` | `ok` | nach fachlicher Vorgabe |
| `unvollständig` | `unklar` | bei Einzelgeraet fachlich unscharf |

## Vorgeschlagene Zielwerte fuer Sets.SetStatus

Empfohlene Normalform:

- `ok`
- `unvollständig`
- `defekt`
- `unklar`

### Ableitungsregel fuer Sets.SetStatus

`Sets.SetStatus` soll im Zielsystem aus den drei Komponenten eines Sets abgeleitet werden:

- `iPad`
- `Pencil`
- `Tastatur`

Die zugehoerigen Geraete werden ueber `Device.InvNr` ermittelt. Deren `Device.Status` wird zuvor nach der Device-Status-Normalisierung bewertet.

| Bedingung | Neuer SetStatus | Hinweis |
| --- | --- | --- |
| eine der drei Komponenten fehlt | `unvollständig` | Vollständigkeit hat Vorrang |
| eine zugeordnete Komponente hat normalisierten `Device.Status = defekt` | `defekt` | technischer Defekt im Set |
| eine zugeordnete Komponente hat normalisierten `Device.Status = unklar` | `unklar` | Klaerungsbedarf im Set |
| alle drei Komponenten vorhanden und alle relevanten Geraete `ok` | `ok` | vollstaendig und nutzbar |

Wenn mehrere Bedingungen zutreffen, gilt diese Prioritaet:

1. `unvollständig`
2. `defekt`
3. `unklar`
4. `ok`

Der bestehende Wert in `Sets.SetStatus` wird in der ersten App-Version als Legacy-Status angezeigt, aber nicht als fuehrende Quelle verwendet.

## Vorgeschlagene Zielwerte fuer SetUserZuordnung.Status

Empfohlene Normalform:

- `ausgegeben`
- `frei`
- `blockiert`

### Ableitungsregel fuer SetUserZuordnung.Status

`SetUserZuordnung.Status` soll im Zielsystem aus der aktuellen Zuordnungslage und dem abgeleiteten Set-Status entstehen.

| Bedingung | Neuer Status | Hinweis |
| --- | --- | --- |
| Set hat aktuelle Zuordnung und Set-Status ist `ok` | `ausgegeben` | aktuell einem Nutzer zugeordnet |
| Set hat keine aktuelle Zuordnung und Set-Status ist `ok` | `frei` | ausgabefaehig |
| Set-Status ist `defekt` | `blockiert` | nicht ausgabefaehig |
| Set-Status ist `unvollständig` | `blockiert` | nicht ausgabefaehig |
| Set-Status ist `unklar` | `blockiert` | nicht ausgabefaehig |

Eine aktuelle Zuordnung ist ein Eintrag in `SetUserZuordnung` ohne `RueckgabeDatum`. Historische Eintraege mit `RueckgabeDatum` bleiben fuer die Historie erhalten, bestimmen aber nicht den aktuellen Status eines Sets.

Wenn mehrere Bedingungen zutreffen, gilt diese Prioritaet:

1. `blockiert`
2. `ausgegeben`
3. `frei`

Der bestehende Wert in `SetUserZuordnung.Status` wird in der ersten App-Version als Legacy-Status angezeigt, aber nicht als fuehrende Quelle verwendet.

## Migrationsstrategie

Empfohlen wird eine vorsichtige Zwei-Phasen-Migration.

### Phase 1: App-seitige Normalisierung

Die App liest Originalwerte und berechnet zusaetzlich normalisierte Statuswerte.

Vorteile:

- keine direkte Datenbankveraenderung
- Originalwerte bleiben erhalten
- Mapping kann fachlich getestet werden
- Listen und Filter koennen trotzdem schon vereinheitlicht arbeiten

### Phase 2: Datenbank-Migration

Erst nach fachlicher Freigabe:

- Backup erstellen
- neue normalisierte Felder oder Referenztabellen anlegen
- Originalwerte erhalten
- Mapping per SQL-Migration anwenden
- App auf normalisierte Felder umstellen

## Empfehlung

Fuer die erste Web-App-Version sollte keine direkte Vereinheitlichung in der Datenbank erfolgen. Stattdessen sollte die App normalisierte Statuswerte berechnen und anzeigen, waehrend die Originalwerte weiterhin sichtbar bleiben.

## Offene Fragen

- Soll `OK` bei Sets wirklich `vollstaendig` bedeuten?
- Soll `Totalschaden` ein eigener Status bleiben oder unter `defekt` laufen?
- Soll `frei` bei Geraeten wirklich ein Geraetezustand oder eher ein Zuordnungsstatus sein?
- Sollen Prozesswerte wie `Zurücksetzen` eigene Status bleiben oder in ein separates Workflow-Feld wandern?
- Wie wichtig ist die Unterscheidung zwischen `Gerätetausch neu` und `Gerätetausch alt`?
- Sollen Prozesswerte aus `Sets.SetStatus` in ein eigenes Feld oder eine separate Historie uebernommen werden?
- Sollen Prozesswerte aus `SetUserZuordnung.Status` in ein eigenes Bemerkungs- oder Workflow-Feld uebernommen werden?
