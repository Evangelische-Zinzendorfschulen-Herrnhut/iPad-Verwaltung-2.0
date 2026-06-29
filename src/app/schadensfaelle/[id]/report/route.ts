import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type ReportRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type PdfObject = {
  content: string | Uint8Array;
  id: number;
};

type DamageCaseRow = {
  affected_item: string;
  billing_assessment: string;
  case_type: string;
  damage_number: number;
  detail_description: string | null;
  handler: string | null;
  id: string;
  incident_description: string | null;
  internal_note: string | null;
  legacy_exchange_status: string | null;
  legacy_insurance_warranty: string | null;
  location: string | null;
  occurred_at: string | null;
  reported_at: string;
  replacement_issued_at: string | null;
  short_description: string;
  status: string;
  witnesses: string | null;
  component: {
    category?: string;
    legacy_inventory_number: string;
    model: string | null;
    invoice_position: {
      invoice: {
        invoice_date: string | null;
      } | null;
    } | null;
  } | null;
  inventory_set: {
    id: string;
    legacy_set_id: number;
  } | null;
  person: {
    email: string | null;
    first_name: string | null;
    id: string;
    last_name: string | null;
    person_type: string;
  } | null;
  replacement_component: {
    legacy_inventory_number: string;
    model: string | null;
    invoice_position: {
      invoice: {
        invoice_date: string | null;
      } | null;
    } | null;
  } | null;
  replacement_set: {
    legacy_set_id: number;
  } | null;
};

type RawDamageCaseRow = Omit<
  DamageCaseRow,
  "component" | "inventory_set" | "person" | "replacement_component" | "replacement_set"
> & {
  component: DamageCaseRow["component"] | DamageCaseRow["component"][];
  inventory_set: DamageCaseRow["inventory_set"] | DamageCaseRow["inventory_set"][];
  person: DamageCaseRow["person"] | DamageCaseRow["person"][];
  replacement_component:
    | DamageCaseRow["replacement_component"]
    | DamageCaseRow["replacement_component"][];
  replacement_set:
    | DamageCaseRow["replacement_set"]
    | DamageCaseRow["replacement_set"][];
};

