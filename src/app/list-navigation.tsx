"use client";

import { useRouter } from "next/navigation";
import {
  createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useTransition,
  type ReactNode, type TransitionStartFunction,
} from "react";

export const listPaths = new Set([
  "/sets", "/sets/w1", "/geraete", "/personen", "/ausgaben",
  "/aufgaben", "/schadensfaelle", "/rechnungen",
]);

const NavigationContext = createContext<readonly [boolean, TransitionStartFunction] | null>(null);

export function useListTransition() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("ListNavigationProvider fehlt");
  return context;
}

export function ListNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const transition = useTransition();
  const [pending, startTransition] = transition;
  const previousFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (pending) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } else if (previousFocus.current) {
      const target = previousFocus.current.isConnected ? previousFocus.current : document.querySelector<HTMLElement>("main h1");
      if (target) {
        if (!target.hasAttribute("tabindex") && target.tagName === "H1") target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      previousFocus.current = null;
    }
  }, [pending]);

  function navigate(target: URL) {
    startTransition(() => router.push(target.pathname + target.search + target.hash));
  }

  return (
    <NavigationContext.Provider value={transition}>
      <div
        className="contents"
        inert={pending}
        aria-busy={pending}
        onClickCapture={(event) => {
          if (pending) { event.preventDefault(); event.stopPropagation(); return; }
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
          if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
          const target = new URL(link.href, window.location.href);
          if (target.origin !== window.location.origin || !listPaths.has(target.pathname)) return;
          if (target.href === window.location.href || (target.pathname === window.location.pathname && target.search === window.location.search)) return;
          event.preventDefault();
          event.stopPropagation();
          navigate(target);
        }}
        onSubmit={(event) => {
          const form = event.target as HTMLFormElement;
          // React server actions render method=POST; never intercept mutations.
          if (event.defaultPrevented || form.method.toLowerCase() !== "get" || (form.target && form.target !== "_self")) return;
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          if (submitter?.hasAttribute("formaction") || submitter?.hasAttribute("formmethod")) return;
          const target = new URL(form.action || window.location.href, window.location.href);
          if (target.origin !== window.location.origin || !listPaths.has(target.pathname)) return;
          event.preventDefault();
          if (pending) return;
          target.search = new URLSearchParams(Array.from(new FormData(form, submitter), ([key, value]) => [key, String(value)])).toString();
          navigate(target);
        }}
      >
        {children}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {pending ? (
          <LoadingStatus />
        ) : null}
      </div>
    </NavigationContext.Provider>
  );
}

function LoadingStatus() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-zinc-950/65 p-6 backdrop-blur-sm">
      <div className="flex max-w-md items-center gap-3 rounded-xl bg-white px-6 py-5 text-zinc-950 shadow-xl">
        <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-[3px] border-zinc-300 border-t-emerald-700 motion-safe:animate-spin" />
        <div>
          <p className="text-lg font-semibold">Liste wird geladen …</p>
          {slow ? <p className="mt-2 text-sm font-normal">Das Laden dauert länger als üblich. Bitte warten Sie noch einen Moment.</p> : null}
        </div>
      </div>
    </div>
  );
}
