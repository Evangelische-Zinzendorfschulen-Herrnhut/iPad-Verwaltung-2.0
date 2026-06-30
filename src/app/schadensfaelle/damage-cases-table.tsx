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
    legacy_set_id: number;
    storage_label: string | null;
  } | null;
  legacy_damage_id: number | null;
  damage_number: number;
  person: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  reported_at: string;
  short_description: string;
  status: string;
};

type DamageCasesTableProps = {
  canManage: boolean;
  cases: DamageCaseListRow[];
};

type ContextMenuState = {
  editHref: string;
  href: string;
  reportHref: string;
  x: number;
  y: number;
} | null;

function formatPerson(person: DamageCaseListRow["person"]) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "-";
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

export function DamageCasesTable({ canManage, cases }: DamageCasesTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

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

    setContextMenu({
      editHref: `${pathname}?${editParams.toString()}`,
      href: `${pathname}?${params.toString()}`,
      reportHref: `/schadensfaelle/${caseId}/report`,
      x: event.clientX,
      y: event.clientY,
    });
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
                className="border-t border-zinc-100 hover:bg-zinc-50"
                key={caseRow.id}
                onContextMenu={(event) => openContextMenu(event, caseRow.id)}
              >
                <td className="w-28 whitespace-nowrap px-4 py-3">
                  {caseRow.reported_at}
                </td>
                <td className="w-52 truncate px-4 py-3">
                  {formatPerson(caseRow.person)}
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
        </div>
      ) : null}
    </>
  );
}
