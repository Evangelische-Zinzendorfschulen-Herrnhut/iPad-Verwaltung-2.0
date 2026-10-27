import type {SupabaseClient} from "@supabase/supabase-js";

/** Detect only the pending introduction migrations; do not mask permissions or outages. */
export async function supportsIntroduction(client:SupabaseClient):Promise<boolean> {
  const date = await client.from("set_person_assignment").select("ipad_introduction_at").limit(0);
  if(date.error) {
    if(date.error.code==="42703" || date.error.code==="PGRST204") return false;
    throw date.error;
  }
  const [audit,availability]=await Promise.all([
    client.from("set_introduction_audit").select("id").limit(0),
    client.from("inventory_set").select("id").eq("availability","ipad_einfuehrung").limit(0),
  ]);
  for(const result of [audit,availability]) {
    if(result.error) {
      if(["42P01","PGRST205","22P02"].includes(result.error.code)) return false;
      throw result.error;
    }
  }
  return true;
}
export function introductionColumns(columns:string,enabled:boolean):string {
  return enabled ? columns : columns.replaceAll("ipad_introduction_at,","");
}
