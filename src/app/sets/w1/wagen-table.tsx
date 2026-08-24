"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

import type { WagenOverviewRow } from "../wagen-overview";

type WagenTableProps = {
  canCreateTasks: boolean;
  canManageSets: boolean;
  rows: WagenOverviewRow[];
};

type ContextMenuState = {
  detailHref: string;
  issueHref: string | null;
  issueLabel: string | null;
  returnHref: string | null;
  setId: string;
  setLabel: string;
  taskHref: string | null;
  x: number;
  y: number;
} | null;

function rowHighlightClass(row: WagenOverviewRow, duplicatePlaces: Set<number>) {
  if (row.storagePlace && duplicatePlaces.has(row.storagePlace)) {
    return "border-amber-200 bg-amber-100 hover:bg-amber-200/70";
  }

  if (row.storagePlace && row.storagePlace % 5 === 0) {
    return "border-t-2 border-t-zinc-300 bg-zinc-50 hover:bg-zinc-100";
  }

  return "border-zinc-100 hover:bg-zinc-50";
}

export function WagenTable({
  canCreateTasks,
  canManageSets,
  rows,
}: WagenTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const storagePlaceCounts = rows.reduce((counts, row) => {
    if (!row.storagePlace) {
      return counts;
    }

    counts.set(row.storagePlace, (counts.get(row.storagePlace) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());
  const duplicatePlaces = new Set(
    [...storagePlaceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([place]) => place),
  );

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
    row: WagenOverviewRow,
  ) {
    event.preventDefault();
    setContextMenu({
      detailHref: row.detailHref,
      issueHref: row.issueHref,
      issueLabel: row.issueLabel,
      returnHref: row.returnHref,
      setId: row.id,
      setLabel: `Set ${row.legacySetId}`,
      taskHref: canCreateTasks ? buildLocalTaskHref(row.id) : null,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function buildLocalIssueHref(setId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("issue", setId);
    nextParams.delete("prepared");
    nextParams.delete("error");

    return `${pathname}?${nextParams.toString()}`;
  }

  function buildLocalTaskHref(setId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("task", setId);
    nextParams.delete("prepared");
    nextParams.delete("error");
    nextParams.delete("task_created");

    return `${pathname}?${nextParams.toString()}`;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Platz</th>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Klasse</th>
              <th className="px-4 py-3 font-medium">iPad</th>
              <th className="px-4 py-3 font-medium">Pencil</th>
              <th className="px-4 py-3 font-medium">Tastatur</th>
              <th className="px-4 py-3 font-medium">Verfügbarkeit</th>
              <th className="px-4 py-3 font-medium">Zustand</th>
              <th className="px-4 py-3 font-medium">Lagerort</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isDuplicatePlace = Boolean(
                row.storagePlace && duplicatePlaces.has(row.storagePlace),
              );

              return (
                <tr
                  className={`border-t ${rowHighlightClass(row, duplicatePlaces)}`}
                  key={row.id}
                  onContextMenu={(event) => openContextMenu(event, row)}
                >
                  <td className="px-4 py-3 font-semibold">
                    {row.storagePlace ?? "-"}
                    {isDuplicatePlace ? (
                      <span className="ml-2 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                        doppelt
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center gap-2 align-middle">
                      <a
                        aria-label={`Set ${row.legacySetId} in Setliste öffnen`}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle transition hover:scale-105"
                        href={row.detailHref}
                        rel="noreferrer"
                        target="_blank"
                        title="Set in Setliste öffnen"
                      >
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="block h-5 w-5"
                          height={20}
                          src="/arrow_right_green.svg"
                          width={20}
                        />
                      </a>
                      <span>{row.legacySetId}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.person ? (
                      row.person
                    ) : row.previousPerson ? (
                      <span className="text-zinc-400">
                        ehemals {row.previousPerson}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.classLabel || "-"}</td>
                  <td className="inventory-number whitespace-nowrap px-4 py-3 align-middle">
                    <span className="inline-flex items-center gap-2 align-middle">
                      <span>{row.ipad || "-"}</span>
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
                  <td className="inventory-number px-4 py-3">
                    {row.pencil || "-"}
                  </td>
                  <td className="inventory-number px-4 py-3">
                    {row.keyboard || "-"}
                  </td>
                  <td className="px-4 py-3">{row.availability}</td>
                  <td className="px-4 py-3">{row.condition}</td>
                  <td className="px-4 py-3">{row.storageLabel || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.detailHref}
          >
            Datensatz anzeigen
          </Link>
          <Link
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            href={contextMenu.detailHref}
            rel="noreferrer"
            target="_blank"
          >
            Set in Setliste öffnen
          </Link>
          {canManageSets && contextMenu.issueHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={
                contextMenu.issueLabel === "Set ausgeben"
                  ? contextMenu.issueHref
                  : buildLocalIssueHref(contextMenu.setId)
              }
            >
              {contextMenu.issueLabel ?? "Set ausgeben"}
            </Link>
          ) : null}
          {canManageSets && contextMenu.returnHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.returnHref}
            >
              Set zurücknehmen
            </Link>
          ) : null}
          {contextMenu.taskHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.taskHref}
            >
              Aufgabe erstellen
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
