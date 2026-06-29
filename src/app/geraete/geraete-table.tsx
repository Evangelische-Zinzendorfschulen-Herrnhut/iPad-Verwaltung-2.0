"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

export type GeraeteTableRow = {
  assignmentLabel: string;
  categoryLabel: string;
  condition: string;
  conditionLabel: string;
  editHref: string | null;
  id: string;
  inventoryNumberSetPart: string | null;
  legacyInventoryNumber: string;
  legacySetNumber: number | null;
  legacyStatus: string | null;
  manufacturerModel: string;
  serialNumber: string | null;
  setLabel: string;
  storageLabel: string;
};

type GeraeteTableProps = {
  canEditComponents: boolean;
  completeRepairAction: (formData: FormData) => void | Promise<void>;
  rows: GeraeteTableRow[];
};

type ContextMenuState = {
  componentId: string;
  condition: string;
  editHref: string | null;
  inventoryNumber: string;
  x: number;
  y: number;
} | null;

export function GeraeteTable({
  canEditComponents,
  completeRepairAction,
  rows,
}: GeraeteTableProps) {
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
    row: GeraeteTableRow,
  ) {
    if (!canEditComponents) {
      return;
    }

    event.preventDefault();
    setContextMenu({
      componentId: row.id,
      condition: row.condition,
      editHref: row.editHref,
      inventoryNumber: row.legacyInventoryNumber,
      x: event.clientX,
      y: event.clientY,
    });
  }

  const returnTo = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Inventarnummer</th>
              <th className="px-4 py-3 font-medium">Kategorie</th>
              <th className="px-4 py-3 font-medium">Hersteller / Modell</th>
              <th className="px-4 py-3 font-medium">Zustand</th>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Zuordnung</th>
              <th className="px-4 py-3 font-medium">Lagerort</th>
              <th className="px-4 py-3 font-medium">Legacy</th>
              {canEditComponents ? (
                <th className="px-4 py-3 font-medium">Aktion</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-t border-zinc-100 hover:bg-zinc-50"
                key={row.id}
                onContextMenu={(event) => openContextMenu(event, row)}
              >
                <td className="whitespace-nowrap px-4 py-3 font-semibold">
                  {row.legacyInventoryNumber}
                </td>
                <td className="px-4 py-3">{row.categoryLabel}</td>
                <td className="px-4 py-3">
                  {row.manufacturerModel || "-"}
                  {row.serialNumber ? (
                    <span className="mt-1 block text-xs text-zinc-500">
                      SN: {row.serialNumber}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.conditionLabel}</td>
                <td className="px-4 py-3">{row.setLabel}</td>
                <td className="px-4 py-3">{row.assignmentLabel}</td>
                <td className="px-4 py-3">{row.storageLabel}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.legacyStatus ?? "-"}
                  {row.legacySetNumber ? (
                    <span className="block text-xs">
                      Legacy-Set {row.legacySetNumber}
                    </span>
                  ) : null}
                  {!row.legacySetNumber && row.inventoryNumberSetPart ? (
                    <span className="block text-xs">
                      Inv.-Nr.-Set {row.inventoryNumberSetPart}
                    </span>
                  ) : null}
                </td>
                {canEditComponents ? (
                  <td className="px-4 py-3">
                    {row.editHref ? (
                      <Link
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                        href={row.editHref}
                      >
                        Bearbeiten
                      </Link>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-60 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.editHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.editHref}
            >
              Datensatz bearbeiten
            </Link>
          ) : null}
          {contextMenu.condition === "defekt" ? (
            <form action={completeRepairAction}>
              <input
                name="component_id"
                type="hidden"
                value={contextMenu.componentId}
              />
              <input name="return_to" type="hidden" value={returnTo} />
              <button
                className="w-full rounded px-3 py-2 text-left font-medium text-emerald-800 hover:bg-emerald-50"
                type="submit"
              >
                Umtausch/Reparatur abschließen
              </button>
            </form>
          ) : (
            <p className="px-3 py-2 text-zinc-500">
              Umtausch/Reparatur nur bei defekten Geräten
            </p>
          )}
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.inventoryNumber}
          </p>
        </div>
      ) : null}
    </>
  );
}
