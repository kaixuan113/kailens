import { ArrowDown, ArrowUpRight, Grid2X2, Rows2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Pagination } from "../components/Pagination";
import { Link, useSearchParams } from "react-router-dom";
import { WorkCard } from "../components/WorkCard";
import { usePortfolio } from "../components/SiteLayout";
import { api, photoUrls, type WorkPageResult } from "../lib/api";
export function HomePage() {
  const settings = usePortfolio();
  const [query, setQuery] = useSearchParams();
  const parsedPage = Number(query.get("page") || 1);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const category = query.get("category") || "全部";
  const [data, setData] = useState<WorkPageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"gallery" | "list">("gallery");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .workPage(page, category)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, category]);
  useEffect(() => {
    if (!loading && window.location.hash === "#collection")
      document.getElementById("collection")?.scrollIntoView({ block: "start" });
  }, [loading]);
  function navigate(nextPage: number, nextCategory = category) {
    const next = new URLSearchParams();
    if (nextPage > 1) next.set("page", String(nextPage));
    if (nextCategory !== "全部") next.set("category", nextCategory);
    setQuery(next);
    document.getElementById("collection")?.scrollIntoView({ block: "start" });
  }
  const featured = data?.featured;
  const categories = [
    "全部",
    ...(data?.categories.map((c) => c.category) || []),
  ];
  const works = data?.items || [];
  const shown = works;
  return (
    <>
      <section className="intro">
        <div className="intro-top">
          <p className="eyebrow">
            <span />
            摄影，是一种观看的方式
          </p>
          <span className="archive-label">
            影像档案 / {new Date().getFullYear()}
          </span>
        </div>
        <div className="intro-heading">
          <h1>{settings.title}</h1>
          <div>
            <p>{settings.description}</p>
            <a href="#collection" className="text-link">
              走进影像 <ArrowDown size={15} />
            </a>
          </div>
        </div>
      </section>
      {featured && (
        <section className="featured">
          <Link to={`/works/${featured.id}`} className="featured-image">
            <img
              src={featured.image_url}
              alt={featured.title}
              fetchPriority="high"
            />
            <div className="featured-shade" />
            <div className="featured-caption">
              <div>
                <span>本期精选 · {featured.year}</span>
                <h2>{featured.title}</h2>
                <p>
                  {featured.description ||
                    [featured.location, featured.category]
                      .filter(Boolean)
                      .join(" · ")}
                </p>
              </div>
              <span className="featured-arrow">
                <ArrowUpRight size={25} />
              </span>
            </div>
          </Link>
          <div className="featured-meta">
            <span>{settings.name} / 摄影作品档案</span>
            <span>
              {String(photoUrls(featured).length).padStart(2, "0")} 张影像，
              {String(photoUrls(featured).length).padStart(2, "0")} 个瞬间
            </span>
          </div>
        </section>
      )}
      {loading && !data && (
        <div className="loading-gallery" aria-label="作品加载中">
          <div />
          <p>正在展开影像…</p>
        </div>
      )}
      <section id="collection" className="collection">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">作品集</p>
            <h2>
              每一程，都值得回望
              <span>（{String(data?.total_all || 0).padStart(2, "0")}）</span>
            </h2>
          </div>
          <p>关于远方，也关于身旁。</p>
        </div>
        <div className="collection-toolbar">
          <div className="category-tabs" aria-label="作品分类">
            {categories.map((c) => (
              <button
                key={c}
                className={c === category ? "selected" : ""}
                aria-pressed={category === c}
                onClick={() => navigate(1, c)}
              >
                {c}
                {c === "全部" && <sup>{data?.total_all || 0}</sup>}
              </button>
            ))}
          </div>
          <div className="view-switch">
            <button
              title="画廊视图"
              aria-label="画廊视图"
              aria-pressed={view === "gallery"}
              className={view === "gallery" ? "selected" : ""}
              onClick={() => setView("gallery")}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              title="列表视图"
              aria-label="列表视图"
              aria-pressed={view === "list"}
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <Rows2 size={18} />
            </button>
          </div>
        </div>
        {error && (
          <div className="empty-state" role="alert">
            {error}
            <button onClick={() => window.location.reload()}>重新加载</button>
          </div>
        )}
        {!loading && !error && shown.length === 0 && (
          <div className="empty-state">新的影像，正在路上。</div>
        )}
        <div className={`work-grid ${view === "list" ? "work-list" : ""}`}>
          {!error &&
            !loading &&
            shown.map((work, index) => (
              <WorkCard
                key={work.id}
                work={work}
                index={((data?.page || 1) - 1) * 12 + index}
              />
            ))}
        </div>
        {loading && data && (
          <p className="page-loading" role="status">
            正在加载作品…
          </p>
        )}
        {!loading && !error && data && (
          <Pagination
            page={data.page}
            total={data.total}
            onChange={(n) => navigate(n)}
          />
        )}
        {(data?.total_all || 0) > 0 && (
          <div className="collection-end">
            <span />
            <p>暂时走到这里，还有更多故事在路上。</p>
            <span />
          </div>
        )}
      </section>
    </>
  );
}
