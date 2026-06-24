import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const NON_CLASS_LABELS = new Set(["ehemalige"]);

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

function readJsonFile(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeEmail(value) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

function normalizeJahrgang(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : null;
}

function normalizeLegacyType(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (text.includes("schüler")) {
    return "schueler";
  }

  if (text.includes("referendar")) {
    return "referendar";
  }

  if (text.includes("praktikant")) {
    return "praktikant";
  }

  if (text.includes("schulsozialarbeit") || text.includes("mitarbeiter")) {
    return "mitarbeiter";
  }

  if (text.includes("lehrer")) {
    return "lehrer";
  }

  return "mitarbeiter";
}

function normalizePersonType(legacyUser) {
  if (
    (normalizeLegacyStatus(legacyUser.BenutzerTyp) === "dublette" ||
      legacyForceDuplicateUserIds.has(legacyUser.UserID)) &&
    normalizeJahrgang(legacyUser.Jahrgang)
  ) {
    return "schueler";
  }

  return normalizeLegacyType(legacyUser.BenutzerTyp);
}

function normalizeLegacyStatus(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (text.includes("ausgeschieden")) {
    return "ausgeschieden";
  }

  if (text.includes("verstorben")) {
    return "verstorben";
  }

  if (text.includes("dublette")) {
    return "dublette";
  }

  if (text.includes("test")) {
    return "test";
  }

  if (!text) {
    return "unklar";
  }

  return "aktiv";
}

function parseClassLabel(value) {
  const label = normalizeText(value);

  if (!label) {
    return null;
  }

  if (NON_CLASS_LABELS.has(label.toLowerCase())) {
    return null;
  }

  const upperMatch = label.match(/^(\d{2})JG(\d{4})$/);

  if (upperMatch) {
    return {
      label,
      gradeLevel: Number.parseInt(upperMatch[1], 10),
      jahrgang: Number.parseInt(upperMatch[2], 10),
      track: null,
      isUpperSchool: true,
    };
  }

  const classMatch = label.match(/^(\d{2})-(\d+)$/);

  if (classMatch) {
    const gradeLevel = Number.parseInt(classMatch[1], 10);

    return {
      label,
      gradeLevel,
      jahrgang: 2025 - gradeLevel + 5,
      track: Number.parseInt(classMatch[2], 10),
      isUpperSchool: false,
    };
  }

  return {
    label,
    gradeLevel: null,
    jahrgang: null,
    track: null,
    isUpperSchool: false,
  };
}

function readLegacyUsers(sqlitePath) {
  const sql = `
    select
      UserID,
      Nachname,
      Vorname,
      Jahrgang,
      Email,
      BenutzerTyp,
      Klasse,
      Anmerkung
    from "User"
    order by UserID
  `;
  const output = execFileSync("sqlite3", ["-json", sqlitePath, sql], {
    encoding: "utf8",
  });

  return JSON.parse(output);
}

async function upsertSchoolYear(supabase) {
  const { data, error } = await supabase
    .from("school_year")
    .upsert(
      {
        label: "2025/26",
        start_date: "2025-08-01",
        end_date: "2026-07-31",
        status: "aktiv",
      },
      { onConflict: "label" },
    )
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function upsertSchoolClasses(supabase, schoolYearId, users) {
  const activeClassLabels = new Set(
    users
      .filter(
        (user) =>
          normalizeLegacyStatus(user.BenutzerTyp) === "aktiv" &&
          !legacyForceExitedUserIds.has(user.UserID) &&
          !legacyForceDuplicateUserIds.has(user.UserID),
      )
      .map((user) => normalizeText(user.Klasse))
      .filter(Boolean),
  );
  const classByLabel = new Map();

  for (const label of [...activeClassLabels].sort()) {
    const parsed = parseClassLabel(label);

    if (!parsed) {
      continue;
    }

    const { data, error } = await supabase
      .from("school_class")
      .upsert(
        {
          school_year_id: schoolYearId,
          label: parsed.label,
          grade_level: parsed.gradeLevel,
          jahrgang: parsed.jahrgang,
          track:
            parsed.track && parsed.track >= 1 && parsed.track <= 4
              ? parsed.track
              : null,
          is_upper_school: parsed.isUpperSchool,
          active: true,
        },
        { onConflict: "school_year_id,label" },
      )
      .select("id,label")
      .single();

    if (error) {
      throw error;
    }

    classByLabel.set(data.label, data.id);
  }

  return classByLabel;
}

async function upsertPerson(supabase, legacyUser) {
  const override = legacyPersonOverrides.get(legacyUser.UserID);
  const legacyType = normalizeText(legacyUser.BenutzerTyp);
  const personType = normalizePersonType(legacyUser);
  const status = legacyForceDuplicateUserIds.has(legacyUser.UserID)
    ? "dublette"
    : legacyForceExitedUserIds.has(legacyUser.UserID)
      ? "ausgeschieden"
      : normalizeLegacyStatus(legacyUser.BenutzerTyp);
  const importHint =
    legacyForceDuplicateUserIds.has(legacyUser.UserID)
      ? "Dublette laut aktueller Schuelertabelle 2025/26. Set-Zuordnung spaeter pruefen/migrieren."
      : legacyForceExitedUserIds.has(legacyUser.UserID)
      ? "Status nach Abgleich mit aktueller Schuelertabelle 2025/26 auf ausgeschieden gesetzt."
      : personType === "mitarbeiter" &&
          !legacyType?.toLowerCase().includes("mitarbeiter")
        ? `Legacy BenutzerTyp "${legacyType ?? ""}" wurde als mitarbeiter importiert.`
        : null;

  const { data, error } = await supabase
    .from("person")
    .upsert(
      {
        legacy_user_id: legacyUser.UserID,
        first_name:
          override?.first_name ?? normalizeText(legacyUser.Vorname),
        last_name: normalizeText(legacyUser.Nachname),
        email: normalizeEmail(legacyUser.Email),
        person_type: personType,
        status,
        jahrgang: normalizeJahrgang(legacyUser.Jahrgang),
        notes: normalizeText(legacyUser.Anmerkung),
        import_hint: override?.import_hint ?? importHint,
      },
      { onConflict: "legacy_user_id" },
    )
    .select("id,status")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertClassAssignment(
  supabase,
  personId,
  schoolClassId,
  validFrom,
) {
  const { data: existing, error: existingError } = await supabase
    .from("person_class_assignment")
    .select("id,school_class_id")
    .eq("person_id", personId)
    .is("valid_until", null)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (existing.school_class_id === schoolClassId) {
      return "kept";
    }

    const { error } = await supabase
      .from("person_class_assignment")
      .update({
        school_class_id: schoolClassId,
        valid_from: validFrom,
        source: "import",
        note: "Aktuelle Klasse aus Legacy-Import 2025/26.",
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return "updated";
  }

  const { error } = await supabase.from("person_class_assignment").insert({
    person_id: personId,
    school_class_id: schoolClassId,
    valid_from: validFrom,
    source: "import",
    note: "Aktuelle Klasse aus Legacy-Import 2025/26.",
  });

  if (error) {
    throw error;
  }

  return "inserted";
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const sqlitePath = resolve(process.cwd(), requireEnv("LEGACY_SQLITE_PATH"));
const correctionsPath = resolve(
  process.cwd(),
  process.env.LEGACY_PERSON_CORRECTIONS_PATH ||
    "input/person-corrections.local.json",
);
const legacyCorrections = readJsonFile(correctionsPath, {});
const legacyForceExitedUserIds = new Set(
  legacyCorrections.force_exited_user_ids ?? [],
);
const legacyForceDuplicateUserIds = new Set(
  legacyCorrections.force_duplicate_user_ids ?? [],
);
const legacyPersonOverrides = new Map(
  Object.entries(legacyCorrections.person_overrides ?? {}).map(
    ([legacyUserId, override]) => [Number.parseInt(legacyUserId, 10), override],
  ),
);
const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const users = readLegacyUsers(sqlitePath);
const schoolYearId = await upsertSchoolYear(supabase);
const classByLabel = await upsertSchoolClasses(supabase, schoolYearId, users);

const stats = {
  users: 0,
  people: 0,
  classes: classByLabel.size,
  assignmentsInserted: 0,
  assignmentsUpdated: 0,
  assignmentsKept: 0,
  assignmentsSkipped: 0,
};

for (const legacyUser of users) {
  stats.users += 1;
  const person = await upsertPerson(supabase, legacyUser);
  stats.people += 1;
  const classLabel = normalizeText(legacyUser.Klasse);
  const schoolClassId = classLabel ? classByLabel.get(classLabel) : null;

  if (person.status !== "aktiv" || !schoolClassId) {
    stats.assignmentsSkipped += 1;
    continue;
  }

  const result = await upsertClassAssignment(
    supabase,
    person.id,
    schoolClassId,
    "2025-08-01",
  );

  if (result === "inserted") {
    stats.assignmentsInserted += 1;
  } else if (result === "updated") {
    stats.assignmentsUpdated += 1;
  } else {
    stats.assignmentsKept += 1;
  }
}

console.log(JSON.stringify(stats, null, 2));
