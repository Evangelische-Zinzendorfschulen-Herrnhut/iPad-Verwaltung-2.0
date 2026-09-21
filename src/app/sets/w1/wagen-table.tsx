"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

import {
  ObjectLinkIcon,
  objectLinkIconClassName,
} from "../../object-link-icon";
import { SetAvailabilityBadge } from "../set-availability-badge";
import { SetConditionBadge } from "../set-condition-badge";
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
  storageHref: string | null;
  taskHref: string | null;
  x: number;
  y: number;
} | null;

const CONTEXT_MENU_ITEM_HEIGHT = 36;
const CONTEXT_MENU_PADDING = 8;
const CONTEXT_MENU_FOOTER_HEIGHT = 41;
const CONTEXT_MENU_MARGIN = 8;
const CONTEXT_MENU_WIDTH = 224;

function splitComponentLabel(value: string) {
  const [inventoryNumber, ...details] = value.split(" · ");

  return {
    details: details.join(" · "),
    inventoryNumber,
  };
}

function rowHighlightClass(row: WagenOverviewRow, duplicatePlaces: Set<number>) {
  if (row.storagePlace && duplicatePlaces.has(row.storagePlace)) {
    return "border-amber-200 bg-amber-100 hover:bg-amber-200/70";
  }

  if (row.storagePlace && row.storagePlace % 5 === 0) {
    return "border-t-2 border-t-zinc-300 bg-zinc-50 hover:bg-zinc-100";
  }

  return "border-zinc-100 hover:bg-emerald-100";
}

function clampContextMenuPosition(
  x: number,
  y: number,
  visibleItemCount: number,
) {
  const menuHeight =
    CONTEXT_MENU_PADDING +
    CONTEXT_MENU_FOOTER_HEIGHT +
    visibleItemCount * CONTEXT_MENU_ITEM_HEIGHT;
  const maxX = window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_MARGIN;
  const maxY = window.innerHeight - menuHeight - CONTEXT_MENU_MARGIN;

  return {
    x: Math.max(CONTEXT_MENU_MARGIN, Math.min(x, maxX)),
    y: Math.max(CONTEXT_MENU_MARGIN, Math.min(y, maxY)),
  };
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
    const itemCount = [
      row.detailHref,
      row.detailHref,
      canManageSets && row.issueHref,
      canManageSets && row.returnHref,
      canCreateTasks,
      canManageSets,
    ].filter(Boolean).length;
    const position = clampContextMenuPosition(
      event.clientX,
      event.clientY,
      itemCount,
    );

    setContextMenu({
      detailHref: row.detailHref,
      issueHref: row.issueHref,
      issueLabel: row.issueLabel,
      returnHref: row.returnHref,
      setId: row.id,
      setLabel: `Set ${row.legacySetId}`,
      storageHref: canManageSets ? buildLocalStorageHref(row.id) : null,
      taskHref: canCreateTasks ? buildLocalTaskHref(row.id) : null,
      x: position.x,
      y: position.y,
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

  function buildLocalStorageHref(setId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("setStorage", setId);
    nextParams.delete("prepared");
    nextParams.delete("error");
    nextParams.delete("issued");
    nextParams.delete("task_created");

    return `${pathname}?${nextParams.toString()}`;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1440px] border-collapse text-left text-sm">
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
              const ipad = splitComponentLabel(row.ipad || "-");
              const pencil = splitComponentLabel(row.pencil || "-");
              const keyboard = splitComponentLabel(row.keyboard || "-");

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
                        className={objectLinkIconClassName("set")}
                        href={row.detailHref}
                        rel="noreferrer"
                        target="_blank"
                        title="Set in Setliste öffnen"
                      >
                        <ObjectLinkIcon kind="set" />
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
                  <td className="inventory-number px-4 py-3 align-middle">
                    <span className="inline-flex items-end gap-2 align-middle">
                      <span>
                        <span className="block whitespace-nowrap">
                          {ipad.inventoryNumber}
                        </span>
                        {ipad.details ? (
                          <span className="block whitespace-nowrap">
                            {ipad.details}
                          </span>
                        ) : null}
                      </span>
                      {row.ipadMdmHref ? (
                        <a
                          aria-label={`iPad ${row.ipad} im MDM öffnen`}
                          className={objectLinkIconClassName("mdm")}
                          href={row.ipadMdmHref}
                          rel="noreferrer"
                          target="_blank"
                          title="Im MDM öffnen"
                        >
                          <ObjectLinkIcon kind="mdm" />
                        </a>
                      ) : null}
                    </span>
                  </td>
                  <td className="inventory-number px-4 py-3">
                    <span className="block whitespace-nowrap">
                      {pencil.inventoryNumber}
                    </span>
                    {pencil.details ? (
                      <span className="block whitespace-nowrap">
                        {pencil.details}
                      </span>
                    ) : null}
                  </td>
                  <td className="inventory-number px-4 py-3">
                    <span className="block whitespace-nowrap">
                      {keyboard.inventoryNumber}
                    </span>
                    {keyboard.details ? (
                      <span className="block whitespace-nowrap">
                        {keyboard.details}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <SetAvailabilityBadge value={row.availability} />
                  </td>
                  <td className="px-4 py-3">
                    <SetConditionBadge value={row.condition} />
                  </td>
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
              href={buildLocalIssueHref(contextMenu.setId)}
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
