import { NextResponse } from "next/server";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type SetRow = {
  id: string;
  legacy_set_id: number;
  storage_label: string | null;
};

type ComponentAssignmentRow = {
  role: string;
  component: {
    legacy_inventory_number: string;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
  } | null;
};

type RawComponentAssignmentRow = Omit<ComponentAssignmentRow, "component"> & {
  component:
    | ComponentAssignmentRow["component"]
    | ComponentAssignmentRow["component"][];
};

type PersonAssignmentRow = {
  return_charging_cable_present: boolean | null;
  return_defects: string | null;
  return_ipad_present: boolean | null;
  return_keyboard_present: boolean | null;
  return_note: string | null;
  return_pencil_cap_present: boolean | null;
  return_pencil_present: boolean | null;
  return_power_adapter_present: boolean | null;
  return_resolutions: string | null;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
};

type RawPersonAssignmentRow = Omit<PersonAssignmentRow, "person"> & {
  person: PersonAssignmentRow["person"] | PersonAssignmentRow["person"][];
};

type RawClassAssignmentRow = {
  school_class:
    | {
        label: string;
      }
    | {
        label: string;
      }[]
    | null;
};

type PdfObject = {
  content: string | Uint8Array;
  id: number;
};

type ReturnChecks = {
  adapter: boolean;
  chargingCable: boolean;
  hdmiCable: boolean;
  ipad: boolean;
  keyboard: boolean;
  pencil: boolean;
  pencilCap: boolean;
  powerAdapter: boolean;
};

type ReturnRequirements = {
  adapter: boolean;
  hdmiCable: boolean;
};

function normalizeJoined<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function personName(person: PersonAssignmentRow["person"]) {
  if (!person) {
    return "-";
  }

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.email ||
    "-"
  );
}

function personTypeLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    lehrer: "Lehrer",
    mitarbeiter: "Mitarbeiter",
    praktikant: "Praktikant",
    referendar: "Referendar",
    schueler: "Schüler",
  };

  return value ? (labels[value] ?? value) : "-";
}

function signaturePersonLabel(value: string | undefined) {
  if (value === "schueler") {
    return "Schüler / Sorgeberechtigte";
  }

  return personTypeLabel(value);
}

function noteConfirmsReturn(note: string | null | undefined, label: string) {
  const normalizedNote = (note ?? "").toLocaleLowerCase("de-DE");
  const normalizedLabel = label.toLocaleLowerCase("de-DE");

  return normalizedNote.includes(`${normalizedLabel} zurückgegeben: ja`);
}

function buildReturnChecks(assignment: PersonAssignmentRow | null): ReturnChecks {
  return {
    adapter: noteConfirmsReturn(assignment?.return_note, "Adapter"),
    chargingCable: assignment?.return_charging_cable_present === true,
    hdmiCable: noteConfirmsReturn(assignment?.return_note, "HDMI-Kabel"),
    ipad: assignment?.return_ipad_present === true,
    keyboard: assignment?.return_keyboard_present === true,
    pencil: assignment?.return_pencil_present === true,
    pencilCap: assignment?.return_pencil_cap_present === true,
    powerAdapter: assignment?.return_power_adapter_present === true,
  };
}

function componentName(component: ComponentAssignmentRow["component"]) {
  if (!component) {
    return "-";
  }

  return [component.manufacturer, component.model].filter(Boolean).join(" ") || "-";
}

function componentInventory(component: ComponentAssignmentRow["component"]) {
  return component?.legacy_inventory_number ?? "-";
}

function componentSerial(component: ComponentAssignmentRow["component"]) {
  return component?.serial_number ?? "-";
}

function encodeWinAnsi(value: string) {
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("„", '"')
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'")
    .replaceAll("…", "...");
}

function pdfLiteralText(value: string) {
  let result = "";

  for (const char of encodeWinAnsi(value)) {
    const code = char.codePointAt(0) ?? 32;

    if (char === "\\") {
      result += "\\\\";
    } else if (char === "(") {
      result += "\\(";
    } else if (char === ")") {
      result += "\\)";
    } else if (code < 32 || code > 126) {
      result += `\\${code.toString(8).padStart(3, "0")}`;
    } else {
      result += char;
    }
  }

  return `(${result})`;
}

