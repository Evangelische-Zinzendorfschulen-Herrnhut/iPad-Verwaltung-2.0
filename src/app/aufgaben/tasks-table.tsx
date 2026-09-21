"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

import {
  ObjectLinkIcon,
  objectLinkIconClassName,
} from "../object-link-icon";

type TaskStatus = "offen" | "in_bearbeitung" | "erledigt" | "archiviert";
type TaskPriority = "normal" | "hoch";

export type TaskListRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  related_object_href: string | null;
  related_object_label: string | null;
  related_links: Array<{
    description: string;
    href: string;
    label: string;
    meta?: string;
  }>;
  completed_at: string | null;
  created_at: string;
  created_by_user: {
    email: string;
  } | null;
  completed_by_user: {
    email: string;
  } | null;
};

type TasksTableProps = {
  returnTo: string;
  rows: TaskListRow[];
  updateAction: (formData: FormData) => void | Promise<void>;
  updateStatusAction: (formData: FormData) => void | Promise<void>;
};

type ContextMenuState = {
  task: TaskListRow;
  x: number;
  y: number;
} | null;

type DrawerState =
  | {
      task: TaskListRow;
    }
  | null;

function statusLabel(value: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    archiviert: "Archiviert",
    erledigt: "Erledigt",
    in_bearbeitung: "In Bearbeitung",
    offen: "Offen",
  };

  return labels[value];
}

function priorityLabel(value: TaskPriority) {
  return value === "hoch" ? "Hoch" : "Normal";
}

function relatedObjectLabel(type: string | null) {
  const labels: Record<string, string> = {
    ausleihe: "Ausleihe",
    komponente: "Komponente",
    person: "Person",
    schadensfall: "Schadensfall",
    set: "Set",
    zahlungsforderung: "Zahlungsforderung",
  };

  return type ? (labels[type] ?? type) : "-";
}

function objectLinkKindFromType(type: string | null) {
  if (type === "person") {
    return "person";
  }

  if (type === "set") {
    return "set";
  }

  if (type === "komponente") {
    return "devices";
  }

  if (type === "schadensfall") {
    return "damage";
  }

  return null;
}

