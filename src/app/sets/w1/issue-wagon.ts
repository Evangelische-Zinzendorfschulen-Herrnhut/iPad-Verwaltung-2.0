"use server";
import {supportsIntroduction} from "@/lib/introduction-support";
import {revalidatePath} from "next/cache";
import {requireAppUser} from "@/lib/auth/current-user";
import {createClient} from "@/lib/supabase/server";
import {validIssueDate} from "@/lib/ipad-introduction";
export type WagonIssueState = {error?:string; count?:number};
export async function issueWagon(_previous:WagonIssueState,formData:FormData):Promise<WagonIssueState> {
  await requireAppUser(["admin","ipad_verwaltung"]);
  const wagon=String(formData.get("wagon") ?? "");
  const date=String(formData.get("issued_at") ?? "");
  if(!/^W[1-6]$/.test(wagon) || !validIssueDate(date) || formData.get("confirmed")!=="yes")
    return {error:"Bitte Wagen, gültiges Ausgabedatum und Bestätigung angeben."};
  let snapshot:unknown;
  try {snapshot=JSON.parse(String(formData.get("snapshot") ?? ""));} catch {return {error:"Vorschau ungültig. Bitte Liste neu laden."};}
  if(!Array.isArray(snapshot) || snapshot.length<1 || snapshot.length>30 || snapshot.some(row=>
    typeof row?.id!=="string" || !/^[0-9a-f-]{36}$/i.test(row.id) || typeof row?.updated_at!=="string" || !Number.isFinite(Date.parse(row.updated_at))))
    return {error:"Vorschau ungültig. Bitte Liste neu laden."};
  const supabase=await createClient();
  if(!await supportsIntroduction(supabase)) return {error:"iPad-Einführung ist noch nicht verfügbar. Datenbankmigration wartet auf Freigabe."};
  const {data,error}=await supabase.rpc("issue_introduction_wagon",{p_wagon:wagon,p_snapshot:snapshot,p_date:date});
  if(error) return {error:error.code==="P0001" ? error.message : "Ausgabe fehlgeschlagen. Bitte Liste neu laden und Voraussetzungen prüfen."};
  for(const path of ["/sets","/sets/w1","/ausgaben"]) revalidatePath(path);
  return {count:Number(data)};
}
