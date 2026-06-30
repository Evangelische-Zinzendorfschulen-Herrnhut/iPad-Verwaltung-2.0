"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

export type SetsTableRow = {
  availability: string;
  condition: string;
  damageHref: string | null;
  id: string;
  ipad: string;
  keyboard: string;
  legacySetId: number;
  legacyStatus: string | null;
  pencil: string;
  person: string;
  previousPerson: string | null;
  problemHref: string | null;
  returnProtocolHref: string | null;
  returnSetHref: string | null;
  storageHref: string | null;
  storageLabel: string;
};

type SetsTableProps = {
  rows: SetsTableRow[];
};

type ContextMenuState = {
  damageHref: string | null;
  problemHref: string | null;
  returnProtocolHref: string | null;
  returnSetHref: string | null;
  setLabel: string;
  storageHref: string | null;
  x: number;
  y: number;
} | null;

export function SetsTable({ rows }: SetsTableProps) {
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

  function openContextMenu(event: MouseEvent<HTMLTableRowElement>, row: SetsTableRow) {
    event.preventDefault();
    setContextMenu({
      damageHref: row.damageHref,
      problemHref: row.problemHref,
      returnProtocolHref: row.returnProtocolHref,
      returnSetHref: row.returnSetHref,
      setLabel: `Set ${row.legacySetId}`,
      storageHref: row.storageHref,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">iPad</th>
              <th className="px-4 py-3 font-medium">Pencil</th>
              <th className="px-4 py-3 font-medium">Tastatur</th>
              <th className="px-4 py-3 font-medium">Lagerort</th>
              <th className="px-4 py-3 font-medium">Verfuegbarkeit</th>
              <th className="px-4 py-3 font-medium">Zustand</th>
              <th className="px-4 py-3 font-medium">Legacy</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-t border-zinc-100 hover:bg-zinc-50"
                key={row.id}
                onContextMenu={(event) => openContextMenu(event, row)}
              >
                <td className="px-4 py-3 font-semibold">{row.legacySetId}</td>
                <td className="px-4 py-3">
                  {row.person !== "-" ? (
                    row.person
                  ) : row.previousPerson ? (
                    <span className="text-zinc-400">
                      ehemals {row.previousPerson}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">{row.ipad}</td>
                <td className="px-4 py-3">{row.pencil}</td>
                <td className="px-4 py-3">{row.keyboard}</td>
                <td className="px-4 py-3">{row.storageLabel}</td>
                <td className="px-4 py-3">{row.availability}</td>
                <td className="px-4 py-3">{row.condition}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.legacyStatus ?? "-"}
                </td>
                <td className="px-4 py-3">
                  {row.damageHref ? (
                    <Link
                      className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50"
                      href={row.damageHref}
                    >
                      Schaden/Verlust
                    </Link>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-64 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.returnProtocolHref ? (
            <a
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.returnProtocolHref}
              rel="noreferrer"
              target="_blank"
            >
              Rückgabeprotokoll als PDF
            </a>
          ) : null}
          {contextMenu.returnSetHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.returnSetHref}
            >
              Set zurücknehmen
            </Link>
          ) : null}
          {contextMenu.damageHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.damageHref}
            >
              Schaden/Verlust melden
            </Link>
          ) : null}
          {contextMenu.problemHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.problemHref}
            >
              Problem melden
            </Link>
          ) : null}
          {contextMenu.storageHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.storageHref}
            >
              Lagerort ändern
            </Link>
          ) : null}
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.setLabel}
          </p>
        </div>
      ) : null}
    </>
  );
}
