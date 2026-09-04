import Link from "next/link";
import type { PaginationMeta } from "@rc/shared";
import { paginationHref, type RawSearchParams } from "./property-query";
import styles from "./properties.module.css";

interface PropertyPaginationProps {
  pagination: PaginationMeta;
  searchParams: RawSearchParams;
}

function visiblePages(current: number, total: number): number[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right);
}

export function PropertyPagination({
  pagination,
  searchParams,
}: PropertyPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  const pages = visiblePages(pagination.page, pagination.totalPages);

  return (
    <nav className={styles.pagination} aria-label="Property result pages">
      {pagination.page > 1 ? (
        <Link href={paginationHref(searchParams, pagination.page - 1)}>
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span aria-disabled="true">
          <span aria-hidden="true">←</span> Previous
        </span>
      )}

      <div className={styles.pageNumbers}>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          return (
            <span key={page} className={styles.pageNumberGroup}>
              {previous !== undefined && page - previous > 1 ? (
                <span aria-hidden="true">…</span>
              ) : null}
              {page === pagination.page ? (
                <span aria-current="page">{page}</span>
              ) : (
                <Link href={paginationHref(searchParams, page)}>{page}</Link>
              )}
            </span>
          );
        })}
      </div>

      {pagination.page < pagination.totalPages ? (
        <Link href={paginationHref(searchParams, pagination.page + 1)}>
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span aria-disabled="true">
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
