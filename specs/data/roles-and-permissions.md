# Rollen und Rechte

## MVP-Rollen

### admin

Verwaltet Systemkonfiguration, Benutzer, Rollen, Stammdaten, technische Geraetedaten und Integrationen. Im MVP ist die IT-Funktion in `admin` enthalten.

Initialer User:

- Wird ueber `INITIAL_ADMIN_EMAIL` konfiguriert.

### ipad_verwaltung

Koordiniert Sets, Ausgabe, Ruecknahme, Geraetezuordnung, Zustandsdokumentation und Vorgangsuebersicht.

### buchhaltung

Sieht Zahlungsvorgaenge, Kosten, Rechnungs-/Kautionsstatus und buchhalterische Exporte. Wird per Mail informiert, wenn aus einer Ruecknahme eine Abrechnung/Zahlungsforderung erstellt wurde.

Initialer User:

- buchhaltung.invalid

## Spaetere Rollen

Diese Rollen sind fachlich denkbar, aber nicht Teil des initialen MVP-Rollenmodells.

### sekretariat

Sieht organisatorische Daten, Kontakte, Ausleihstatus und Dokumente. Kann Rueckfragen und einfache Statusaenderungen erfassen.

### it

Verwaltet technische Geraetedaten, MDM-Informationen, Reparaturen, Sperrungen und Austauschgeraete. Im MVP wird diese Rolle nicht separat angelegt, sondern durch `admin` abgedeckt.

### schulleitung

Sieht Auswertungen, Eskalationen und relevante Einzelfaelle. Veraendert operative Daten nur eingeschraenkt.

### readonly

Nur lesender Zugriff auf freigegebene Bereiche.

## MVP-Rechte-Matrix

| Bereich | Admin | iPad-Verwaltung | Buchhaltung |
| --- | --- | --- | --- |
| Benutzer verwalten | ja | nein | nein |
| Rollen vergeben | ja | nein | nein |
| Personen lesen | ja | ja | eingeschraenkt |
| Personen bearbeiten | ja | eingeschraenkt | nein |
| Komponenten lesen | ja | ja | eingeschraenkt |
| Komponenten bearbeiten | ja | ja | nein |
| Sets verwalten | ja | ja | nein |
| Ausleihen verwalten | ja | ja | nein |
| Zahlungsforderungen erstellen | ja | ja | nein |
| Zahlungen lesen | ja | eingeschraenkt | ja |
| Zahlungen bearbeiten | ja | nein | ja |
| Schadensfaelle lesen | ja | ja | zahlungsbezogen |
| Schadensfaelle bearbeiten | ja | ja | nein |
| Reports lesen | ja | ja | ja |

## Admin-only MVP-Regeln

- Nur `admin` darf neue Benutzer anlegen.
- Nur `admin` darf Rollen vergeben oder entziehen.
- Nur `admin` darf Benutzer deaktivieren oder reaktivieren.
- Nicht-Admin-Rollen duerfen keine eigenen Berechtigungen erweitern.
- Admin-Aenderungen an Benutzern und Rollen muessen auditierbar sein.
- `admin` deckt im MVP auch IT-Aufgaben ab.
- `buchhaltung` wird im MVP bei neuen Zahlungsforderungen per Mail informiert.
- Erste Benachrichtigungsadresse fuer `buchhaltung`: buchhaltung.invalid.

## Grundregeln

- Rechte werden serverseitig durchgesetzt.
- Kritische Aenderungen erzeugen Audit-Logs.
- Finanzdaten werden nur Rollen angezeigt, die sie fuer ihre Arbeit benoetigen.
- Technische Geraetedetails werden nur Rollen angezeigt, die sie benoetigen.
- Rollen duerfen kombinierbar sein, wenn Mitarbeitende mehrere Aufgaben haben.
