"use client";

import Link from "next/link";
import { searchOnEnter } from "../../list-search";
import { useListTransition } from "../../list-navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  ChangeEvent,
  useCallback,
  useState,
} from "react";

type StorageFilterOption = {
  label: string;
  value: string;
};

type StorageFilterFormProps = {
  ipadStorageFilters: number[];
  query: string;
  selectedIpadStorage: string;
  selectedStorage: string;
  storageFilters: StorageFilterOption[];
};

export function StorageFilterForm({
  ipadStorageFilters,
  query,
  selectedIpadStorage,
  selectedStorage,
  storageFilters,
}: StorageFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useListTransition();
  const [search, setSearch] = useState(query);

  const updateUrl = useCallback(
    (nextValues: { ipadStorage?: string; q?: string; storage?: string }) => {
      const params = new URLSearchParams();
      const nextIpadStorage = nextValues.ipadStorage ?? selectedIpadStorage;
      const nextStorage = nextValues.storage ?? selectedStorage;
      const nextQuery = nextValues.q ?? query;

      if (nextStorage && nextStorage !== "W1") {
        params.set("storage", nextStorage);
      }

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextIpadStorage) {
        params.set("ipadStorage", nextIpadStorage);
      }

      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [startTransition, pathname, router, query, selectedIpadStorage, selectedStorage],
  );

  function handleStorageChange(event: ChangeEvent<HTMLSelectElement>) {
    updateUrl({ storage: event.target.value });
  }

  function handleIpadStorageChange(event: ChangeEvent<HTMLSelectElement>) {
    updateUrl({ ipadStorage: event.target.value });
  }

  return (
    <form className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Lagerort
        <select
          className="min-w-44 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2"
          name="storage"
          onChange={handleStorageChange}
          value={selectedStorage}
        >
          {storageFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        iPad Typ
        <select
          className="min-w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2"
          name="ipadStorage"
          onChange={handleIpadStorageChange}
          value={selectedIpadStorage}
        >
          <option value="">Alle Größen</option>
          {ipadStorageFilters.map((storageGb) => (
            <option key={storageGb} value={storageGb}>
              {storageGb} GB
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Suche
        <input
          className="min-w-64 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
          onKeyDown={searchOnEnter((q) => updateUrl({ q }))}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Person, Set oder Inventarnummer"
          type="search"
          value={search}
        />
      </label>
      {isPending ? (
        <span className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500">
          Filtert...
        </span>
      ) : null}
      {selectedStorage !== "W1" || selectedIpadStorage || query ? (
        <Link
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
          href="/sets/w1"
        >
          Zurücksetzen
        </Link>
      ) : null}
    </form>
  );
}
