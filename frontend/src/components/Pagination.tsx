import { ChevronLeft, ChevronRight } from "lucide-react";
export const PAGE_SIZE = 12;
export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onChange,
  disabled = false,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const candidates = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n > 0 && n <= pages)
    .sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="作品集分页">
      <p aria-live="polite">
        共 {total} 个作品集
        {pages > 1 && (
          <span>
            {" "}
            · 第 {page} / {pages} 页
          </span>
        )}
      </p>
      {pages > 1 && (
        <div>
          <button
            disabled={disabled || page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="上一页"
          >
            <ChevronLeft size={15} />
            <span>上一页</span>
          </button>
          {candidates.map((n, i) => (
            <span className="page-slot" key={n}>
              {i > 0 && n - candidates[i - 1] > 1 && (
                <span className="page-gap">…</span>
              )}
              <button
                disabled={disabled}
                aria-label={`第 ${n} 页`}
                aria-current={n === page ? "page" : undefined}
                className={n === page ? "current" : ""}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            </span>
          ))}
          <button
            disabled={disabled || page >= pages}
            onClick={() => onChange(page + 1)}
            aria-label="下一页"
          >
            <span>下一页</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </nav>
  );
}
