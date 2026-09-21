"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

export type DamageCaseListRow = {
  id: string;
  affected_item: string;
  billing_assessment: string;
  case_type: string;
  component: {
    legacy_inventory_number: string;
    model: string | null;
  } | null;
  import_hint: string | null;
  inventory_set: {
    id: string;
    legacy_set_id: number;
    storage_label: string | null;
  } | null;
  legacy_damage_id: number | null;
  damage_number: number;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
  personClassLabel: string | null;
  previousPerson: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
  previousPersonClassLabel: string | null;
  reported_at: string;
  short_description: string;
  status: string;
};

type DamageCasesTableProps = {
  canManage: boolean;
  cases: DamageCaseListRow[];
  taskAction: (formData: FormData) => void | Promise<void>;
};

type ContextMenuState = {
  damageCaseId: string;
  damageNumber: number;
  editHref: string;
  href: string;
  reportHref: string;
  returnTo: string;
  setLabel: string | null;
  storageHref: string | null;
  summary: string;
  x: number;
  y: number;
} | null;

type TaskDrawerState = {
  damageCaseId: string;
  damageNumber: number;
  returnTo: string;
  summary: string;
} | null;

function personTypeLabel(value: string) {
  const labels: Record<string, string> = {
    lehrer: "Lehrer",
    mitarbeiter: "Mitarbeiter",
    praktikant: "Praktikant",
    referendar: "Referendar",
    schueler: "Schüler",
  };

  return labels[value] ?? value;
}

function formatPerson(
  person: DamageCaseListRow["person"],
  schoolClassLabel: string | null,
) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  const label = name || person.email || "-";
  const suffix =
    person.person_type === "schueler"
      ? schoolClassLabel
      : personTypeLabel(person.person_type);

  return suffix ? `${label} (${suffix})` : label;
}

function formatSet(set: DamageCaseListRow["inventory_set"]) {
  return set ? String(set.legacy_set_id) : "-";
}

