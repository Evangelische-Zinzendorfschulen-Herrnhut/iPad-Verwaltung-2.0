"use client";

import Image from "next/image";
import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

export type SetsTableRow = {
  availability: string;
  condition: string;
  damageHref: string | null;
  detailHref: string;
  id: string;
  ipad: string;
  ipadMdmHref: string | null;
  issueHref: string | null;
  keyboard: string;
  legacySetId: number;
  legacyStatus: string | null;
  pencil: string;
  person: string;
  previousPerson: string | null;
  problemHref: string | null;
  releaseReturnTo: string;
  releasable: boolean;
  returnProtocolHref: string | null;
  returnSetHref: string | null;
  storageHref: string | null;
  storageLabel: string;
};

type SetsTableProps = {
  releaseAction: (formData: FormData) => void | Promise<void>;
  rows: SetsTableRow[];
};

type ContextMenuState = {
  damageHref: string | null;
  detailHref: string;
  issueHref: string | null;
  problemHref: string | null;
  releaseReturnTo: string;
  releasable: boolean;
  returnProtocolHref: string | null;
  returnSetHref: string | null;
  setId: string;
  setLabel: string;
  storageHref: string | null;
  x: number;
  y: number;
} | null;

export function SetsTable({ releaseAction, rows }: SetsTableProps) {
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
      detailHref: row.detailHref,
      issueHref: row.issueHref,
      problemHref: row.problemHref,
      releaseReturnTo: row.releaseReturnTo,
      releasable: row.releasable,
      returnProtocolHref: row.returnProtocolHref,
      returnSetHref: row.returnSetHref,
      setId: row.id,
      setLabel: `Set ${row.legacySetId}`,
      storageHref: row.storageHref,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">iPad</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Pencil</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Tastatur</th>
              <th className="px-4 py-3 font-medium">Lagerort</th>
              <th className="px-4 py-3 font-medium">Verfuegbarkeit</th>
              <th className="px-4 py-3 font-medium">Zustand</th>
              <th className="px-4 py-3 font-medium">Legacy</th>
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
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  <span className="inline-flex items-center gap-2 align-middle">
                    <span>{row.ipad}</span>
                    {row.ipadMdmHref ? (
                      <a
                        aria-label={`iPad ${row.ipad} im MDM öffnen`}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle transition hover:scale-105"
                        href={row.ipadMdmHref}
                        rel="noreferrer"
                        target="_blank"
                        title="Im MDM öffnen"
                      >
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="block h-5 w-5"
                          height={20}
                          src="/arrow_right.svg"
                          width={20}
                        />
                      </a>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{row.pencil}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.keyboard}</td>
                <td className="px-4 py-3">{row.storageLabel}</td>
                <td className="px-4 py-3">{row.availability}</td>
                <td className="px-4 py-3">{row.condition}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.legacyStatus ?? "-"}
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
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.detailHref}
          >
            Datensatz anzeigen
          </Link>
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
          {contextMenu.issueHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.issueHref}
            >
              Set ausgeben
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
          {contextMenu.releasable ? (
            <form action={releaseAction}>
              <input name="set_id" type="hidden" value={contextMenu.setId} />
              <input
                name="return_to"
                type="hidden"
                value={contextMenu.releaseReturnTo}
              />
              <button className="block w-full rounded px-3 py-2 text-left font-medium text-emerald-700 hover:bg-emerald-50">
                Zurücksetzen und freigeben
              </button>
            </form>
          ) : null}
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.setLabel}
          </p>
        </div>
      ) : null}
    </>
  );
}
