import Link from "next/link";

import { getCurrentAppUser } from "@/lib/auth/current-user";

const foundations = [
  { label: "Personen und Klassen", href: "/personen" },
  { label: "Komponenten und Sets", href: null },
  { label: "Ausgabe und Rueckgabe", href: null },
  { label: "Legacy-Import", href: null },
];

export default async function Home() {
  const appUser = await getCurrentAppUser();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            iPad-Verwaltung 2.0
          </p>
          {appUser ? (
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
                Abmelden
              </button>
            </form>
          ) : (
            <Link
              className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              href="/login"
            >
              Anmelden
            </Link>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center">
        <div className="mt-4 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Arbeitsoberflaeche fuer iPad-Sets
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Das Projektgrundgeruest steht. Supabase Auth, App-Rollen und die
            erste Admin-Anmeldung sind angebunden.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {appUser ? (
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Angemeldet als
              </p>
              <p className="mt-1 text-lg font-semibold">{appUser.email}</p>
              <p className="mt-2 text-sm text-zinc-600">
                Rollen:{" "}
                {appUser.roles.length > 0 ? appUser.roles.join(", ") : "keine"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Nicht angemeldet
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Melde dich an, um die Rollen- und Datenbankanbindung zu pruefen.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {foundations.map((item) => (
            item.href ? (
              <Link
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
                href={item.href}
                key={item.label}
              >
                <p className="font-medium">{item.label}</p>
              </Link>
            ) : (
              <div
                key={item.label}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium">{item.label}</p>
              </div>
            )
          ))}
        </div>
        </div>
      </section>
    </main>
  );
}