function objectLinkKindFromLabel(label: string) {
  if (label.includes("Person")) {
    return "person";
  }

  if (label === "Setliste") {
    return "set";
  }

  if (label === "Geräteliste") {
    return "devices";
  }

  if (label === "Schadensfälle") {
    return "damage";
  }

  return null;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

function isOverdue(task: TaskListRow) {
  if (!task.due_date || task.status === "erledigt" || task.status === "archiviert") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${task.due_date}T00:00:00`);

  return dueDate < today;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
        {value || "-"}
      </dd>
    </div>
  );
}

function RelatedObjectField({ task }: { task: TaskListRow }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Betroffenes Objekt
      </dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {task.related_object_href && task.related_object_label ? (
          <span className="inline-flex items-center gap-2 align-middle">
            {objectLinkKindFromType(task.related_object_type) ? (
              <Link
                aria-label={`${task.related_object_label} anzeigen`}
                className={objectLinkIconClassName(
                  objectLinkKindFromType(task.related_object_type)!,
                )}
                href={task.related_object_href}
                rel="noreferrer"
                target="_blank"
                title={`${relatedObjectLabel(task.related_object_type)} anzeigen`}
              >
                <ObjectLinkIcon
                  kind={objectLinkKindFromType(task.related_object_type)!}
                />
              </Link>
            ) : null}
            <Link
              className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
              href={task.related_object_href}
              rel="noreferrer"
              target="_blank"
            >
              {task.related_object_label}
            </Link>
          </span>
        ) : (
          <span className="text-zinc-900">
            {task.related_object_id ?? "-"}
          </span>
        )}
      </dd>
    </div>
  );
}

function RelatedLinks({ task }: { task: TaskListRow }) {
  const linkGroups = Array.from(
    task.related_links.reduce((groups, link) => {
      const links = groups.get(link.label) ?? [];
      links.push(link);
      groups.set(link.label, links);
      return groups;
    }, new Map<string, TaskListRow["related_links"]>()),
  );

  return (
    <section className="border-t border-zinc-200 px-6 py-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-950">Verknüpfungen</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Zugeordnete Datensätze in der Verwaltung
        </p>
      </div>

      {task.related_links.length > 0 ? (
        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          {linkGroups.map(([label, links]) => (
            <div className="py-3" key={label}>
              <p className="text-xs font-medium uppercase text-zinc-500">
                {label}
              </p>
              <div className="mt-1 grid gap-1">
                {links.map((link) => (
                  <div
                    className="flex min-h-10 items-center gap-2 py-1 text-sm"
                    key={link.href}
                  >
                    {objectLinkKindFromLabel(link.label) ? (
                      <Link
                        aria-label={`${link.description} anzeigen`}
                        className={objectLinkIconClassName(
                          objectLinkKindFromLabel(link.label)!,
                        )}
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                        title={`${link.label} anzeigen`}
                      >
                        <ObjectLinkIcon
                          kind={objectLinkKindFromLabel(link.label)!}
                        />
                      </Link>
                    ) : null}
                    <span className="min-w-0">
                      <Link
                        className="block break-words font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.description}
                      </Link>
                      {link.meta ? (
                        <span className="mt-1 block text-xs text-zinc-600">
                          {link.meta}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-y border-zinc-200 py-4 text-sm text-zinc-500">
          Keine weiteren Verknüpfungen vorhanden.
        </p>
      )}
    </section>
  );
}

export function TasksTable({
  returnTo,
  rows,
  updateAction,
  updateStatusAction,
}: TasksTableProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (drawer) {
          setDrawer(null);
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
  }, [drawer]);

  function openContextMenu(event: MouseEvent<HTMLTableRowElement>, task: TaskListRow) {
    event.preventDefault();
    setContextMenu({
      task,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openDrawer() {
    if (!contextMenu) {
      return;
    }

    setDrawer({ task: contextMenu.task });
    setContextMenu(null);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="w-44 px-4 py-3 font-medium">ID</th>
              <th className="w-36 px-4 py-3 font-medium">Faelligkeit</th>
              <th className="w-28 px-4 py-3 font-medium">Prioritaet</th>
              <th className="w-40 px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aufgabe</th>
              <th className="w-40 px-4 py-3 font-medium">Fachbezug</th>
              <th className="w-44 px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((task) => {
                const overdue = isOverdue(task);

                return (
                  <tr
                    className="border-t border-zinc-100 hover:bg-emerald-100"
                    key={task.id}
                    onContextMenu={(event) => openContextMenu(event, task)}
                  >
                    <td className="w-44 break-all px-4 py-3 font-mono text-xs text-zinc-600">
                      {task.id}
                    </td>
                    <td className="w-36 px-4 py-3">
                      <span
                        className={
                          overdue
                            ? "font-semibold text-red-700"
                            : "text-zinc-700"
                        }
                      >
                        {formatDate(task.due_date)}
                      </span>
                    </td>
                    <td className="w-28 px-4 py-3">
                      <span
                        className={
                          task.priority === "hoch"
                            ? "rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900"
                            : "text-zinc-600"
                        }
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="w-40 px-4 py-3">
                      {statusLabel(task.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{task.title}</div>
                      {task.description ? (
                        <div className="mt-1 truncate text-zinc-500">
                          {task.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="w-40 px-4 py-3">
                      {relatedObjectLabel(task.related_object_type)}
                    </td>
                    <td className="w-44 px-4 py-3">
                      <form
                        action={updateStatusAction}
                        className="flex items-center gap-2"
                      >
                        <input name="id" type="hidden" value={task.id} />
                        <input name="return_to" type="hidden" value={returnTo} />
                        <select
                          className="min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-xs outline-none ring-emerald-500 transition focus:ring-2"
                          defaultValue={task.status}
                          name="status"
                        >
                          <option value="offen">Offen</option>
                          <option value="in_bearbeitung">In Bearbeitung</option>
                          <option value="erledigt">Erledigt</option>
                          <option value="archiviert">Archiviert</option>
                        </select>
                        <button className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50">
                          Speichern
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={7}>
                  Keine Aufgaben gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-48 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="block w-full rounded px-3 py-2 text-left font-medium hover:bg-zinc-100"
            onClick={() => openDrawer()}
            type="button"
          >
            Aufgabe bearbeiten
          </button>
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.task.title}
          </p>
        </div>
      ) : null}

      {drawer ? (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/25"
          onClick={() => setDrawer(null)}
        >
          <aside
            aria-label="Aufgabe bearbeiten"
            className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="border-b border-zinc-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                    Aufgabe bearbeiten
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {drawer.task.title}
                  </h2>
                </div>
                <button
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold transition hover:bg-zinc-50"
                  onClick={() => setDrawer(null)}
                  type="button"
                >
                  Schließen
                </button>
              </div>
            </header>

            <form action={updateAction} className="flex flex-1 flex-col">
                <input name="id" type="hidden" value={drawer.task.id} />
                <input name="return_to" type="hidden" value={returnTo} />

                <div className="grid content-start gap-4 px-6 py-5">
                  <label className="grid gap-1 text-sm font-medium">
                    Titel
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={drawer.task.title}
                      name="title"
                      required
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-medium">
                    Beschreibung
                    <textarea
                      className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={drawer.task.description ?? ""}
                      name="description"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm font-medium">
                      Status
                      <select
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={drawer.task.status}
                        name="status"
                      >
                        <option value="offen">Offen</option>
                        <option value="in_bearbeitung">In Bearbeitung</option>
                        <option value="erledigt">Erledigt</option>
                        <option value="archiviert">Archiviert</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm font-medium">
                      Priorität
                      <select
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={drawer.task.priority}
                        name="priority"
                      >
                        <option value="normal">Normal</option>
                        <option value="hoch">Hoch</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm font-medium">
                      Fällig am
                      <input
                        className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={drawer.task.due_date ?? ""}
                        name="due_date"
                        type="date"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField
                      label="Fachbezug"
                      value={relatedObjectLabel(drawer.task.related_object_type)}
                    />
                    <RelatedObjectField task={drawer.task} />
                  </div>

                </div>

                <RelatedLinks task={drawer.task} />
                <div className="flex-1" />

                <footer className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
                  <button
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                    onClick={() => setDrawer(null)}
                    type="button"
                  >
                    Abbrechen
                  </button>
                  <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                    Speichern
                  </button>
                </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
