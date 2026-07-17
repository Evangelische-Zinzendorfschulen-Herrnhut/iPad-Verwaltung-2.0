"use client";

import Image from "next/image";
import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

export type SetsTableRow = {
  availability: string;
  components: SetTaskComponentOption[];
  condition: string;
  damageHref: string | null;
  devicesHref: string;
  detailHref: string;
  id: string;
  ipad: string;
  ipadMdmHref: string | null;
  issueHref: string | null;
  issueLabel: string | null;
  keyboard: string;
  legacySetId: number;
  legacyStatus: string | null;
  pencil: string;
  person: string;
  personHref: string | null;
  previousPerson: string | null;
  previousPersonHref: string | null;
  problemHref: string | null;
  releaseReturnTo: string;
  releasable: boolean;
  returnProtocolHref: string | null;
  returnSetHref: string | null;
  storageHref: string | null;
  storageLabel: string;
};

export type SetTaskComponentOption = {
  id: string;
  label: string;
  role: string;
};

type SetsTableProps = {
  releaseAction: (formData: FormData) => void | Promise<void>;
  rows: SetsTableRow[];
  taskAction: (formData: FormData) => void | Promise<void>;
};

type ContextMenuState = {
  components: SetTaskComponentOption[];
  damageHref: string | null;
  detailHref: string;
  devicesHref: string;
  issueHref: string | null;
  issueLabel: string | null;
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

type TaskDrawerState = {
  components: SetTaskComponentOption[];
  returnTo: string;
  setId: string;
  setLabel: string;
} | null;

export function SetsTable({ releaseAction, rows, taskAction }: SetsTableProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [taskDrawer, setTaskDrawer] = useState<TaskDrawerState>(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (taskDrawer) {
          setTaskDrawer(null);
        } else {
          setContextMenu(null);
        }
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [taskDrawer]);

  function openContextMenu(event: MouseEvent<HTMLTableRowElement>, row: SetsTableRow) {
    event.preventDefault();
    setContextMenu({
      components: row.components,
      damageHref: row.damageHref,
      detailHref: row.detailHref,
      devicesHref: row.devicesHref,
      issueHref: row.issueHref,
      issueLabel: row.issueLabel,
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

  function openTaskDrawer() {
    if (!contextMenu) {
      return;
    }

    setTaskDrawer({
      components: contextMenu.components,
      returnTo: contextMenu.releaseReturnTo,
      setId: contextMenu.setId,
      setLabel: contextMenu.setLabel,
    });
    setContextMenu(null);
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
                    <span className="inline-flex items-center gap-2 align-middle">
                      {row.personHref ? (
                        <Link
                          aria-label={`${row.person} in der Personenliste anzeigen`}
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle transition hover:scale-105"
                          href={row.personHref}
                          title="Person in Personenliste anzeigen"
                        >
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="block h-5 w-5"
                            height={20}
                            src="/arrow_right_green.svg"
                            width={20}
                          />
                        </Link>
                      ) : null}
                      <span>{row.person}</span>
                    </span>
                  ) : row.previousPerson ? (
                    <span className="inline-flex items-center gap-2 align-middle text-zinc-400">
                      {row.previousPersonHref ? (
                        <Link
                          aria-label={`${row.previousPerson} in der Personenliste anzeigen`}
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle opacity-70 transition hover:scale-105 hover:opacity-100"
                          href={row.previousPersonHref}
                          title="Person in Personenliste anzeigen"
                        >
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="block h-5 w-5"
                            height={20}
                            src="/arrow_right_green.svg"
                            width={20}
                          />
                        </Link>
                      ) : null}
                      <span>ehemals {row.previousPerson}</span>
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="inventory-number px-4 py-3 whitespace-nowrap align-middle">
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
                <td className="inventory-number px-4 py-3 whitespace-nowrap">{row.pencil}</td>
                <td className="inventory-number px-4 py-3 whitespace-nowrap">{row.keyboard}</td>
                <td className="px-4 py-3">{row.storageLabel}</td>
                <td className="px-4 py-3">{row.availability}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 align-middle">
                    <Link
                      aria-label={`Geräte von Set ${row.legacySetId} anzeigen`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle transition hover:scale-105"
                      href={row.devicesHref}
                      target="_blank"
                      title="Geräte dieses Sets anzeigen"
                    >
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="block h-5 w-5"
                        height={20}
                        src="/arrow_right_orange.svg"
                        width={20}
                      />
                    </Link>
                    <span>{row.condition}</span>
                  </span>
                </td>
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
            href={contextMenu.devicesHref}
            target="_blank"
          >
            Set in Geräteliste anzeigen
          </Link>
          <div className="my-1 border-t border-zinc-100" />
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
            <>
              <Link
                className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
                href={contextMenu.returnSetHref}
              >
                Set zurücknehmen
              </Link>
            </>
          ) : null}
          {contextMenu.issueHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.issueHref}
            >
              {contextMenu.issueLabel ?? "Set ausgeben"}
            </Link>
          ) : null}
          {contextMenu.damageHref ? (
            <>
              <div className="my-1 border-t border-zinc-100" />
              <Link
                className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
                href={contextMenu.damageHref}
              >
                Schaden/Verlust melden
              </Link>
            </>
          ) : null}
          {contextMenu.problemHref ? (
            <Link
              className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
              href={contextMenu.problemHref}
            >
              Problem melden
            </Link>
          ) : null}
          <div className="my-1 border-t border-zinc-100" />
          <button
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            onClick={openTaskDrawer}
            type="button"
          >
            Aufgabe erstellen
          </button>
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

      {taskDrawer ? (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/25"
          onClick={() => setTaskDrawer(null)}
        >
          <aside
            aria-label={`Aufgabe fuer ${taskDrawer.setLabel} erstellen`}
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
                    {taskDrawer.setLabel}
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
              <input name="set_id" type="hidden" value={taskDrawer.setId} />
              <input name="return_to" type="hidden" value={taskDrawer.returnTo} />

              <div className="grid flex-1 content-start gap-4 overflow-y-auto px-6 py-5">
                <label className="grid gap-1 text-sm font-medium">
                  Bezug
                  <select
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    name="target"
                    defaultValue="set"
                  >
                    <option value="set">Ganzes {taskDrawer.setLabel}</option>
                    {taskDrawer.components.map((component) => (
                      <option
                        key={component.id}
                        value={`component:${component.id}`}
                      >
                        {component.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Titel
                  <input
                    className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    name="title"
                    placeholder="Aufgabe"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Beschreibung
                  <textarea
                    className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
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