function formatStorage(set: DamageCaseListRow["inventory_set"]) {
  return set?.storage_label || "-";
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

export function DamageCasesTable({
  canManage,
  cases,
  taskAction,
}: DamageCasesTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [taskDrawer, setTaskDrawer] = useState<TaskDrawerState>(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function openContextMenu(
    event: MouseEvent<HTMLTableRowElement>,
    caseId: string,
  ) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("detail", caseId);
    params.delete("edit");
    const editParams = new URLSearchParams(searchParams.toString());
    editParams.set("edit", caseId);
    editParams.delete("detail");
    const storageParams = new URLSearchParams(searchParams.toString());
    const caseRow = cases.find((row) => row.id === caseId) ?? null;
    const returnTo = `${pathname}?${searchParams.toString()}`;

    if (canManage && caseRow?.inventory_set) {
      storageParams.set("storage", caseRow.inventory_set.id);
      storageParams.delete("detail");
      storageParams.delete("edit");
    }

    setContextMenu({
      damageCaseId: caseId,
      damageNumber: caseRow?.damage_number ?? 0,
      editHref: `${pathname}?${editParams.toString()}`,
      href: `${pathname}?${params.toString()}`,
      reportHref: `/schadensfaelle/${caseId}/report`,
      returnTo,
      setLabel: caseRow?.inventory_set
        ? `Set ${caseRow.inventory_set.legacy_set_id}`
        : null,
      storageHref: canManage && caseRow?.inventory_set
        ? `${pathname}?${storageParams.toString()}`
        : null,
      summary: caseRow?.short_description ?? "",
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openTaskDrawer() {
    if (!contextMenu) {
      return;
    }

    setTaskDrawer({
      damageCaseId: contextMenu.damageCaseId,
      damageNumber: contextMenu.damageNumber,
      returnTo: contextMenu.returnTo,
      summary: contextMenu.summary,
    });
    setContextMenu(null);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="w-28 whitespace-nowrap px-4 py-3 font-medium">
                Datum
              </th>
              <th className="w-52 px-4 py-3 font-medium">Person</th>
              <th className="w-20 px-4 py-3 font-medium">Set</th>
              <th className="w-32 px-4 py-3 font-medium">Lagerort</th>
              <th className="w-32 px-4 py-3 font-medium">Art</th>
              <th className="w-36 px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Beschreibung</th>
              <th className="w-20 px-4 py-3 font-medium">Nr.</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((caseRow) => (
              <tr
                className="border-t border-zinc-100 hover:bg-emerald-100"
                key={caseRow.id}
                onContextMenu={(event) => openContextMenu(event, caseRow.id)}
              >
                <td className="w-28 whitespace-nowrap px-4 py-3">
                  {caseRow.reported_at}
                </td>
                <td className="w-52 truncate px-4 py-3">
                  {caseRow.person ? (
                    formatPerson(caseRow.person, caseRow.personClassLabel)
                  ) : caseRow.previousPerson ? (
                    <span className="text-zinc-400">
                      ehemals{" "}
                      {formatPerson(
                        caseRow.previousPerson,
                        caseRow.previousPersonClassLabel,
                      )}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="w-20 px-4 py-3">{formatSet(caseRow.inventory_set)}</td>
                <td className="w-32 truncate px-4 py-3">
                  {formatStorage(caseRow.inventory_set)}
                </td>
                <td className="px-4 py-3">
                  {affectedItemLabel(caseRow.affected_item)}
                </td>
                <td className="w-36 px-4 py-3">{caseRow.status}</td>
                <td className="truncate px-4 py-3">{caseRow.short_description}</td>
                <td className="w-20 px-4 py-3 font-semibold">
                  {caseRow.damage_number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-48 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.href}
          >
            Datensatz anzeigen
          </Link>
          {canManage ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.editHref}
            >
              Datensatz bearbeiten
            </Link>
          ) : null}
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.reportHref}
            target="_blank"
          >
            Schadensbericht PDF
          </Link>
          {contextMenu.storageHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.storageHref}
            >
              Lagerort ändern
            </Link>
          ) : null}
          {canManage ? (
            <>
              <div className="my-1 border-t border-zinc-100" />
              <button
                className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
                onClick={openTaskDrawer}
                type="button"
              >
                Aufgabe erstellen
              </button>
            </>
          ) : null}
          {contextMenu.setLabel ? (
            <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
              {contextMenu.setLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {taskDrawer ? (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/25"
          onClick={() => setTaskDrawer(null)}
        >
          <aside
            aria-label={`Aufgabe fuer Schadensfall ${taskDrawer.damageNumber} erstellen`}
            className="ml-auto flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="border-b border-zinc-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                    Aufgabe erstellen
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    Schadensfall {taskDrawer.damageNumber}
                  </h2>
                </div>
                <button
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold transition hover:bg-zinc-50"
                  onClick={() => setTaskDrawer(null)}
                  type="button"
                >
                  Schließen
                </button>
              </div>
            </header>

            <form action={taskAction} className="flex flex-1 flex-col">
              <input
                name="damage_case_id"
                type="hidden"
                value={taskDrawer.damageCaseId}
              />
              <input name="return_to" type="hidden" value={taskDrawer.returnTo} />

              <div className="grid flex-1 content-start gap-4 overflow-y-auto px-6 py-5">
                <label className="grid gap-1 text-sm font-medium">
                  Titel
                  <input
                    className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={`Schadensfall ${taskDrawer.damageNumber} nachhalten`}
                    name="title"
                    placeholder="Aufgabe"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Beschreibung
                  <textarea
                    className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={taskDrawer.summary}
                    name="description"
                    placeholder="Optional"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">
                    Priorität
                    <select
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      name="priority"
                      defaultValue="normal"
                    >
                      <option value="normal">Normal</option>
                      <option value="hoch">Hoch</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-medium">
                    Fällig
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      name="due_date"
                      type="date"
                    />
                  </label>
                </div>
              </div>

              <footer className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
                <button
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  onClick={() => setTaskDrawer(null)}
                  type="button"
                >
                  Abbrechen
                </button>
                <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Aufgabe anlegen
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
