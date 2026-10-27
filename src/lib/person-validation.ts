export function validatePerson(data: Record<string, string>) {
  const text = (key: string) => data[key]?.trim() || null;
  const first_name = text('first_name');
  const last_name = text('last_name');
  const email = text('email');
  const person_type = text('person_type');
  const status = text('status');
  const year = text('jahrgang');
  if (!first_name && !last_name) return { error: 'Bitte Vorname oder Nachname ausfüllen.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  if (!person_type || !['schueler','lehrer','mitarbeiter','referendar','praktikant'].includes(person_type)) return { error: 'Bitte einen gültigen Personentyp wählen.' };
  if (!status || !['aktiv','ausgeschieden','verstorben','dublette','test','unklar'].includes(status)) return { error: 'Bitte einen gültigen Status wählen.' };
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100)) return { error: 'Jahrgang muss eine ganze Zahl zwischen 2000 und 2100 sein.' };
  return { data: { first_name, last_name, email, person_type, status, jahrgang: year ? Number(year) : null, notes: text('notes') } };
}
