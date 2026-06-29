"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

type AssignmentFilterFormProps = {
  classFilter: string;
  classOptions: string[];
  hasActiveFilters: boolean;
  query: string;
  returnedFrom: string;
  sort: string;
  status: string;
  to: string;
};

export function AssignmentFilterForm({
  classFilter,
  classOptions,
  hasActiveFilters,
  query,
  returnedFrom,
  sort,
  status,
  to,
}: AssignmentFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const buildSearchParams = useCallback(
    (nextValues: {
      class?: string;
      q?: string;
      returned_from?: string;
      sort?: string;
      status?: string;
      to?: string;
    }) => {
      const params = new URLSearchParams();
      const nextQuery = nextValues.q ?? search;
      const nextStatus = nextValues.status ?? status;
      const nextClass = nextValues.class ?? classFilter;
      const nextTo = nextValues.to ?? to;
      const nextReturnedFrom = nextValues.returned_from ?? returnedFrom;
      const nextSort = nextValues.sort ?? sort;

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextStatus && nextStatus !== "returned") {
        params.set("status", nextStatus);
      }

      if (nextClass) {
        params.set("class", nextClass);
      }

      if (nextTo) {
        params.set("to", nextTo);
      }

      if (nextReturnedFrom) {
        params.set("returned_from", nextReturnedFrom);
      }

      if (nextSort && nextSort !== "returned_desc") {
        params.set("sort", nextSort);
      }

      return params;
    },
    [classFilter, returnedFrom, search, sort, status, to],
  );
  const updateUrl = useCallback(
    (nextValues: {
      class?: string;
      q?: string;
      returned_from?: string;
      sort?: string;
      status?: string;
      to?: string;
    }) => {
      const params = buildSearchParams(nextValues);
      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [buildSearchParams, pathname, router],
  );
  const exportParams = buildSearchParams({});
  const exportHref = exportParams.toString()
    ? `/ausgaben/export.xlsx?${exportParams.toString()}`
    : "/ausgaben/export.xlsx";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: search });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    if (name === "q") {
      setSearch(value);
      return;
    }

    updateUrl({ [name]: value });
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
      className="space-y-3 border-b border-zinc-200 px-4 py-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Suche
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            name="q"
            onChange={handleInputChange}
            placeholder="Name, E-Mail oder Set"
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
            <option value="all">Alle</option>
            <option value="active">Aktiv</option>
            <option value="returned">Zurückgegeben</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Klasse
          <select
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            name="class"
            onChange={handleSelectChange}
            value={classFilter}
          >
            <option value="">Alle</option>
            {classOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Ausgabe bis
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            name="to"
            onChange={handleInputChange}
            type="date"
            value={to}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Rückgabe ab
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            name="returned_from"
            onChange={handleInputChange}
            type="date"
            value={returnedFrom}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium sm:w-64">
          Sortierung
          <select
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            name="sort"
            onChange={handleSelectChange}
            value={sort}
          >
            <option value="issued_asc">Ausgabedatum aufsteigend</option>
            <option value="returned_desc">Rückgabedatum absteigend</option>
            <option value="name_asc">Name aufsteigend</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {isPending ? (
            <span className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500">
              Filtert...
            </span>
          ) : null}
          <a
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            href={exportHref}
          >
            Excel exportieren
          </a>
          {hasActiveFilters ? (
            <a
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
              href="/ausgaben"
            >
              Zurücksetzen
            </a>
          ) : null}
        </div>
      </div>
    </form>
  );
}
