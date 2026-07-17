"use client";

import { useMemo, useState } from "react";

export type PersonSelectionOption = {
  classLabel: string | null;
  email: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  legacyUserId: number | null;
  personType: string;
};

type PersonSelectionListProps = {
  people: PersonSelectionOption[];
};

type SortMode = "last_name" | "first_name" | "class" | "type";

function personName(person: PersonSelectionOption) {
  const name = [person.lastName, person.firstName].filter(Boolean).join(", ");

  return name || person.email || "Unbenannte Person";
}

function personSearchText(person: PersonSelectionOption) {
  return [
    personName(person),
    person.firstName,
    person.lastName,
    person.email,
    person.classLabel,
    person.personType,
    person.legacyUserId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

function compareText(first: string | null, second: string | null) {
  return (first || "").localeCompare(second || "", "de-DE", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortPeople(
  first: PersonSelectionOption,
  second: PersonSelectionOption,
  sortMode: SortMode,
) {
  if (sortMode === "first_name") {
    return (
      compareText(first.firstName, second.firstName) ||
      compareText(first.lastName, second.lastName) ||
      compareText(first.classLabel, second.classLabel)
    );
  }

  if (sortMode === "class") {
    return (
      compareText(first.classLabel, second.classLabel) ||
      compareText(first.lastName, second.lastName) ||
      compareText(first.firstName, second.firstName)
    );
  }

  if (sortMode === "type") {
    return (
      compareText(first.personType, second.personType) ||
      compareText(first.lastName, second.lastName) ||
      compareText(first.firstName, second.firstName)
    );
  }

  return (
    compareText(first.lastName, second.lastName) ||
    compareText(first.firstName, second.firstName) ||
    compareText(first.classLabel, second.classLabel)
  );
}

export function PersonSelectionList({ people }: PersonSelectionListProps) {
  const classOptions = useMemo(
    () =>
      [
        ...new Set(
          people
            .map((person) => person.classLabel)
            .filter((classLabel): classLabel is string => Boolean(classLabel)),
        ),
      ].sort((first, second) =>
        first.localeCompare(second, "de-DE", { numeric: true }),
      ),
    [people],
  );
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("first_name");
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const filteredPeople = useMemo(
    () =>
      people
        .filter((person) =>
          classFilter ? person.classLabel === classFilter : true,
        )
        .filter((person) =>
          normalizedQuery
            ? personSearchText(person).includes(normalizedQuery)
            : true,
        )
        .sort((first, second) => sortPeople(first, second, sortMode)),
    [classFilter, normalizedQuery, people, sortMode],
  );
  const selectedPersonIsVisible = filteredPeople.some(
    (person) => person.id === selectedPersonId,
  );

  return (
    <section className="grid gap-3">
      {selectedPersonId && !selectedPersonIsVisible ? (
        <input name="person_id" type="hidden" value={selectedPersonId} />
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Person suchen
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Klasse, E-Mail oder Personentyp"
            value={query}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Klasse
          <select
            className="min-w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            onChange={(event) => setClassFilter(event.target.value)}
            value={classFilter}
          >
            <option value="">Alle Klassen</option>
            {classOptions.map((classLabel) => (
              <option key={classLabel} value={classLabel}>
                {classLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sortierung
          <select
            className="min-w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            value={sortMode}
          >
            <option value="last_name">Nachname</option>
            <option value="first_name">Vorname</option>
            <option value="class">Klasse</option>
            <option value="type">Personentyp</option>
          </select>
        </label>
      </div>

      <div className="rounded-md border border-zinc-200">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          <span>{filteredPeople.length} Personen</span>
          {selectedPersonId ? (
            <button
              className="font-medium text-zinc-700 hover:text-zinc-950"
              onClick={() => setSelectedPersonId("")}
              type="button"
            >
              Auswahl entfernen
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-auto">
          {filteredPeople.length > 0 ? (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="w-10 px-3 py-2 font-medium">
                    <span className="sr-only">Auswahl</span>
                  </th>
                  <th className="w-12 px-3 py-2 font-medium">Nr.</th>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Klasse</th>
                  <th className="px-3 py-2 font-medium">Typ</th>
                  <th className="px-3 py-2 font-medium">E-Mail</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person, index) => {
                  const selected = person.id === selectedPersonId;
                  const inputId = `issue-person-${person.id}`;

                  return (
                    <tr
                      className={
                        selected
                          ? "bg-emerald-50 ring-1 ring-inset ring-emerald-500"
                          : "transition hover:bg-zinc-50"
                      }
                      key={person.id}
                    >
                      <td className="px-3 py-2 align-middle">
                        <input
                          aria-label={`${personName(person)} auswählen`}
                          checked={selected}
                          className="h-4 w-4 accent-zinc-950"
                          id={inputId}
                          name="person_id"
                          onChange={() => setSelectedPersonId(person.id)}
                          required
                          type="radio"
                          value={person.id}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle tabular-nums text-zinc-500">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 align-middle font-medium text-zinc-950">
                        <label className="cursor-pointer" htmlFor={inputId}>
                          {personName(person)}
                        </label>
                      </td>
                      <td className="px-3 py-2 align-middle text-zinc-600">
                        {person.classLabel || "-"}
                      </td>
                      <td className="px-3 py-2 align-middle text-zinc-600">
                        {person.personType}
                      </td>
                      <td className="px-3 py-2 align-middle text-zinc-600">
                        {person.email || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-3 py-6 text-sm text-zinc-500">
              Keine passende aktive Person gefunden.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
