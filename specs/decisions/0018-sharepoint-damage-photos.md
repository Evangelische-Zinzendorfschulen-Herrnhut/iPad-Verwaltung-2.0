# ADR 0018: Schadensfotos in der gemeinsamen SharePoint-Bibliothek

> Aktueller Umfang: Implementierte SharePoint-Verlinkung, siehe Abschnitt „Bestaetigter erster Umsetzungsschnitt“. Integrierter Foto-Upload bleibt ein spaeterer Entwurf. Migration und externe Inbetriebnahme sind noch offen.

Status: Speicherentscheidung angenommen am 30.09.2026; Umsetzung wartet auf fachliche Entscheidungen und Administratorfreigaben.

## Kontext und Entscheidung

Schadens- und Problemmeldungen brauchen mehrere Fotos. Der Nutzer hat die gemeinsame SharePoint-Bibliothek der Site `https://ezshde.sharepoint.com/sites/IT2` als primaeren Fotospeicher bestaetigt. Persoenliches OneDrive und Supabase Storage werden dafuer nicht verwendet. Supabase bleibt fuehrend fuer Schadensfaelle, Rollen, Foto-Metadaten und Audit.

Der am Bildschirm verifizierte Pfad lautet `Freigegebene Dokumente/2.1_iPads und Applezeugs/CaseManagement`. Darunter bestehen `Cases`, `Archiv` und `Vorlagen`. Aktive Faelle nutzen `Cases/Schaden-<sechsstellig gepolsterte Nummer>_<Nachname>-<Vorname>/Fotos/<foto-id>.<endung>` mit eindeutiger Schadensnummer und serverseitigen Foto-UUIDs. Vorhandene Dateien werden nicht ueberschrieben; unerwartete Namenskonflikte werden abgewiesen. Fallordner enthalten auf ausdruecklichen Nutzerwunsch Schadensnummer und betroffenen Benutzernamen; Foto-Dateinamen bleiben ohne Personennamen. `Archiv` und `Vorlagen` werden nicht fuer Uploads zweckentfremdet; Archivierungsautomatik ist nicht Teil dieser Entscheidung. Es werden jetzt keine Ordner, Dateien oder Berechtigungen angelegt.

## Zugriff und Referenzen

Serverseitiger Microsoft-Graph-Zugriff durch eine schulisch verwaltete Entra-App mit Application-Authentifizierung. Bevorzugt eng begrenzte Ressourcenfreigabe: `Files.SelectedOperations.Selected` fuer den bestehenden Cases-Ordner oder `Lists.SelectedOperations.Selected` fuer die Bibliothek, nach Verifikation der benoetigten Operationen. `Sites.Selected` nur fuer IT2 ist eine breitere Rueckfalloption; keine tenantweiten Schreibrechte. Scope, Adminzustimmung und explizite Ressourcenzuweisung sind zusammen erforderlich. Untergeordnete Selected-Freigaben koennen Berechtigungsvererbung unterbrechen und werden administrativ geprueft.

Supabase speichert je Foto Fall-ID, Foto-ID, Anbieter, Site-ID, Drive-ID, Item-ID, validierten MIME-Typ, Groesse, Reihenfolge, Uploadstatus, App-Nutzer und Zeitstempel. Drive-ID/Item-ID sind die stabile Referenz innerhalb des Drives; Pfade und Weblinks dienen nur der Anzeige. Temporaere Upload-/Downloadlinks werden nicht dauerhaft gespeichert oder geloggt. Verschieben in einen anderen Drive ist kein zugesicherter Workflow.

## Rollen, Datenschutz und Audit

`admin` und `ipad_verwaltung` duerfen hinzufuegen; Entfernen wartet auf die Loeschentscheidung. Assumption: Foto-Lesen folgt den Fallrechten, einschliesslich `readonly` und nur abrechenbarer Faelle fuer `buchhaltung`; fachliche Bestaetigung steht aus. Jeder Graph-Aufruf wird serverseitig am konkreten Fall autorisiert, Foto-Metadaten erhalten passende RLS. Keine anonymen Freigabelinks. Bestehende SharePoint-Berechtigungen werden geprueft, da direkte Bibliothekszugriffe App-Rollen umgehen koennen.

