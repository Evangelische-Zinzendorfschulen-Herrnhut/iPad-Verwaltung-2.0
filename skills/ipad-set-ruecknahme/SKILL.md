---
name: ipad-set-ruecknahme
description: Begleite die Rücknahme eines iPad-Sets in der schulischen iPad-Verwaltung und die Nachbereitung in Relution/MDM einschließlich Inventarnummer, Benutzerzuordnung und Auto-Einschreibung. Nutze dies bei angeforderten Set-Rücknahmen oder deren Fortsetzung.
---

# iPad-Set zurücknehmen und im MDM nachbereiten

## Grundlage und Grenzen

- Projekt: `/Users/markus/Documents/iPad-Verwaltung 2.0`. Vor Beginn `AGENTS.md`, `specs/features/002-set-issue-return-workflow.md` und bei Schäden `specs/features/007-damage-report-workflow.md` lesen.
- Supabase ist die führende Datenquelle. SQLite ausschließlich lesend; kein Schreibersatz. Vor jeder fachlichen Änderung aktuelle Daten prüfen und nachher nachlesen.
- Den vom Nutzer autorisierten Umfang beachten. Eine Prüfung oder das Öffnen einer Seite erlaubt keine Rücknahme, Schadensänderung, Freigabe oder MDM-Mutation. Bestätigte Einzelaktionen durchführen, ohne sie erneut bestätigen zu lassen. Dieser Skill erteilt selbst keine Schreibberechtigung.
- Keine feste Setnummer, Person, Inventarnummer oder Seriennummer aus früheren Durchläufen übernehmen. Inventarnummern-Suffixe bestimmen keine aktuelle Set-Zuordnung.

## Rücknahme prüfen

1. Setnummer aus dem Auftrag bestimmen. Supabase lesen: Set, aktive/historische Personenzuordnungen, aktuelle Komponenten (`valid_until is null`), Zusatzartikel und Schadensfälle zu Set und Komponenten. Reihenfolge: iPad, Pencil, Tastatur, Zubehör.
2. Produktive **Set-Liste** öffnen: `https://i-pad-verwaltung-2-0.vercel.app/sets?setId=<Setnummer>`. Filter und genau passenden Treffer prüfen. Nicht die Geräteliste als Ersatz öffnen.
3. Tatsächliche Vollständigkeit mit dem Nutzer klären und mit dem Protokoll abgleichen: Hauptkomponenten, Netzteil, iPad-Kabel, modellabhängiges Pencil-Zubehör und ausgegebene Zusatzartikel. Ein gespeichertes Häkchen ist kein Beleg einer neuen Sichtprüfung. Tucano 1. Gen. benötigt USB-C-Ladekabel; ein Kappen-Häkchen allein bestätigt es nicht.
4. Rückgabedatum, beendete Personenzuordnung und Lagerort prüfen. Zurückgegebene Sets bleiben zunächst blockiert. Bereits erfolgte Rücknahme nicht nochmals anlegen.
5. Offene Schäden und dokumentierte Tausche prüfen. Abgeschlossener Schadensfall, Komponenten-Zustand und aktive Zuordnung sind getrennte Tatsachen. Bei Inkonsistenzen konkrete Korrektur vorschlagen; nur nach Autorisierung ausführen, historisieren und auditieren.
6. Vor Freigabe technische Rücksetzung und Sichtprüfung tatsächlich bestätigen lassen. Keine Freigabe bei defekten/blockierenden Hauptkomponenten, fehlender Vollständigkeit oder aktiver Personenzuordnung, selbst wenn der gespeicherte Set-Zustand OK lautet. Vorgesehene serverseitige Prüfungen und Auditspur beachten.

## MDM-Nachbereitung

Für diesen Arbeitsablauf **Chrome** verwenden; der interne Browser erwies sich für die Nutzeranmeldung als ungeeignet. Falls eine Anmeldung nötig ist, den Tab für den Nutzer offen halten.

