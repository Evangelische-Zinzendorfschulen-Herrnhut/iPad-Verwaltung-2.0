"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

type GeraeteFilterFormProps = {
  assignment: string;
  category: string;
  condition: string;
  hasActiveFilters: boolean;
  query: string;
  setFilter: string;
  sort: string;
};

export function GeraeteFilterForm({
  assignment,
  category,
  condition,
  hasActiveFilters,
  query,
  setFilter,
  sort,
}: GeraeteFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [setNumber, setSetNumber] = useState(setFilter);

  const updateUrl = useCallback(
    (nextValues: {
      assignment?: string;
      category?: string;
      condition?: string;
      q?: string;
      set?: string;
      sort?: string;
    }) => {
      const params = new URLSearchParams();
      const nextQuery = nextValues.q ?? search;
      const nextCategory = nextValues.category ?? category;
      const nextCondition = nextValues.condition ?? condition;
      const nextAssignment = nextValues.assignment ?? assignment;
      const nextSet = nextValues.set ?? setNumber;
      const nextSort = nextValues.sort ?? sort;

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextCategory) {
        params.set("category", nextCategory);
      }

      if (nextCondition) {
        params.set("condition", nextCondition);
      }

      if (nextAssignment) {
        params.set("assignment", nextAssignment);
      }

      if (nextSet.trim()) {
        params.set("set", nextSet.trim());
      }

      if (nextSort && nextSort !== "inventory") {
        params.set("sort", nextSort);
      }

      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [assignment, category, condition, pathname, router, search, setNumber, sort],
  );

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (setNumber !== setFilter) {
        updateUrl({ set: setNumber });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [setFilter, setNumber, updateUrl]);

  return (
    <form className="grid gap-3 border-b border-zinc-200 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_120px_150px_190px_180px_160px_auto]">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Suche
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Inventarnummer, Modell, Seriennummer oder Set"
          type="search"
          value={search}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Setnummer
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          inputMode="numeric"
          name="set"
          onChange={(event) => setSetNumber(event.target.value)}
          placeholder="z. B. 343"
          type="search"
          value={setNumber}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Kategorie
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="category"
          onChange={handleSelectChange}
          value={category}
        >
          <option value="">Alle</option>
          <option value="ipad">iPad</option>
          <option value="pencil">Pencil</option>
          <option value="keyboard">Tastatur</option>
          <option value="adapter">Adapter</option>
          <option value="mouse">Magic-Maus</option>
          <option value="other">Sonstiges</option>
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
          <option value="beschädigt_nutzbar">Beschädigt, nutzbar</option>
          <option value="defekt">Defekt</option>
          <option value="gesperrt_kein_mdm">Gesperrt, kein MDM</option>
          <option value="unklar">Unklar</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Zuordnung
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="assignment"
          onChange={handleSelectChange}
          value={assignment}
        >
          <option value="">Alle</option>
          <option value="set">In Set</option>
          <option value="free_set">In freiem Set</option>
          <option value="assigned_set">In zugeordnetem/ausgegebenem Set</option>
          <option value="unassigned">Ohne Set</option>
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
          <option value="inventory">Inventarnummer</option>
          <option value="category">Kategorie</option>
          <option value="set">Set</option>
          <option value="condition">Zustand</option>
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
            href="/geraete"
          >
            Zurücksetzen
          </Link>
        ) : null}
      </div>
    </form>
  );
}