Serverseitige Datei-/Groessenvalidierung und Entfernung von EXIF-/Standortdaten sind Pflicht. Aufbewahrung, Papierkorb/Retention und externe Dateiaenderungen werden vor Umsetzung geregelt. Geschuetztes App-Audit dokumentiert Upload, erlaubte Entfernung und Fehler mit Fall, Foto, Zeitpunkt und tatsaechlichem App-Nutzer; Microsofts App-Identitaet allein genuegt nicht. Keine Bildinhalte, Geheimnisse oder temporaeren URLs im Audit.

## Umgebungen und Fehlerverhalten

localhost und Vercel koennen denselben zentralen Speicher verwenden, wenn Backend und Graph-Ziel identisch konfiguriert sind. Die App-Domain bestimmt keine Ablage. Entwicklungs-/Preview-Tests benoetigen eine separat freigegebene Testablage mit passenden Testdaten; die konkrete Produktions-/Entwicklungstrennung wird vor Umsetzung festgelegt. Zugangsdaten bleiben serverseitig; Rotation und Betriebsverantwortung werden benannt.

Zwischen Graph und Supabase gibt es keine gemeinsame Transaktion. Vorgesehen sind explizite Uploadzustaende, idempotente Wiederholung anhand der Foto-ID und Anzeige erst nach erfolgreicher Validierung, Dateispeicherung und Zuordnung. Fehlschlag der Metadatenfinalisierung fuehrt zu kompensierender Dateientfernung; scheitert diese, wird ein auditierter Bereinigungsauftrag festgehalten. Loeschfehler werden nicht als Erfolg angezeigt; Metadaten bleiben bis zur bestaetigten Entfernung nachvollziehbar. Extern fehlende Dateien erzeugen einen sichtbaren Hinweis. Fotooperationen aendern keinen Fallstatus, Austausch oder Zahlungsvorgang.

## Folgen und Verifikation

Vorteil: zentrale schulische Dateiablage unabhaengig von einzelnen Mitarbeitenden. Zusatzaufwand: Entra-/Graph-Betrieb, zweite Rechteebene und Wiederherstellung bei systemuebergreifenden Fehlern. Konkrete Vercel-Laufzeit-/Requestgrenzen sind im Uploadentwurf zu beruecksichtigen.

Testbare Kriterien: Mehrfachupload an neue/bestehende Faelle; richtige Fotoanzahl und Galerie nach Reload; Abweisung unzulaessiger Dateien und Rollen; kein Zugriff der Graph-App auf nicht freigegebene Ressourcen; stabile Zuordnung nach Umbenennung im Drive; idempotente Wiederholung ohne Duplikate; Fehler-/Bereinigungstests ohne verlorene Nachweise; geschuetzter Audit mit App-Nutzer; entfernte EXIF-Daten. Formate und Grenzen werden vor Umsetzung konkretisiert. Vollstaendige Feature-Kriterien stehen in `specs/features/007-damage-report-workflow.md`.

## Notwendige Entscheidungen vor Umsetzung

- Benannte Unterordnerstruktur freigeben; Stamm `Cases` ist geklaert.
- Fotoformate/Anzahl/Groessen, Leserechte und PDF-Aufnahme bestaetigen.
- Aufbewahrung, Loeschrollen, Entfernen nach Abschluss und Retention/Papierkorb klaeren.
- Entra-Adminzustimmung und konkrete Ressourcenfreigabe, Authentifizierung, Betriebsverantwortung sowie Testablage bereitstellen.

