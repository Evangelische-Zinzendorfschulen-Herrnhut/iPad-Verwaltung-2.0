"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

export type PersonenTableRow = {
  classLabel: string | null;
  detailHref: string;
  editHref: string;
  email: string | null;
  id: string;
  jahrgang: number | null;
  name: string;
  personType: string;
  position: number;
  status: string;
};

type PersonenTableProps = {
  canEdit: boolean;
  rows: PersonenTableRow[];
};

type ContextMenuState = {
  detailHref: string;
  editHref: string;
  label: string;
  x: number;
  y: number;
} | null;

export function PersonenTable({ canEdit, rows }: PersonenTableProps) {
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
    row: PersonenTableRow,
  ) {
    event.preventDefault();
    setContextMenu({
      detailHref: row.detailHref,
      editHref: row.editHref,
      label: row.name,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">Nr.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Klasse</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">E-Mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Jahrgang</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-t border-zinc-100 hover:bg-emerald-100"
                key={row.id}
                onContextMenu={(event) => openContextMenu(event, row)}
              >
                <td className="px-4 py-3 tabular-nums text-zinc-500">
                  {row.position}
                </td>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.classLabel ?? "-"}</td>
                <td className="px-4 py-3">{row.personType}</td>
                <td className="px-4 py-3 text-zinc-600">{row.email ?? "-"}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.jahrgang ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-60 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.detailHref}
          >
            Datensatz anzeigen
          </Link>
          {canEdit ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.editHref}
            >
              Datensatz bearbeiten
            </Link>
          ) : null}
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.label}
          </p>
        </div>
      ) : null}
    </>
  );
}
