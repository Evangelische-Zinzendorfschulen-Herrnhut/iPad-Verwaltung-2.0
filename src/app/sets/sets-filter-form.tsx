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

type SetsFilterFormProps = {
  availability: string;
  classFilter: string;
  classOptions: string[];
  condition: string;
  hasActiveFilters: boolean;
  query: string;
  sort: string;
};

export function SetsFilterForm({
  availability,
  classFilter,
  classOptions,
  condition,
  hasActiveFilters,
  query,
  sort,
}: SetsFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const updateUrl = useCallback(
    (nextValues: {
      availability?: string;
      class?: string;
      condition?: string;
      q?: string;
      sort?: string;
    }) => {
      const params = new URLSearchParams();
      const nextQuery = nextValues.q ?? search;
      const nextAvailability = nextValues.availability ?? availability;
      const nextClass = nextValues.class ?? classFilter;
      const nextCondition = nextValues.condition ?? condition;
      const nextSort = nextValues.sort ?? sort;

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextAvailability) {
        params.set("availability", nextAvailability);
      }

      if (nextClass) {
        params.set("class", nextClass);
      }

      if (nextCondition) {
        params.set("condition", nextCondition);
      }

      if (nextSort && nextSort !== "set") {
        params.set("sort", nextSort);
      }

      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [availability, classFilter, condition, pathname, router, search, sort],
  );

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    updateUrl({ [event.target.name]: event.target.value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: search });
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
      className="grid gap-3 border-b border-zinc-200 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Suche
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Set-ID, Inventarnummer oder Person"
          type="search"
          value={search}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Verfuegbarkeit
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="availability"
          onChange={handleSelectChange}
          value={availability}
        >
          <option value="">Alle</option>
          <option value="frei">Frei</option>
          <option value="zugeordnet">Zugeordnet</option>
          <option value="ausgegeben">Ausgegeben</option>
          <option value="blockiert">Blockiert</option>
          <option value="unklar">Unklar</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Zustand
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="condition"
          onChange={handleSelectChange}
          value={condition}
        >
          <option value="">Alle</option>
          <option value="ok">Ok</option>
          <option value="unvollständig">Unvollstaendig</option>
          <option value="defekt">Defekt</option>
          <option value="unklar">Unklar</option>
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
        Sortierung
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="sort"
          onChange={handleSelectChange}
          value={sort}
        >
          <option value="set">Setnummer</option>
          <option value="person">Person</option>
          <option value="class">Klasse</option>
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
            href="/sets"
          >
            Zuruecksetzen
          </Link>
        ) : null}
      </div>
    </form>
  );
}
