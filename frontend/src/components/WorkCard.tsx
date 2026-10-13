import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Work } from '../lib/api';

export function WorkCard({ work, index }: { work: Work; index: number }) {
  return (
    <Link to={`/works/${work.id}`} className="group reveal block">
      <div className="overflow-hidden bg-fog">
        <img
          src={work.image_url}
          alt={work.title}
          loading={index > 1 ? 'lazy' : 'eager'}
          className="work-card-image w-full object-cover"
        />
      </div>
      <div className="flex items-start justify-between border-b border-ink/15 py-4">
        <div>
          <h3 className="font-serif text-xl">{work.title}</h3>
          <p className="mt-1.5 text-xs uppercase tracking-widest text-ink/45">{work.location} · {work.year}</p>
        </div>
        <ArrowUpRight className="mt-1 text-ink/45 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rust" size={16} strokeWidth={1.5} />
      </div>
    </Link>
  );
}
