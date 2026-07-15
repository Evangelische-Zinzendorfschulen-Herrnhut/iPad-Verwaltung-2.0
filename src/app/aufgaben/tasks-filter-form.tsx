"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

type TasksFilterFormProps = {
  hasActiveFilters: boolean;
  priority: string;
  query: string;
  sort: string;
  status: string;
};

export function TasksFilterForm({
  hasActiveFilters,
  priority,
  query,
  sort,
  status,
}: TasksFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const updateUrl = useCallback(
    (nextValues: {
      priority?: string;
      q?: string;
      sort?: string;
      status?: string;
    }) => {
      const params = new URLSearchParams();
      const nextQuery = nextValues.q ?? search;
      const nextStatus = nextValues.status ?? status;
      const nextPriority = nextValues.priority ?? priority;
      const nextSort = nextValues.sort ?? sort;

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextStatus && nextStatus !== "active") {
        params.set("status", nextStatus);
      }

      if (nextPriority) {
        params.set("priority", nextPriority);
      }

      if (nextSort && nextSort !== "due_asc") {
        params.set("sort", nextSort);
      }

      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [pathname, priority, router, search, sort, status],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: search });
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    updateUrl({ [event.target.name]: event.target.value });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== query) {
        updateUrl({ q: search });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, search, updateUrl]);

  return (
    <form
      className="grid gap-3 border-b border-zinc-200 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_160px_150px_190px_auto]"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Suche
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Titel, Beschreibung oder Bezug"
          type="search"
          value={search}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Status
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="status"
          onChange={handleSelectChange}
          value={status}
        >
          <option value="active">Aktive</option>
          <option value="">Alle</option>
          <option value="offen">Offen</option>
          <option value="in_bearbeitung">In Bearbeitung</option>
          <option value="erledigt">Erledigt</option>
          <option value="archiviert">Archiviert</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Prioritaet
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="priority"
          onChange={handleSelectChange}
          value={priority}
        >
          <option value="">Alle</option>
          <option value="hoch">Hoch</option>
          <option value="normal">Normal</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Sortierung
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="sort"
          onChange={handleSelectChange}
          value={sort}
        >
          <option value="due_asc">Faelligkeit aufsteigend</option>
          <option value="due_desc">Faelligkeit absteigend</option>
          <option value="priority_desc">Prioritaet</option>
          <option value="created_desc">Neueste zuerst</option>
          <option value="title_asc">Titel</option>
        </select>
      </label>

      <div className="flex items-end gap-2">
        {isPending ? (
          <span className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500">
            Filtert...
          </span>
        ) : null}
        {hasActiveFilters ? (
          <Link
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
            href="/aufgaben"
          >
            Zuruecksetzen
          </Link>
        ) : null}
      </div>
    </form>
  );
}
