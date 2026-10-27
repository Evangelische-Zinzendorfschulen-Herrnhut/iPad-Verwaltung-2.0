"use server";
import {supportsIntroduction} from "@/lib/introduction-support";
import {issueLegacyPreparedSet} from "./issue-legacy-prepared-set";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAppUser} from "@/lib/auth/current-user";
import {createClient} from "@/lib/supabase/server";
import {INTRODUCTION, validIssueDate, berlinToday} from "@/lib/ipad-introduction";

export async function changeSetIssue(formData: FormData) {
  await requireAppUser(["admin","ipad_verwaltung"]);
  const setId=String(formData.get("set_id") ?? "");
  const target=String(formData.get("issue_target") ?? "ausgegeben");
  const date=String(formData.get("issued_at") ?? berlinToday());
  const note=String(formData.get("issue_note") ?? "").trim();
  const requestedReturn=String(formData.get("return_to") ?? "/sets");
  const returnTo=/^\/(sets(?:\/w1)?|ausgaben)(\?|$)/.test(requestedReturn) ? requestedReturn : "/sets";
  const errorHref=`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_invalid`;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(setId)
    || ![INTRODUCTION,"ausgegeben"].includes(target) || !validIssueDate(date) || note.length>4000) redirect(errorHref);
  const supabase=await createClient();
  if(!await supportsIntroduction(supabase)) {
    if(target===INTRODUCTION) redirect(errorHref);
    // Retain the pre-migration prepared-issue workflow until the new RPC is installed.
    return issueLegacyPreparedSet(formData);
  }
  const {error}=await supabase.rpc("change_set_issue",{p_set_id:setId,p_target:target,p_date:date,p_note:note || null});
  if(error) redirect(errorHref);
  for(const path of ["/sets","/sets/w1","/ausgaben"]) revalidatePath(path);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}issued=1`);
}
