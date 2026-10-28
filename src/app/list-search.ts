import type { KeyboardEvent } from "react";

/** Submit a local search draft only after Enter, outside IME composition. */
export function searchOnEnter(submit: (query: string) => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit(event.currentTarget.value.trim());
  };
}

/** Keep native GET search forms consistent with client list filters. */
export function normalizeListSearch(params: URLSearchParams) {
  if (!params.has("q")) return;
  const query = params.get("q")!.trim();
  if (query) params.set("q", query);
  else params.delete("q");
}
