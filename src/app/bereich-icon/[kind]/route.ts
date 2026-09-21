import { navigationIconByKind } from "../../object-link-icon";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!Object.prototype.hasOwnProperty.call(navigationIconByKind, kind)) {
    return new Response("Not found", { status: 404 });
  }

  const [width, height, , , paths] =
    navigationIconByKind[kind as keyof typeof navigationIconByKind].icon;
  const pathElements = (Array.isArray(paths) ? paths : [paths])
    .map((path) => `<path d="${path}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#fafafa"/><svg x="10" y="10" width="44" height="44" viewBox="0 0 ${width} ${height}" fill="#18181b">${pathElements}</svg></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
