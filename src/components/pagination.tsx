import Link from "next/link";

import { allParams, type RawQuery } from "@/lib/params";

/**
 * Page-number pagination that preserves the current query string (including
 * multi-valued filter params) and only swaps the `page` parameter.
 */
export function Pagination({
  page,
  pageCount,
  params,
  basePath,
}: {
  page: number;
  pageCount: number;
  params: RawQuery;
  basePath: string;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page") continue;
      for (const item of allParams(value)) {
        if (item !== "") search.append(key, item);
      }
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-md px-3 py-1.5 text-sm text-ink-dim hover:bg-raised hover:text-ink"
        >
          Previous
        </Link>
      ) : null}
      {pages.map((target) => (
        <Link
          key={target}
          href={hrefFor(target)}
          aria-current={target === page ? "page" : undefined}
          className={
            target === page
              ? "rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-white"
              : "rounded-md px-3 py-1.5 text-sm text-ink-dim hover:bg-raised hover:text-ink"
          }
        >
          {target}
        </Link>
      ))}
      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-md px-3 py-1.5 text-sm text-ink-dim hover:bg-raised hover:text-ink"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