Quellen: [Selected-Berechtigungen](https://learn.microsoft.com/en-us/graph/permissions-selected-overview), [Application-Authentifizierung](https://learn.microsoft.com/en-us/graph/auth-v2-service), [Dateireferenzen](https://learn.microsoft.com/en-us/graph/onedrive-addressing-driveitems).


### Verbindliche Benennung der Schadensfallordner

Schema: `Schaden-<sechsstellig gepolsterte Nummer>_<Nachname>-<Vorname>`, beispielsweise `Schaden-000238_Mustermann-Max`. Nummern werden mindestens auf sechs Stellen gepolstert, niemals abgeschnitten. Der Ordnername wird bei Anlage aus dem damaligen Anzeigenamen erzeugt und danach bei Namens- oder Zuordnungsaenderungen nicht automatisch umbenannt. Unveraenderliche `damage_case.id` und SharePoint-Fallordner-Item-ID werden in Supabase festgehalten; Dateizugriffe verwenden weiterhin Drive-ID/Foto-Item-ID statt Namenspfade. Das Schema ersetzt den vorherigen UUID-Fallordnerentwurf.

Normalisierung fuer Namens- und Inventarnummernteile: Unicode nach NFC normalisieren; Steuerzeichen und SharePoint-inkompatible Zeichen (`"`, `*`, `:`, `<`, `>`, `?`, `/`, `\`, `|`) sowie vorsorglich `#` und `%` durch Bindestriche ersetzen; Leerraum und wiederholte Bindestriche zusammenfassen; Rand-Leerzeichen/-Punkte entfernen. Leere Namensteile erhalten `Unbekannt`. Laengen vor Anlage gegen aktuelle Graph-/SharePoint-Pfadgrenzen pruefen; Nummer bleibt vollstaendig, Namensteile werden bei Bedarf deterministisch gekuerzt. Der feste Prefix verhindert reservierte reine Dateinamen. Existierende Ordner niemals allein wegen Namensgleichheit uebernehmen: gespeicherte Fall-ID/Item-ID pruefen, unerwartete Kollision abweisen und protokollieren.

Ohne Benutzerzuordnung: `Schaden-000238_Inventar-<normalisierte Inventarnummer>`; bevorzugt Inventarnummer der betroffenen Komponente, sonst Set-Inventarnummer. Ohne belastbare Inventarnummer: `Schaden-000238_Ohne-Zuordnung`. Keine Namen aus Notizen ableiten. Spaetere Benutzerzuordnung fuehrt nicht zur automatischen Umbenennung.

Datenschutz: Benutzernamen werden dadurch auch in SharePoint-Ordnerlisten sichtbar und koennen historisch erhalten bleiben. Bibliotheks-/Ordnerrechte, Aufbewahrung und Auskunft/Korrektur muessen diesen ausdruecklich gewuenschten Namensbezug abdecken. Akzeptanz: exakte Beispielbenennung, Zeichen-/Laengennormalisierung, eindeutige Nummer trotz gleicher Namen, unveraenderter Ordner nach Namensaenderung und benutzerloser Inventar-Fallback werden getestet. Keine Ordner werden in der Planungsphase angelegt.


## Konkretisierung: automatische Ordner und App-Upload

Neue Meldung zuerst in Supabase samt Schadensnummer speichern, danach automatisch den benannten Fallordner unter Cases idempotent bereitstellen. Ordnerfehler erhalten den Fall; Bereitstellung und Upload bleiben nachholbar. Eine eindeutige Fall-Erstellkennung verhindert Duplikate bei Antwortverlust. Alte Faelle erhalten Ordner bei Bedarf, ohne Massen-Backfill.

Foto-/Datei-Sektion unter Zeugen; bei technischen Problemen ohne Zeugen am Ende der Problembeschreibung. iPad-Mehrfachinput bietet Kamera/Fotomediathek; separater Kameraweg erzwingt nicht den Modus der allgemeinen Auswahl. Einzeldateien erhalten Fortschritt, Teilfehler, Wiederholen und rollenabhaengiges Entfernen. Gespeicherter Dateiname gehoert neben MIME-Typ, Groesse, Uploader und Zeitstempel zu den Foto-Metadaten.

Keine gemeinsame Graph-/Supabase-Transaktion: DB-Zustand und Audit werden transaktional gespeichert, externe Schritte idempotent und bei Fehler kompensiert. Ordner und Fotos erhalten dauerhafte Status-/Versuchsdatensaetze, verwaiste Dateien Bereinigungsauftraege. Nach verlorener Antwort wird anhand gespeicherter IDs abgeglichen, statt erneut blind hochzuladen. Bestehende Austauschschritte bleiben ein separat zu bewertender Workflow.

Alle Graph-Token, Credentials und Uploadsessions bleiben serverseitig. Browser spricht ausschliesslich App-API. Fuer Vercel muss vor Implementierung ein begrenzter Request-/Chunk- und serverseitiger Bildverarbeitungspfad konkretisiert werden; durable Session-Staging darf nicht auf dem lokalen Vercel-Dateisystem beruhen. Diese noch offene Betriebsentscheidung darf Supabase Storage nicht still als primaeren Fotospeicher einfuehren.

Der konkrete Migrations-, RLS-, API-, UI- und Testplan ist in der Feature-Spec dokumentiert. Umsetzung erst nach den dort genannten Admin-Angaben und fachlichen Freigaben; keine externe Konfiguration wird im Planungsschritt veraendert.


## Bestaetigter erster Umsetzungsschnitt: SharePoint-Verlinkung

Stand 30.09.2026: Der Nutzer autorisiert die Implementierung der schlanken Verlinkungsvariante auch ohne reale Entra-Geheimnisse. Dieser Abschnitt hat Vorrang vor dem integrierten Foto-Uploadentwurf.

Nach erfolgreichem Anlegen einer Meldung stellt die App serverseitig den benannten Fallordner direkt unter Cases bereit. Supabase speichert Namenssnapshot, Drive-ID, Item-ID, Web-URL und Bereitstellungsstatus. Unter Zeugen erscheint `Fotos in SharePoint öffnen`; vor dem Speichern ein Hinweis, dass der Ordner danach verfügbar wird. Nach dem Speichern öffnet die App das Schadensdetail. Upload/Kamera, Vorschau und Dateiverwaltung erfolgen in SharePoint mit eigener Microsoft-Anmeldung und den dortigen Benutzerrechten. App-Leserechte geben keine zusätzlichen SharePoint-Rechte. Keine integrierten Uploads, Foto-Tabelle, EXIF-Verarbeitung, Datei-Loeschaktionen oder Uploadsessions in diesem Schnitt.

Lesen der Ordnerreferenz folgt den bestehenden Fall-Leserechten, Bereitstellen/Wiederholen nur admin/ipad_verwaltung. Schreibzugriffe auf Ordnerstatus und geschuetztes Audit bleiben server-only. Fehlende Konfiguration oder Graph-Fehler erhalten die Meldung; Detail zeigt einen klaren Fehler und Wiederholen. Bereitstellung nutzt atomare DB-Reservierung mit Lease, Namenssnapshot und Versuch-ID. Wiederholung nach verlorener Graph-Antwort darf nur einen exakt passenden, vom konfigurierten App-Client erzeugten Ordner wiederverwenden; fremde Namenskollisionen werden abgewiesen. Derselbe Cases-Stamm darf nicht mit voneinander unabhaengigen Fallnummern-Sequenzen verwendet werden. Nach erfolgreicher Zuordnung bleiben Name und IDs unveraenderlich.

DB-Statusabschluss und Audit laufen zusammen in einer Transaktion. Kein Rollback des Schadensfalls bei Graph-Fehlern, keine automatische Loeschung externer Ordner. Audit erfasst Bereitstellungsversuch und Ergebnis mit App-Nutzer und Zeitpunkt; Uploads innerhalb SharePoint unterliegen dessen Audit/Retention, nicht einem vorgetaeuschten App-Dateiaudit.

Akzeptanz: korrekt benannter Ordner und sichere HTTPS-Web-URL; Wiederholung/Parallelaufruf ohne doppelte Ordner; fremde Kollision abgewiesen; fehlende Konfiguration erhaelt Fall und bietet Nachholen; read-only/Buchhaltung koennen keine Bereitstellung starten; direkter Zugriff auf fremde/nicht lesbare Faelle abgewiesen; geschuetzte DB-Metadaten und Audit; Oeffnen nur auf ezshde.sharepoint.com. Keine Graph-Zugangsdaten im Browser.

Noch noetig fuer Inbetriebnahme: Tenant-ID, Client-ID, serverseitiges Client-Secret, Drive-ID der Bibliothek und Item-ID des Cases-Ordners, Selected-Adminzustimmung plus explizite Ressourcenfreigabe, schulische Microsoft-Benutzerrechte und Testablage. Die Site-ID ist fuer den gewaehlten direkten Drive-/Item-Zugriff nicht zwingend. Datenmigration und produktiver Graph-Test werden erst nach Bereitstellung dieser Angaben ausgefuehrt.

### Verifikation des Verlinkungsschnitts am 30.09.2026

14 neue Logik-, Graph-, Service-, API- und UI-Tests sowie 10 bestehende Ladepfadtests bestehen. Die echte Ordner-Migration besteht in isoliertem PostgreSQL (PGlite 0.5.8) mit minimalem Rollenschema: RLS/Grants, Lease, Snapshot, Finalisierung und Audit getestet. TypeScript, gezieltes ESLint und Produktionsbuild bestehen; Build benoetigte wegen lokaler Worker-Ports Ausfuehrung ausserhalb der Sandbox. Keine reale Supabase-Migration, Graph-Konfiguration, Ordneranlage oder Dateioperation ausgefuehrt. Echtintegration und iPad-Test warten auf Adminangaben. Inbetriebnahme und sichere Umgebungsvariablen: `specs/data/sharepoint-folder-operations.md`.
