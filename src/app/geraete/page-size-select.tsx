"use client";

type PageSizeSelectProps = {
  pageSize: number;
};

export function PageSizeSelect({ pageSize }: PageSizeSelectProps) {
  return (
    <select
      className="rounded-md border border-zinc-300 px-2 py-1 font-normal outline-none ring-emerald-500 transition focus:ring-2"
      name="pageSize"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      value={pageSize}
    >
      <option value="10">10</option>
      <option value="25">25</option>
      <option value="50">50</option>
    </select>
  );
}
