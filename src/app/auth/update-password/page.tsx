"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function prepareSession() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        window.history.replaceState(null, "", window.location.pathname);

        if (sessionError) {
          setError(sessionError.message);
          setIsSessionReady(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setError("Keine gueltige Auth-Session gefunden. Bitte nutze einen neuen Passwort-Link.");
        setIsSessionReady(false);
        return;
      }

      setIsSessionReady(true);
    }

    prepareSession();
  }, [supabase.auth]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Die Passwoerter stimmen nicht ueberein.");
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
            iPad-Verwaltung
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Passwort festlegen</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Lege ein Passwort fuer deinen Zugang fest. Danach kannst du dich mit
            E-Mail und Passwort anmelden.
          </p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-5"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Neues Passwort
            <input
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-300 transition focus:ring-2"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Passwort wiederholen
            <input
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-300 transition focus:ring-2"
              minLength={8}
              onChange={(event) => setRepeatPassword(event.target.value)}
              required
              type="password"
              value={repeatPassword}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <button
            className="rounded-md bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !isSessionReady}
            type="submit"
          >
            {isSubmitting ? "Speichern..." : "Passwort speichern"}
          </button>
        </form>
      </section>
    </main>
  );
}
