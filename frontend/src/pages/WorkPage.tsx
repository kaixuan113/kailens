import { ArrowLeft, ArrowUpRight, Expand } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Lightbox } from "../components/Lightbox";
import { api, isPersonalWork, photoUrls, type Work } from "../lib/api";
export function WorkPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const candidate = state?.portfolioSearch;
  const search =
    typeof candidate === "string" && candidate.startsWith("?") ? candidate : "";
  const [work, setWork] = useState<Work | null>(null);
  const [next, setNext] = useState<Work | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    setWork(null);
    setError("");
    setActive(null);
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      setError("作品地址无效");
      return;
    }
    api
      .work(n)
      .then((item) => {
        if (!isPersonalWork(item)) throw new Error("该作品不在当前影像档案中");
        if (live) setWork(item);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    api
      .works()
      .then((items) => {
        const works = items.filter(isPersonalWork);
        const position = works.findIndex((w) => w.id === n);
        if (live)
          setNext(
            works.length > 1 ? works[(position + 1) % works.length] : null,
          );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id]);
  if (error)
    return (
      <div className="empty-state">
        <p>{error}</p>
        <Link to="/">返回作品首页</Link>
      </div>
    );
  if (!work) return <div className="empty-state">正在打开作品集…</div>;
  const photos = photoUrls(work);
  return (
    <article className="work-detail">
      <header className="detail-header">
        <Link to={`/${search}#collection`} className="back-link">
          <ArrowLeft size={15} />
          全部作品
        </Link>
        <div className="detail-heading">
          <div>
            <p className="eyebrow">
              {work.category} / {work.year}
            </p>
            <h1>{work.title}</h1>
            {work.description && (
              <p className="detail-description">{work.description}</p>
            )}
          </div>
          <dl>
            <div>
              <dt>拍摄地点</dt>
              <dd>{work.location || "未标注"}</dd>
            </div>
            <div>
              <dt>影像数量</dt>
              <dd>{String(photos.length).padStart(2, "0")} 张</dd>
            </div>
            <div>
              <dt>浏览方式</dt>
              <dd>点击图片，沉浸观看</dd>
            </div>
          </dl>
        </div>
      </header>
      <div className="detail-photos">
        {photos.map((url, index) => (
          <figure key={url} className={index === 0 ? "detail-cover" : ""}>
            <button
              onClick={() => setActive(index)}
              aria-label={`全屏查看 ${work.title} 第 ${index + 1} 张`}
            >
              <img
                src={url}
                alt={`${work.title} · ${index + 1}`}
                loading={index < 2 ? "eager" : "lazy"}
              />
              <span>
                <Expand size={18} />
              </span>
            </button>
            <figcaption>
              <span>
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
              <span>{work.title}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {next && (
        <Link
          className="next-work"
          to={`/works/${next.id}`}
          state={{ portfolioSearch: search }}
        >
          <div>
            <p className="eyebrow">下一段故事</p>
            <h2>{next.title}</h2>
          </div>
          <ArrowUpRight size={40} strokeWidth={1} />
        </Link>
      )}
      {active !== null && (
        <Lightbox
          title={work.title}
          photos={photos}
          index={active}
          setIndex={setActive}
          close={() => setActive(null)}
        />
      )}
    </article>
  );
}
