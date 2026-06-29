"use client";

import { useMemo, useState } from "react";

import { FieldIcon } from "@/app/schadensfaelle/field-icon";

type CurrentComponentOption = {
  category: string;
  id: string;
  label: string;
};

type ReplacementComponentOption = {
  category: string;
  id: string;
  label: string;
  sourceLabel: string;
};

type DamageReplacementFieldsProps = {
  currentComponents: CurrentComponentOption[];
  replacementComponents: ReplacementComponentOption[];
};

function FormFieldLabel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span className="flex items-center gap-2">
        <FieldIcon label={label} />
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}

export function DamageReplacementFields({
  currentComponents,
  replacementComponents,
}: DamageReplacementFieldsProps) {
  const [componentId, setComponentId] = useState("");
  const selectedComponent = currentComponents.find(
    (component) => component.id === componentId,
  );
  const matchingReplacementComponents = useMemo(() => {
    if (!selectedComponent) {
      return [];
    }

    return replacementComponents.filter(
      (component) => component.category === selectedComponent.category,
    );
  }, [replacementComponents, selectedComponent]);

  return (
    <>
      <FormFieldLabel label="Komponente">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
          name="component_id"
          onChange={(event) => setComponentId(event.target.value)}
          value={componentId}
        >
          <option value="">Keine Komponente mit Inventarnummer</option>
          {currentComponents.map((component) => (
            <option key={component.id} value={component.id}>
              {component.label}
            </option>
          ))}
        </select>
      </FormFieldLabel>

      <FormFieldLabel label="Ersatzkomponente">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2 disabled:bg-zinc-100 disabled:text-zinc-500"
          disabled={!selectedComponent}
          name="replacement_component_id"
        >
          <option value="">
            {selectedComponent
              ? "Keine Ersatzkomponente"
              : "Erst Komponente auswählen"}
          </option>
          {matchingReplacementComponents.map((component) => (
            <option key={component.id} value={component.id}>
              {component.label} · {component.sourceLabel}
            </option>
          ))}
        </select>
      </FormFieldLabel>
    </>
  );
}