1. Aktuelle iPad-Inventarnummer und Seriennummer aus Supabase oder der verifizierten Set-Zeile übernehmen. Den MDM-Link der iPad-Spalte öffnen und den sichtbaren Seriennummernabgleich durchführen. Bei Abweichung stoppen.
2. In Relution `Informationen` die **Gerätebeschreibung** prüfen. Fehlt die aktuelle Inventarnummer, auf die Zeile klicken, den erscheinenden `Bearbeiten`-Knopf öffnen und die Nummer exakt mit Leerzeichen um `/` eintragen. Andere vorhandene Beschreibung nur im autorisierten Umfang ersetzen; bei Zusatztext die Nummer ergänzen. Speichern und sichtbaren Wert nachlesen.
3. Wenn angefordert, die bisherige **Benutzerzuordnung des Gerätes** entfernen. Der kleine Entfernen-Knopf am Benutzer-Chip entfernt die Zuordnung. Danach muss das Benutzerfeld leer sein. Nicht das Benutzerkonto oder lokale Benutzerdaten löschen.
4. Wenn angefordert, **Gerätename** auf dieselbe aktuelle iPad-Inventarnummer setzen: Zeile anklicken, `Bearbeiten`, im Dialog `Gerätename ändern` den ganzen Wert ersetzen, speichern und sichtbaren Namen prüfen. Beschreibung und Gerätename sind separate Felder.
5. **Auto-Einschreibung** dieses Gerätes öffnen. Den direkten Link `Zum DEP Gerät` bevorzugen; alternativ `Geräte > Auto-Einschreibungen` öffnen und nach exakter Seriennummer suchen. Suchchips können veraltet sein: nur einen Treffer mit exakt passender Seriennummer öffnen, gegebenenfalls Suchchip bereinigen und `Aktualisieren` verwenden.
6. Seriennummer im Auto-Einschreibungsformular erneut abgleichen. Wenn angefordert, dort ausschließlich **Gerätename** auf die Inventarnummer setzen. Speichern und durch erneutes Öffnen des Datensatzes den persistierten Namen prüfen.
7. Benutzer der Auto-Einschreibung ist eine **separate Zuordnung** und wird durch Entfernen im Geräteinventar nicht entfernt. Nur auf entsprechenden Auftrag ändern. Beschreibung, DEP-Profil, Standard-Gerätename-Schalter, Eigentümerschaft, Lost Mode und Gerätegruppen ebenfalls nur bei explizitem Auftrag ändern.

Keine Aktionen wie Gerät löschen, sperren, Nachricht senden oder Zurücksetzen aus dem Auftrag zur Benennung/Benutzerentfernung ableiten. Nach UI-Mutationen aktuellen sichtbaren Zustand prüfen; nicht allein einen Klick oder ein noch offenes Speicherformular als Erfolg melden. Nachweis-Screenshot zeigen und gewünschte Tabs offen halten.

## Optional: Tucano-Pencil mit Akku-Problem prüfen

Bei einem entsprechenden Schadensfall: vollständig laden, danach etwa eine Stunde tatsächlich schreiben. Bloßes Liegenlassen ist kein Belastungstest. Der im Arbeitsgespräch übermittelte Herstellerhinweis nennt automatische Abschaltung nach ungefähr fünf Minuten Inaktivität; vor allgemeiner Herstellerzuschreibung anhand aktueller Modellunterlagen verifizieren.

Testdauer/Laufzeit, LED-Verhalten, Ausfälle und ungewöhnlich schnelle Entladung dokumentieren. Kein Testergebnis erfinden und Schadensbewertung erst nach Ergebnis und autorisierter Bewertung ändern.

## Abschluss

Kurz getrennt berichten: verifizierter Rücknahmestand, ausgeführte MDM-Änderungen, offene Vollständigkeits-/Schadens-/Rücksetzungsprüfungen und Freigabestatus. MDM-Änderungen synchronisieren Supabase nicht automatisch. Audit nur als vorhanden melden, wenn tatsächlich nachgelesen; gegebenenfalls fehlende Spur als offen benennen. Keine vollständige Rücknahme oder technische Rücksetzung behaupten, wenn lediglich MDM-Metadaten bearbeitet wurden.