function textLine(x: number, y: number, text: string, size = 10, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td ${pdfLiteralText(text)} Tj ET`;
}

function line(x1: number, y1: number, x2: number, y2: number) {
  return `${x1} ${y1} m ${x2} ${y2} l S`;
}

function checkbox(x: number, y: number, checked = false) {
  const mark = checked ? ` ${x + 2} ${y + 5} m ${x + 5} ${y + 2} l ${x + 10} ${y + 10} l S` : "";
  return `${x} ${y} 10 10 re S${mark}`;
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function textBlock(x: number, y: number, text: string, maxChars: number, maxLines = 2) {
  return wrapText(text, maxChars)
    .slice(0, maxLines)
    .map((lineText, index) => textLine(x, y - index * 13, lineText, 9))
    .join("\n");
}

function buildPdfContent(data: {
  classLabel: string | null;
  ipad: ComponentAssignmentRow["component"];
  keyboard: ComponentAssignmentRow["component"];
  pencil: ComponentAssignmentRow["component"];
  person: PersonAssignmentRow["person"];
  returnDefects: string | null;
  returnChecks: ReturnChecks;
  returnRequirements: ReturnRequirements;
  returnResolutions: string | null;
  set: SetRow;
}) {
  const today = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const isStudent = data.person?.person_type === "schueler";
  const isTeacher =
    data.person?.person_type === "lehrer" ||
    data.person?.person_type === "referendar" ||
    data.person?.person_type === "praktikant";
  const isStaff = data.person?.person_type === "mitarbeiter";
  const teacherLikeLabel = isTeacher
    ? personTypeLabel(data.person?.person_type)
    : "Lehrer";
  const signatureLabel = signaturePersonLabel(data.person?.person_type);
  const returnedCompletely =
    data.returnChecks.ipad &&
    data.returnChecks.pencil &&
    data.returnChecks.keyboard &&
    data.returnChecks.powerAdapter &&
    data.returnChecks.chargingCable &&
    (!data.returnRequirements.adapter || data.returnChecks.adapter) &&
    (!data.returnRequirements.hdmiCable || data.returnChecks.hdmiCable);
  const hasReturnDefects = Boolean(data.returnDefects?.trim());
  const hasReturnResolutions = Boolean(data.returnResolutions?.trim());

  const commands = [
    "0.92 0.92 0.92 rg 36 744 523 42 re f",
    "0 g",
    textLine(48, 768, "RÜCKGABE-Protokoll", 20, "F2"),
    textLine(48, 728, `Name: ${personName(data.person)}`, 11, "F2"),
    data.classLabel ? textLine(330, 728, `Klasse/Jahrgang: ${data.classLabel}`, 10) : "",
    checkbox(48, 704, isStudent),
    textLine(64, 705, "Schüler", 10),
    checkbox(215, 704, isTeacher),
    textLine(231, 705, teacherLikeLabel, 10),
    checkbox(390, 704, isStaff),
    textLine(406, 705, "Mitarbeiter", 10),
    textLine(48, 676, `Set: ${data.set.legacy_set_id}`, 11, "F2"),
    textLine(390, 676, `Erstellt: ${today}`, 10),
    "0.2 0.42 0.35 RG",
    line(48, 662, 548, 662),
    "0 g",
    textLine(48, 640, "Bezeichnung", 10, "F2"),
    textLine(190, 640, "Modell", 10, "F2"),
    textLine(320, 640, "Serien-Nummer", 10, "F2"),
    textLine(450, 640, "Inventar-Nummer", 10, "F2"),
    line(48, 632, 548, 632),
    checkbox(48, 611, data.returnChecks.ipad),
    textLine(64, 614, "iPad", 10, "F2"),
    textBlock(190, 614, componentName(data.ipad), 20),
    textBlock(320, 614, componentSerial(data.ipad), 20),
    textBlock(450, 614, componentInventory(data.ipad), 20),
    line(48, 590, 548, 590),
    textLine(48, 572, "Zubehör", 10, "F2"),
    checkbox(48, 549, data.returnChecks.pencil),
    textLine(64, 552, "Pencil", 10),
    textBlock(190, 552, componentName(data.pencil), 20),
    textBlock(320, 552, componentSerial(data.pencil), 20),
    textBlock(450, 552, componentInventory(data.pencil), 20),
    checkbox(48, 513, data.returnChecks.keyboard),
    textLine(64, 516, "Tastatur", 10),
    textBlock(190, 516, componentName(data.keyboard), 20),
    textBlock(320, 516, componentSerial(data.keyboard), 20),
    textBlock(450, 516, componentInventory(data.keyboard), 20),
    line(48, 492, 548, 492),
    textLine(48, 468, "Sonstiges", 10, "F2"),
    checkbox(48, 445, data.returnChecks.powerAdapter),
    textLine(64, 448, "Netzteil", 10),
    checkbox(48, 417, data.returnChecks.chargingCable),
    textLine(64, 420, "Ladekabel", 10),
    checkbox(48, 389, data.returnChecks.adapter),
    textLine(64, 392, "Lightning-USB-Adapter", 10),
    checkbox(215, 389, data.returnChecks.hdmiCable),
    textLine(231, 392, "HDMI-Kabel", 10),
    line(48, 382, 548, 382),
    checkbox(48, 350, returnedCompletely),
    textLine(
      64,
      350,
      "Oben genanntes Gerät wurde mitsamt Zubehör ordnungsgemäß an den Schulträger zurückgegeben.",
      10,
    ),
    checkbox(48, 324, !hasReturnDefects),
    textLine(64, 325, "Bei Rückgabe des Gerätes waren keine Mängel erkennbar.", 10),
    textLine(48, 292, "Das Gerät wies folgende Mängel auf:", 10, "F2"),
    hasReturnDefects ? textBlock(48, 274, data.returnDefects ?? "", 92, 3) : "",
    textLine(48, 202, "Zur Behebung der Mängel wurden folgende Festlegungen getroffen:", 10, "F2"),
    hasReturnResolutions ? textBlock(48, 184, data.returnResolutions ?? "", 92, 3) : "",
    textLine(48, 106, "Herrnhut,", 10),
    line(110, 106, 260, 106),
    line(336, 106, 548, 106),
    textLine(110, 90, "Ort, Datum", 8),
    textLine(336, 90, "Ort, Datum", 8),
    line(48, 56, 260, 56),
    line(336, 56, 548, 56),
    textLine(48, 40, "für die Schulstiftung der Evang. Brüder-Unität", 8),
    textLine(336, 40, signatureLabel, 8),
  ].filter(Boolean);

  return commands.join("\n");
}

function makePdf(content: string) {
  const stream = Buffer.from(content, "utf8");
  const objects: PdfObject[] = [
    { id: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    {
      id: 3,
      content:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    },
    {
      id: 4,
      content:
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    },
    {
      id: 5,
      content:
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    },
    {
      id: 6,
      content: Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "utf8"),
        stream,
        Buffer.from("\nendstream", "utf8"),
      ]),
    },
  ];
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets: number[] = [0];
  let length = chunks[0].length;

  for (const object of objects) {
    offsets[object.id] = length;
    const objectHeader = Buffer.from(`${object.id} 0 obj\n`, "utf8");
    const objectContent =
      typeof object.content === "string"
        ? Buffer.from(object.content, "utf8")
        : Buffer.from(object.content);
    const objectFooter = Buffer.from("\nendobj\n", "utf8");
    chunks.push(objectHeader, objectContent, objectFooter);
    length += objectHeader.length + objectContent.length + objectFooter.length;
  }

  const xrefOffset = length;
  const xrefLines = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...objects.map(
      (object) => `${String(offsets[object.id]).padStart(10, "0")} 00000 n `,
    ),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ];
  chunks.push(Buffer.from(xrefLines.join("\n"), "utf8"));

  return Buffer.concat(chunks);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setId: string }> },
) {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    return new NextResponse("Keine Berechtigung", { status: 403 });
  }

  const { setId } = await params;
  const supabase = await createClient();
  const { data: setData, error: setError } = await supabase
    .from("inventory_set")
    .select("id,legacy_set_id,storage_label")
    .eq("id", setId)
    .single();

  if (setError || !setData) {
    return new NextResponse("Set nicht gefunden", { status: 404 });
  }

  const [
    componentAssignmentsResult,
    personAssignmentResult,
    supplementalAssignmentsResult,
  ] = await Promise.all([
    supabase
      .from("set_component_assignment")
      .select(
        "role,component:component_id(legacy_inventory_number,manufacturer,model,serial_number)",
      )
      .is("valid_until", null)
      .eq("set_id", setId),
    supabase
      .from("set_person_assignment")
      .select(
        "return_charging_cable_present,return_defects,return_ipad_present,return_keyboard_present,return_note,return_pencil_cap_present,return_pencil_present,return_power_adapter_present,return_resolutions,person:person_id(id,first_name,last_name,email,person_type)",
      )
      .eq("set_id", setId)
      .not("returned_at", "is", null)
      .order("returned_at", { ascending: false })
      .limit(1),
    supabase
      .from("set_supplemental_assignment")
      .select("item_type")
      .eq("set_id", setId),
  ]);

  if (componentAssignmentsResult.error) {
    throw componentAssignmentsResult.error;
  }

  if (personAssignmentResult.error) {
    throw personAssignmentResult.error;
  }

  if (supplementalAssignmentsResult.error) {
    throw supplementalAssignmentsResult.error;
  }

  const componentAssignments = (
    (componentAssignmentsResult.data ?? []) as RawComponentAssignmentRow[]
  ).map((assignment) => ({
    ...assignment,
    component: normalizeJoined(assignment.component),
  }));
  const componentsByRole = new Map<string, ComponentAssignmentRow["component"]>();

  for (const assignment of componentAssignments) {
    componentsByRole.set(assignment.role, assignment.component);
  }

  const returnRequirements: ReturnRequirements = {
    adapter: componentsByRole.has("adapter"),
    hdmiCable: (supplementalAssignmentsResult.data ?? []).some(
      (assignment) => assignment.item_type === "hdmi_cable",
    ),
  };

  const rawPersonAssignment = Array.isArray(personAssignmentResult.data)
    ? ((personAssignmentResult.data[0] ?? null) as RawPersonAssignmentRow | null)
    : (personAssignmentResult.data as RawPersonAssignmentRow | null);
  const person = rawPersonAssignment
    ? normalizeJoined(rawPersonAssignment.person)
    : null;
  const returnChecks = buildReturnChecks(
    rawPersonAssignment
      ? {
          ...rawPersonAssignment,
          person,
        }
      : null,
  );
  let classLabel: string | null = null;

  if (person?.id) {
    const { data: classAssignment } = await supabase
      .from("person_class_assignment")
      .select("school_class:school_class_id(label)")
      .eq("person_id", person.id)
      .is("valid_until", null)
      .maybeSingle();
    const rawClassAssignment = classAssignment as RawClassAssignmentRow | null;
    classLabel = rawClassAssignment
      ? (normalizeJoined(rawClassAssignment.school_class)?.label ?? null)
      : null;
  }

  const content = buildPdfContent({
    classLabel,
    ipad: componentsByRole.get("ipad") ?? null,
    keyboard: componentsByRole.get("keyboard") ?? null,
    pencil: componentsByRole.get("pencil") ?? null,
    person,
    returnDefects: rawPersonAssignment?.return_defects ?? null,
    returnChecks,
    returnRequirements,
    returnResolutions: rawPersonAssignment?.return_resolutions ?? null,
    set: setData as SetRow,
  });
  const pdf = makePdf(content);
  const filename = `Rueckgabeprotokoll-Set-${(setData as SetRow).legacy_set_id}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Type": "application/pdf",
    },
  });
}
