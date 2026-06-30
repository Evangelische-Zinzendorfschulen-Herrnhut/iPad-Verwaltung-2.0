"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

export type AssignmentTableRow = {
  classLabel: string;
  editHref: string;
  id: string;
  issuedAt: string;
  person: string;
  returnComplete: boolean | null;
  returnHref: string | null;
  returnProtocolHref: string | null;
  returnedAt: string;
  setHref: string;
  setLabel: string;
  status: string;
  storageHref: string | null;
  storageLabel: string;
};

type AssignmentsTableProps = {
  rows: AssignmentTableRow[];
};

type ContextMenuState = {
  editHref: string;
  label: string;
  returnHref: string | null;
  returnProtocolHref: string | null;
  storageHref: string | null;
  x: number;
  y: number;
} | null;

export function AssignmentsTable({ rows }: AssignmentsTableProps) {
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
    row: AssignmentTableRow,
  ) {
    event.preventDefault();
    setContextMenu({
      editHref: row.editHref,
      label: `${row.setLabel} · ${row.person}`,
      returnHref: row.returnHref,
      returnProtocolHref: row.returnProtocolHref,
      storageHref: row.storageHref,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Klasse</th>
              <th className="px-4 py-3 font-medium">Lagerort</th>
              <th className="px-4 py-3 font-medium">Ausgabe</th>
              <th className="px-4 py-3 font-medium">Rückgabe</th>
              <th className="px-4 py-3 font-medium">Vollst.</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
                <td className="px-4 py-3 font-semibold">
                  <Link className="hover:underline" href={row.setHref}>
                    {row.setLabel}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.person}</td>
                <td className="px-4 py-3">{row.classLabel}</td>
                <td className="px-4 py-3">{row.storageLabel}</td>
                <td className="px-4 py-3">{row.issuedAt}</td>
                <td className="px-4 py-3">{row.returnedAt}</td>
                <td className="px-4 py-3">
                  {row.returnComplete === null ? (
                    <span className="text-zinc-400">-</span>
                  ) : row.returnComplete ? (
                    <span
                      aria-label="Rückgabe vollständig"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                      title="Rückgabe vollständig"
                    >
                      <FontAwesomeIcon icon={faCircleCheck} />
                    </span>
                  ) : (
                    <span
                      aria-label="Komponenten oder Zubehör fehlen"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-700"
                      title="Komponenten oder Zubehör fehlen"
                    >
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.status === "Aktiv"
                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {row.returnHref ? (
                      <Link
                        className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50"
                        href={row.returnHref}
                      >
                        Zurücknehmen
                      </Link>
                    ) : null}
                    {row.returnProtocolHref ? (
                      <a
                        className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50"
                        href={row.returnProtocolHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Protokoll
                      </a>
                    ) : null}
                    {!row.returnHref && !row.returnProtocolHref ? (
                      <span className="text-zinc-400">-</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-64 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <a
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.editHref}
          >
            Eintrag bearbeiten
          </a>
          {contextMenu.returnHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.returnHref}
            >
              Set zurücknehmen
            </Link>
          ) : null}
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
          {contextMenu.storageHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.storageHref}
            >
              Lagerort ändern
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
