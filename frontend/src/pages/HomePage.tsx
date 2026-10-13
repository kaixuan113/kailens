import { ArrowDown, Camera, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WorkCard } from '../components/WorkCard';
import { api, type Work } from '../lib/api';

export function HomePage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.works().then(setWorks).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <section className="mx-auto grid max-w-screen-xl gap-8 px-5 py-8 md:grid-cols-12 md:gap-12 md:px-8 md:py-12 lg:gap-16">
        <div className="flex flex-col md:col-span-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink/50">
            <span className="h-px w-8 bg-rust" /> Portfolio · 2026
          </div>
          <div className="my-12 md:my-auto">
            <p className="mb-4 text-xs uppercase tracking-widest text-ink/55">光落下的地方</p>
            <h1 className="font-serif text-5xl leading-none sm:text-6xl lg:text-7xl">
              Still<br /><span className="italic text-rust">moving.</span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-ink/65">
              我拍摄城市之间的停顿、陌生人的一瞥，以及那些差一点被忽略的日常。
            </p>
          </div>
          <a href="#works" className="flex w-fit items-center gap-3 border-b border-ink/20 pb-2 text-xs uppercase tracking-widest text-ink/55 transition hover:border-rust hover:text-rust">
            Explore <ArrowDown size={14} strokeWidth={1.5} />
          </a>
        </div>
        <figure className="md:col-span-8">
          <div className="hero-image-frame overflow-hidden bg-fog">
            <img
              src="/images/hero.jpg"
              alt="公路穿过红色山谷"
              className="hero-image h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-3 flex justify-between border-b border-ink/15 pb-3 text-xs text-ink/45">
            <span>37.7749° N</span>
            <span>Personal archive</span>
          </figcaption>
        </figure>
      </section>

      <section id="works" className="mx-auto max-w-screen-xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-12 flex flex-col justify-between gap-6 border-t border-ink/15 pt-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-rust">Selected works / 01</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">近期作品</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink/50">从旅行、街头到自然，按下快门不是结束，而是重新理解一次眼前的世界。</p>
        </div>
        {error && <p className="border border-rust/20 bg-rust/5 p-4 text-sm text-rust">{error}</p>}
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {works.map((work, index) => <WorkCard key={work.id} work={work} index={index} />)}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-fog/40 px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-screen-xl gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-widest text-rust">About / 02</p>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-snug md:text-5xl">镜头是我理解世界的一种慢方法。</h2>
          </div>
          <div className="flex flex-col justify-end gap-8 md:col-span-5">
            <p className="text-sm leading-7 text-ink/60">这里既是摄影档案，也是持续生长的个人网站。我会记录拍摄背后的故事、技术实践，以及关于 AI Agent 的小实验。</p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-ink/15 pt-5 text-xs uppercase tracking-wider text-ink/55">
              <span className="flex items-center gap-2"><Camera size={15} strokeWidth={1.5} /> Visual stories</span>
              <span className="flex items-center gap-2"><MapPin size={15} strokeWidth={1.5} /> Beijing, CN</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
