import Link from "next/link";

type SectionTabsProps = {
  active: "personen" | "sets" | "ausgaben" | "geraete" | "schadensfaelle";
};

const tabs = [
  { key: "personen", label: "Personen", href: "/personen" },
  { key: "sets", label: "Sets", href: "/sets" },
  { key: "ausgaben", label: "Aus-/Rückgaben", href: "/ausgaben" },
  { key: "geraete", label: "Geräte", href: "/geraete" },
  { key: "schadensfaelle", label: "Schadensfälle", href: "/schadensfaelle" },
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
                  ? "border-b-2 border-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-950"
                  : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-950"
              }
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
