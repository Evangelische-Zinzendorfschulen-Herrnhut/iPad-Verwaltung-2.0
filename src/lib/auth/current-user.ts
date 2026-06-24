import { createClient } from "@/lib/supabase/server";

export type CurrentAppUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

export function hasAnyRole(
  appUser: CurrentAppUser | null,
  roles: string[],
): boolean {
  return Boolean(appUser?.roles.some((role) => roles.includes(role)));
}

export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: identity } = await supabase
    .from("auth_identity")
    .select("app_user_id")
    .eq("provider", "supabase")
    .eq("provider_user_id", user.id)
    .maybeSingle();

  if (!identity) {
    return null;
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("id,email,display_name")
    .eq("id", identity.app_user_id)
    .maybeSingle();

  if (!appUser) {
    return null;
  }

  const { data: roleRows } = await supabase
    .from("user_role")
    .select("role:role_id(key)")
    .eq("app_user_id", appUser.id);

  const roles =
    roleRows
      ?.map((row) => {
        const role = Array.isArray(row.role) ? row.role[0] : row.role;
        return role?.key;
      })
      .filter((role): role is string => Boolean(role)) ?? [];

  return {
    id: appUser.id,
    email: appUser.email,
    displayName: appUser.display_name,
    roles,
  };
}
