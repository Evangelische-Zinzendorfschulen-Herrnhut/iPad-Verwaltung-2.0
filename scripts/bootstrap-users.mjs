import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      const value = rawValue.trim().replace(/^['"]|['"]$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function findAuthUserByEmail(supabase, email) {
  const pageSize = 100;

  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      return user;
    }

    if (data.users.length < pageSize) {
      return null;
    }
  }

  throw new Error("Stopped after scanning 99 auth user pages.");
}

async function inviteAuthUser(supabase, email, appUrl) {
  const existingUser = await findAuthUserByEmail(supabase, email);

  if (existingUser) {
    return { user: existingUser, invited: false };
  }

  const redirectUrl = new URL("/auth/confirm", appUrl);
  redirectUrl.searchParams.set("next", "/auth/update-password");

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl.toString(),
  });

  if (error) {
    throw error;
  }

  return { user: data.user, invited: true };
}

async function generateInviteLink(supabase, email, appUrl) {
  const redirectUrl = new URL("/auth/confirm", appUrl);
  redirectUrl.searchParams.set("next", "/auth/update-password");

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    throw error;
  }

  return {
    actionLink: data.properties.action_link,
    user: data.user,
  };
}

async function generateRecoveryLink(supabase, email, appUrl) {
  const redirectUrl = new URL("/auth/update-password", appUrl);

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    throw error;
  }

  return {
    actionLink: data.properties.action_link,
    user: data.user,
  };
}

async function upsertAppUser(supabase, { email, displayName, roleKey, authUser }) {
  const { data: appUser, error: appUserError } = await supabase
    .from("app_user")
    .upsert(
      {
        email,
        display_name: displayName,
        status: "active",
      },
      { onConflict: "email" },
    )
    .select("id,email")
    .single();

  if (appUserError) {
    throw appUserError;
  }

  if (authUser) {
    const { error: identityError } = await supabase
      .from("auth_identity")
      .upsert(
        {
          app_user_id: appUser.id,
          provider: "supabase",
          provider_user_id: authUser.id,
          provider_email: email,
        },
        { onConflict: "provider,provider_user_id" },
      );

    if (identityError) {
      throw identityError;
    }
  }

  const { data: role, error: roleError } = await supabase
    .from("role")
    .select("id")
    .eq("key", roleKey)
    .single();

  if (roleError) {
    throw roleError;
  }

  const { error: userRoleError } = await supabase.from("user_role").upsert(
    {
      app_user_id: appUser.id,
      role_id: role.id,
    },
    { onConflict: "app_user_id,role_id" },
  );

  if (userRoleError) {
    throw userRoleError;
  }

  return appUser;
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SECRET_KEY");
const adminEmail = requireEnv("INITIAL_ADMIN_EMAIL");
const accountingEmail = requireEnv("INITIAL_ACCOUNTING_EMAIL");
const inviteAdmin = getFlag("invite-admin");
const inviteAccounting = getFlag("invite-accounting");
const printAdminLink = getFlag("print-admin-link");
const printAccountingLink = getFlag("print-accounting-link");
const printAdminRecoveryLink = getFlag("print-admin-recovery-link");
const printAccountingRecoveryLink = getFlag("print-accounting-recovery-link");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  {
    email: adminEmail,
    displayName: "Initialer Admin",
    roleKey: "admin",
    invite: inviteAdmin,
    printLink: printAdminLink,
    printRecoveryLink: printAdminRecoveryLink,
  },
  {
    email: accountingEmail,
    displayName: "Buchhaltung",
    roleKey: "buchhaltung",
    invite: inviteAccounting,
    printLink: printAccountingLink,
    printRecoveryLink: printAccountingRecoveryLink,
  },
];

for (const user of users) {
  const generatedLink = user.printLink
    ? await generateInviteLink(supabase, user.email, appUrl)
    : user.printRecoveryLink
      ? await generateRecoveryLink(supabase, user.email, appUrl)
    : null;

  const authResult = user.invite
    ? await inviteAuthUser(supabase, user.email, appUrl)
    : {
        user:
          generatedLink?.user || (await findAuthUserByEmail(supabase, user.email)),
        invited: false,
      };

  const appUser = await upsertAppUser(supabase, {
    ...user,
    authUser: authResult.user,
  });

  const authStatus = authResult.user
    ? authResult.invited
      ? "invited"
      : "linked"
    : "profile-only";

  console.log(`${user.email}: ${user.roleKey}, ${authStatus}, ${appUser.id}`);

  if (generatedLink?.actionLink) {
    console.log(`${user.email} auth link: ${generatedLink.actionLink}`);
  }
}
