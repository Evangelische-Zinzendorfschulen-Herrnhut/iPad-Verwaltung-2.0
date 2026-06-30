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

type DamageCasesFilterFormProps = {
  billing: string;
  hasActiveFilters: boolean;
  query: string;
  status: string;
  type: string;
};

export function DamageCasesFilterForm({
  billing,
  hasActiveFilters,
  query,
  status,
  type,
}: DamageCasesFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const buildSearchParams = useCallback(
    (nextValues: {
      billing?: string;
      q?: string;
      status?: string;
      type?: string;
    }) => {
      const params = new URLSearchParams();
      const nextQuery = nextValues.q ?? search;
      const nextStatus = nextValues.status ?? status;
      const nextType = nextValues.type ?? type;
      const nextBilling = nextValues.billing ?? billing;

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      if (nextStatus) {
        params.set("status", nextStatus);
      }

      if (nextType) {
        params.set("type", nextType);
      }

      if (nextBilling) {
        params.set("billing", nextBilling);
      }

      return params;
    },
    [billing, search, status, type],
  );

  const updateUrl = useCallback(
    (nextValues: {
      billing?: string;
      q?: string;
      status?: string;
      type?: string;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: search });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
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
      className="grid gap-3 border-b border-zinc-200 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_170px_170px_170px_auto]"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Suche
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="q"
          onChange={handleInputChange}
          placeholder="Beschreibung, Person, Set oder Inventar"
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
          <option value="">Alle</option>
          <option value="offen">Offen</option>
          <option value="in_bearbeitung">In Bearbeitung</option>
          <option value="bericht_erzeugt">Bericht erzeugt</option>
          <option value="bericht_unterschrieben">Bericht unterschrieben</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="storniert">Storniert</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Art
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="type"
          onChange={handleSelectChange}
          value={type}
        >
          <option value="">Alle</option>
          <option value="schaden">Schaden</option>
          <option value="verlust">Verlust</option>
          <option value="technisches_problem">Technisches Problem</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Abrechnung
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="billing"
          onChange={handleSelectChange}
          value={billing}
        >
          <option value="">Alle</option>
          <option value="unklar">Unklar</option>
          <option value="abrechenbar">Abrechenbar</option>
          <option value="nicht_abrechenbar">Nicht abrechenbar</option>
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
            href="/schadensfaelle"
          >
            Zurücksetzen
          </Link>
        ) : null}
      </div>
    </form>
  );
}
