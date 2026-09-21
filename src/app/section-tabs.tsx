import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { navigationIconByKind } from "./object-link-icon";

type SectionTabsProps = {
  active:
    | "personen"
    | "sets"
    | "wagen-w1"
    | "ausgaben"
    | "geraete"
    | "schadensfaelle"
    | "aufgaben";
};

const tabs = [
  { key: "personen", label: "Personen", href: "/personen", icon: navigationIconByKind.person },
  { key: "sets", label: "Sets", href: "/sets", icon: navigationIconByKind.set },
  { key: "ausgaben", label: "Aus-/Rückgaben", href: "/ausgaben", icon: navigationIconByKind.assignments },
  { key: "geraete", label: "Geräte", href: "/geraete", icon: navigationIconByKind.devices },
  { key: "schadensfaelle", label: "Schadensfälle", href: "/schadensfaelle", icon: navigationIconByKind.damage },
  { key: "aufgaben", label: "Aufgaben", href: "/aufgaben", icon: navigationIconByKind.tasks },
  { key: "wagen-w1", label: "Lagerliste", href: "/sets/w1", icon: navigationIconByKind.storage },
] as const;

export function SectionTabs({ active }: SectionTabsProps) {
  return (
    <nav
      aria-label="Bereiche"
      className="overflow-x-auto border-b border-zinc-200"
    >
      <div className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex items-center gap-2 border-b-2 border-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-950"
                  : "inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-950"
              }
              href={tab.href}
              key={tab.key}
            >
              <FontAwesomeIcon aria-hidden="true" className="h-4 w-4 shrink-0" icon={tab.icon} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
