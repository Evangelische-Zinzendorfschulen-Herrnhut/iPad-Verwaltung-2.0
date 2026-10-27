"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAppUser } from '@/lib/auth/current-user';
import { createClient } from '@/lib/supabase/server';
import { validatePerson } from '@/lib/person-validation';

export type PersonEditState = { error?: string };

export async function updatePerson(_previous: PersonEditState, formData: FormData): Promise<PersonEditState> {
  await requireAppUser(['admin']);
  const data = Object.fromEntries([...formData].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const parsed = validatePerson(data);
  if (!parsed.data) return { error: parsed.error };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.person_id ?? '') || !data.updated_at) return { error: 'Ungültiger Datensatz. Bitte die Seite neu öffnen.' };
  const supabase = await createClient();
  const { data: updated, error } = await supabase.from('person').update(parsed.data).eq('id', data.person_id).eq('updated_at', data.updated_at).select('id').maybeSingle();
  if (error) return { error: 'Änderungen konnten nicht gespeichert werden. Bitte erneut versuchen.' };
  if (!updated) return { error: 'Der Datensatz wurde inzwischen geändert oder ist nicht mehr bearbeitbar. Bitte die Seite neu öffnen.' };
  revalidatePath('/personen');
  revalidatePath(`/personen/${data.person_id}`);
  const returnTo = data.return_to === '/personen' || data.return_to?.startsWith('/personen?') ? data.return_to : '/personen';
  redirect(`/personen/${data.person_id}?${new URLSearchParams({ returnTo, saved: '1' })}`);
}
