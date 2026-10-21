import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { photoUrls, type Work } from "../lib/api";
export function WorkCard({ work, index }: { work: Work; index: number }) {
  const { search } = useLocation();
  return (
    <Link
      to={`/works/${work.id}`}
      state={{ portfolioSearch: search }}
      className="work-card"
    >
      <div className="work-image">
        <img
          src={work.image_url}
          alt={work.title}
          loading={index < 2 ? "eager" : "lazy"}
        />
        <span className="image-count">
          {String(photoUrls(work).length).padStart(2, "0")} 张影像
        </span>
        <span className="work-open">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="work-caption">
        <span className="work-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h3>{work.title}</h3>
          <p>{[work.category, work.location].filter(Boolean).join(" / ")}</p>
        </div>
        <span className="work-year">{work.year}</span>
      </div>
    </Link>
  );
}
