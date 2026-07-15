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

type StorageFilterOption = {
  label: string;
  value: string;
};

type StorageFilterFormProps = {
  query: string;
  selectedStorage: string;
  storageFilters: StorageFilterOption[];
};

export function StorageFilterForm({
  query,
  selectedStorage,
  storageFilters,
}: StorageFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const updateUrl = useCallback(
    (nextValues: { q?: string; storage?: string }) => {
      const params = new URLSearchParams();
      const nextStorage = nextValues.storage ?? selectedStorage;
      const nextQuery = nextValues.q ?? search;

      if (nextStorage && nextStorage !== "W1") {
        params.set("storage", nextStorage);
      }

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      const target = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [pathname, router, search, selectedStorage],
  );

  function handleStorageChange(event: ChangeEvent<HTMLSelectElement>) {
    updateUrl({ storage: event.target.value });
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
        Suche
        <input
          className="min-w-64 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
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
      {selectedStorage !== "W1" || query ? (
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
