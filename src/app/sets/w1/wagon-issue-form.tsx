"use client";
import {useActionState} from "react";
import {issueWagon, type WagonIssueState} from "./issue-wagon";
export function WagonIssueForm({wagon,snapshot,today}:{wagon:string;snapshot:{id:string;updated_at:string}[];today:string}) {
  const [state,action,pending]=useActionState<WagonIssueState,FormData>(issueWagon,{});
  return <section className="rounded-lg border border-blue-200 bg-white p-4">
    <h2 className="font-semibold">iPad-Einführung in {wagon} abschließen</h2>
    <p className="mt-2 text-sm">{snapshot.length} Sets in iPad-Einführung werden zur Mitnahme nach Hause ausgegeben. Ihre Wagenplätze werden frei.</p>
    <p className="mt-1 text-sm text-zinc-600">Die Aktion umfasst den ganzen Wagen, auch bei aktiven Suchfiltern.</p>
    {state.error ? <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p> : null}
    {state.count!==undefined ? <p role="status" className="mt-2 text-sm text-emerald-800">{state.count} Sets ausgegeben.</p> : null}
    <form key={JSON.stringify(snapshot)} action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="wagon" value={wagon}/><input type="hidden" name="snapshot" value={JSON.stringify(snapshot)}/>
      <label className="text-sm">Ausgabedatum <input type="date" name="issued_at" defaultValue={today} max={today} required className="ml-2 rounded border px-2 py-1"/></label>
      <label className="text-sm"><input type="checkbox" name="confirmed" value="yes" required className="mr-2"/>Ich bestätige die Ausgabe dieser {snapshot.length} Sets zur Mitnahme nach Hause.</label>
      <button disabled={pending || snapshot.length===0} className="w-fit rounded bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Ausgabe wird gespeichert…" : `${snapshot.length} Sets ausgeben`}</button>
    </form>
  </section>;
}
