"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError("Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort pruefen.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          iPad-Verwaltung 2.0
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Anmelden
        </h1>

        <form
          className="mt-8 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            E-Mail
            <input
              autoComplete="email"
              className="rounded-md border border-zinc-300 px-3 py-2 text-base outline-none ring-emerald-500 transition focus:ring-2"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Passwort
            <input
              autoComplete="current-password"
              className="rounded-md border border-zinc-300 px-3 py-2 text-base outline-none ring-emerald-500 transition focus:ring-2"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="rounded-md bg-zinc-950 px-4 py-2 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Anmelden..." : "Anmelden"}
          </button>
        </form>
      </section>
    </main>
  );
}
