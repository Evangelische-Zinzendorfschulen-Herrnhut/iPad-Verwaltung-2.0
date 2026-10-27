"use client";

import Link from 'next/link';
import { useActionState } from 'react';
import { updatePerson, type PersonEditState } from './update-person';

export function PersonEditForm({ person, returnTo, detailHref }: {
  person: { id: string; updated_at: string; first_name: string | null; last_name: string | null; email: string | null; person_type: string; status: string; jahrgang: number | null; notes: string | null };
  returnTo: string;
  detailHref: string;
}) {
  const [state, action, pending] = useActionState<PersonEditState, FormData>(updatePerson, {});
  const inputClass = 'rounded-md border border-zinc-300 px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500';
  return <form action={action} className="grid gap-4 p-4">
    <input type="hidden" name="person_id" value={person.id} />
    <input type="hidden" name="updated_at" value={person.updated_at} />
    <input type="hidden" name="return_to" value={returnTo} />
    {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {(['last_name','first_name','email','jahrgang'] as const).map(key => <label key={key} className="flex flex-col gap-1 text-sm font-medium">
        {{last_name:'Nachname',first_name:'Vorname',email:'E-Mail',jahrgang:'Jahrgang'}[key]}
        <input className={inputClass} name={key} defaultValue={person[key] ?? ''} type={key === 'email' ? 'email' : key === 'jahrgang' ? 'number' : 'text'} min={key === 'jahrgang' ? 2000 : undefined} max={key === 'jahrgang' ? 2100 : undefined} step={key === 'jahrgang' ? 1 : undefined} />
      </label>)}
      <label className="flex flex-col gap-1 text-sm font-medium">Typ<select className={inputClass} name="person_type" defaultValue={person.person_type}>
        {['schueler','lehrer','mitarbeiter','referendar','praktikant'].map(value => <option key={value} value={value}>{value === 'schueler' ? 'Schüler' : value[0].toUpperCase()+value.slice(1)}</option>)}
      </select></label>
      <label className="flex flex-col gap-1 text-sm font-medium">Status<select className={inputClass} name="status" defaultValue={person.status}>
        {['aktiv','ausgeschieden','verstorben','dublette','test','unklar'].map(value => <option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}
      </select></label>
    </div>
    <label className="flex flex-col gap-1 text-sm font-medium">Anmerkung<textarea className={inputClass} name="notes" defaultValue={person.notes ?? ''} /></label>
    <div className="flex gap-3"><button disabled={pending} className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Speichert…' : 'Änderungen speichern'}</button><Link className="rounded-md border border-zinc-300 px-4 py-2 text-sm" href={detailHref}>Abbrechen</Link></div>
  </form>;
}
