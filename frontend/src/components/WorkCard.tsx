import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Work } from '../lib/api';

export function WorkCard({ work, index }: { work: Work; index: number }) {
  return (
    <Link to={`/works/${work.id}`} className={`group reveal block ${index % 3 === 1 ? 'md:mt-20' : ''}`}>
      <div className="overflow-hidden bg-fog">
        <img
          src={work.image_url}
          alt={work.title}
          loading={index > 1 ? 'lazy' : 'eager'}
          className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex items-start justify-between border-b border-ink/15 py-4">
        <div>
          <h3 className="font-serif text-2xl">{work.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-widest text-ink/50">{work.location} · {work.year}</p>
        </div>
        <ArrowUpRight className="mt-1 transition group-hover:-translate-y-1 group-hover:translate-x-1" size={18} />
      </div>
    </Link>
  );
}