type RawComponentWithInvoice = {
  category?: string;
  legacy_inventory_number: string;
  model: string | null;
  invoice_position?:
    | {
        invoice:
          | {
              invoice_date: string | null;
            }
          | {
              invoice_date: string | null;
            }[]
          | null;
      }
    | {
        invoice:
          | {
              invoice_date: string | null;
            }
          | {
              invoice_date: string | null;
            }[]
          | null;
      }[]
    | null;
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

type SetComponentRow = {
  role: string;
  component: {
    legacy_inventory_number: string;
    model: string | null;
    invoice_position: {
      invoice: {
        invoice_date: string | null;
      } | null;
    } | null;
  } | null;
};

type RawSetComponentRow = Omit<SetComponentRow, "component"> & {
  component: SetComponentRow["component"] | SetComponentRow["component"][];
};

function normalizeJoined<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeComponentWithInvoice<T extends RawComponentWithInvoice>(
  value: T | (T | null)[] | null,
) {
  const component = normalizeJoined(value);

  if (!component) {
    return null;
  }

  const invoicePosition = normalizeJoined(component.invoice_position ?? null);
  const invoice = normalizeJoined(invoicePosition?.invoice ?? null);

  return {
    ...component,
    invoice_position: invoicePosition
      ? {
          ...invoicePosition,
          invoice,
        }
      : null,
  };
}

function personName(person: DamageCaseRow["person"]) {
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

function caseTypeLabel(value: string) {
  const labels: Record<string, string> = {
    schaden: "Schaden",
    technisches_problem: "Technisches Problem",
    verlust: "Verlust",
  };

  return labels[value] ?? value;
}

function affectedItemLabel(value: string) {
  const labels: Record<string, string> = {
    adapter: "Adapter",
    charging_cable: "Kabel",
    component: "Komponente",
    hdmi_cable: "HDMI-Kabel",
    ipad: "iPad",
    keyboard: "Tastatur",
    magic_mouse: "Magic-Maus",
    other: "Sonstiges",
    pencil: "Pencil",
    pencil_cap: "Pencil-Kappe",
    power_adapter: "Netzteil",
    set: "Ganzes Set",
  };

  return labels[value] ?? value;
}

function billingLabel(value: string) {
  const labels: Record<string, string> = {
    abrechenbar: "abrechenbar",
    nicht_abrechenbar: "nicht abrechenbar",
    unklar: "unklar",
  };

  return labels[value] ?? value;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function formatDateTime(value: string | null | undefined) {
  return formatDate(value);
}

function componentLabel(
  component:
    | DamageCaseRow["component"]
    | DamageCaseRow["replacement_component"]
    | SetComponentRow["component"],
) {
  if (!component) {
    return "-";
  }

  const model = component.model ? ` (${component.model})` : "";
  return `${component.legacy_inventory_number}${model}`;
}

function componentPurchaseDate(
  component: DamageCaseRow["component"] | SetComponentRow["component"],
) {
  return component?.invoice_position?.invoice?.invoice_date ?? null;
}

function reportTitle(damageCase: DamageCaseRow) {
  const affected =
    damageCase.affected_item === "component" && damageCase.component
      ? componentLabel(damageCase.component)
      : affectedItemLabel(damageCase.affected_item);

  return `N${String(damageCase.damage_number).padStart(4, "0")} ${affected} - ${personName(damageCase.person)}`;
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

function textBlock(
  x: number,
  y: number,
  text: string,
  maxChars: number,
  maxLines = 3,
  size = 10,
) {
  return wrapText(text || "-", maxChars)
    .slice(0, maxLines)
    .map((lineText, index) => textLine(x, y - index * 12, lineText, size))
    .join("\n");
}

function tableSection(
  commands: string[],
  y: number,
  title: string,
  rows: { label: string; value: string }[],
) {
  const left = 48;
  const right = 548;
  const labelX = 58;
  const valueX = 258;
  const headerHeight = 20;
  const rowHeights = rows.map((row) => {
    const lineCount = Math.max(
      wrapText(row.label, 27).slice(0, 3).length,
      wrapText(row.value || "-", 43).slice(0, 3).length,
    );

    return 22 + Math.max(0, lineCount - 1) * 12;
  });
  const tableBottom =
    y - headerHeight - rowHeights.reduce((sum, height) => sum + height, 0);

  commands.push("0.68 0.67 0.67 rg", `${left} ${y - headerHeight} ${right - left} ${headerHeight} re f`);
  commands.push("1 g", textLine(labelX, y - 14, title, 11, "F2"));
  commands.push("0 g", "0.72 0.72 0.72 RG", line(left, y, right, y), line(left, tableBottom, right, tableBottom));

  rows.forEach((row, index) => {
    const previousRowsHeight = rowHeights
      .slice(0, index)
      .reduce((sum, height) => sum + height, 0);
    const rowHeight = rowHeights[index];
    const rowTop = y - headerHeight - previousRowsHeight;
    const rowBottom = rowTop - rowHeight;

    if (index % 2 === 0) {
      commands.push("0.96 0.96 0.96 rg", `${left} ${rowBottom} ${right - left} ${rowHeight} re f`);
    }

    commands.push("0.86 0.86 0.86 RG", line(left, rowBottom, right, rowBottom), "0 g");
    commands.push(textBlock(labelX, rowTop - 14, row.label, 27, 3, 8));
    commands.push(textBlock(valueX, rowTop - 14, row.value || "-", 43, 3, 8));
  });

  return tableBottom - 8;
}

function buildPdfContent(data: {
  classLabel: string | null;
  damageCase: DamageCaseRow;
  ipadComponent: SetComponentRow["component"];
}) {
  const { classLabel, damageCase, ipadComponent } = data;
  const today = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const replacement = damageCase.replacement_component
    ? componentLabel(damageCase.replacement_component)
    : damageCase.replacement_set
      ? `Set ${damageCase.replacement_set.legacy_set_id}`
      : "nicht erforderlich";
  const processing =
    damageCase.case_type === "schaden" || damageCase.case_type === "verlust"
      ? "Bitte melden sie den Schaden/Verlust ihrer Haftpflichtversicherung und setzten sie sich zur weiteren Bearbeitung mit unserem Sekretariat in Verbindung"
      : damageCase.status === "abgeschlossen"
      ? "Vorgang abgeschlossen."
      : "Weitere Bearbeitung durch iPad-Verwaltung.";

  const commands = [
    "0.92 0.35 0.14 rg",
    textLine(48, 790, "Schadensmeldung", 20, "F2"),
    "0.92 0.35 0.14 RG",
    line(48, 784, 250, 784),
    "0 g",
  ];

  let y = 760;
  y = tableSection(commands, y, "Meldung", [
    { label: "Schadensnummer", value: reportTitle(damageCase) },
    { label: "Bezeichnung", value: caseTypeLabel(damageCase.case_type) },
    { label: "Datum der Schadensmeldung", value: formatDateTime(damageCase.reported_at) },
    { label: "iPad-ID", value: componentLabel(ipadComponent) },
    { label: "Bearbeiter", value: damageCase.handler || "-" },
  ]);

  y = tableSection(commands, y, "Benutzer", [
    { label: personTypeLabel(damageCase.person?.person_type), value: personName(damageCase.person) },
    { label: "E-Mail", value: damageCase.person?.email || "-" },
    { label: "Klasse", value: classLabel || "-" },
  ]);

  y = tableSection(commands, y, "Ersatzgerät", [
    { label: "Ersatzgerät", value: replacement },
    { label: "Ersatz ausgegeben am", value: formatDate(damageCase.replacement_issued_at) },
  ]);

  y = tableSection(commands, y, "Schaden", [
    { label: "Wann ist es genau passiert?", value: formatDateTime(damageCase.occurred_at || damageCase.reported_at) },
    { label: "Wie ist es passiert?", value: damageCase.incident_description || "-" },
    { label: "Was genau ist beschädigt?", value: damageCase.detail_description || "-" },
    { label: "Wo ist es passiert? (Zuhause, Schule)", value: damageCase.location || "-" },
    { label: "Gibt es evtl. Zeugen?", value: damageCase.witnesses || "-" },
  ]);

  y = tableSection(commands, y, "Zusammenfassung", [
    { label: "Schadensart", value: affectedItemLabel(damageCase.affected_item) },
    { label: "Schadenregulierung", value: `${billingLabel(damageCase.billing_assessment)}${damageCase.legacy_insurance_warranty ? ` · Haftung: ${damageCase.legacy_insurance_warranty}` : ""}` },
    { label: "Wie geht es weiter?", value: processing },
    { label: "Anschaffungsdatum", value: formatDate(componentPurchaseDate(damageCase.component) || componentPurchaseDate(ipadComponent)) },
    { label: personTypeLabel(damageCase.person?.person_type), value: `${personName(damageCase.person)}${damageCase.person?.email ? ` (${damageCase.person.email})` : ""}` },
    { label: "Klasse", value: classLabel || "-" },
  ]);

  const signatureY = Math.max(y - 18, 80);
  commands.push(
    "0 g",
    line(48, signatureY, 250, signatureY),
    line(320, signatureY, 548, signatureY),
    textLine(48, signatureY - 14, "Datum, Unterschrift des Schülers", 8),
    textLine(320, signatureY - 14, "Datum, Unterschrift des Personensorgeberechtigten", 8),
    textLine(48, signatureY - 48, `${today} _____________________`, 10),
    line(320, signatureY - 42, 548, signatureY - 42),
    textLine(48, signatureY - 62, "Datum, Unterschrift des Bearbeiters (IT)", 8),
    textLine(320, signatureY - 56, "Datum, Unterschrift der Verwaltung EZSH", 8),
  );

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

export async function GET(_request: Request, { params }: ReportRouteProps) {
  const { id } = await params;
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "buchhaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("damage_case")
    .select(
      "id,damage_number,case_type,affected_item,status,reported_at,occurred_at,replacement_issued_at,short_description,detail_description,incident_description,location,witnesses,handler,internal_note,billing_assessment,legacy_exchange_status,legacy_insurance_warranty,person:person_id(id,first_name,last_name,email,person_type),inventory_set:set_id(id,legacy_set_id),replacement_set:replacement_set_id(legacy_set_id),component:component_id(category,legacy_inventory_number,model,invoice_position:invoice_position_id(invoice:invoice_id(invoice_date))),replacement_component:replacement_component_id(legacy_inventory_number,model)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const rawCase = data as unknown as RawDamageCaseRow;
  const damageCase: DamageCaseRow = {
    ...rawCase,
    component: normalizeComponentWithInvoice(rawCase.component),
    inventory_set: normalizeJoined(rawCase.inventory_set),
    person: normalizeJoined(rawCase.person),
    replacement_component: normalizeJoined(rawCase.replacement_component),
    replacement_set: normalizeJoined(rawCase.replacement_set),
  };
  const [{ data: classData }, { data: componentData }] = await Promise.all([
    damageCase.person?.id && damageCase.person.person_type === "schueler"
      ? supabase
          .from("person_class_assignment")
          .select("school_class:school_class_id(label)")
          .eq("person_id", damageCase.person.id)
          .is("valid_until", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    damageCase.inventory_set?.id
      ? supabase
          .from("set_component_assignment")
          .select("role,component:component_id(legacy_inventory_number,model,invoice_position:invoice_position_id(invoice:invoice_id(invoice_date)))")
          .eq("set_id", damageCase.inventory_set.id)
          .is("valid_until", null)
          .order("role", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  const rawClass = classData as RawClassAssignmentRow | null;
  const classLabel = rawClass
    ? (normalizeJoined(rawClass.school_class)?.label ?? null)
    : null;
  const setComponents = ((componentData ?? []) as unknown as RawSetComponentRow[]).map(
    (componentRow) => ({
      ...componentRow,
      component: normalizeComponentWithInvoice(componentRow.component),
    }),
  );
  const ipadComponent =
    setComponents.find((componentRow) => componentRow.role === "ipad")?.component ??
    (damageCase.component?.category === "ipad" ? damageCase.component : null);
  const pdf = makePdf(
    buildPdfContent({
      classLabel,
      damageCase,
      ipadComponent,
    }),
  );
  const filename = `Schadensbericht-${damageCase.damage_number}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Type": "application/pdf",
    },
  });
}
