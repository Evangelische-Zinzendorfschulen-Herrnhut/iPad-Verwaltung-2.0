"use client";

import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <main className="mx-auto w-full max-w-xl p-8">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
        Die Ansicht konnte nicht geladen werden.
      </h1>
      <p className="mt-3 text-zinc-700">Bitte versuchen Sie es erneut oder öffnen Sie die gewünschte Liste über die Startseite.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => startTransition(() => reset())} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "Wird erneut geladen …" : "Erneut versuchen"}
        </button>
        <Link href="/" className="rounded-md border border-zinc-300 px-4 py-2 font-semibold">Zur Startseite</Link>
      </div>
      <p role="status" className="mt-3 text-sm">{pending ? "Ansicht wird erneut geladen …" : ""}</p>
    </main>
  );
}
