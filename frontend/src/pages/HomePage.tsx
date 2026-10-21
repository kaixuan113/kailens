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
      <section className="mx-auto grid min-h-[82vh] max-w-screen-2xl gap-8 px-5 py-10 md:grid-cols-12 md:px-10 md:py-16">
        <div className="flex flex-col justify-between md:col-span-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/20 px-3 py-1 text-xs uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-rust" /> Independent photographer
          </div>
          <div className="py-16 md:py-8">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-ink/65">光落下的地方</p>
            <h1 className="font-serif text-6xl leading-[0.92] sm:text-7xl lg:text-8xl">
              Still<br /><span className="italic text-rust">moving.</span>
            </h1>
            <p className="mt-8 max-w-md text-base leading-7 text-ink/75">
              我拍摄城市之间的停顿、陌生人的一瞥，以及那些差一点被忽略的日常。
            </p>
          </div>
          <a href="#works" className="flex w-fit items-center gap-3 text-sm text-ink/70 hover:text-rust">
            向下浏览 <ArrowDown size={16} />
          </a>
        </div>
        <div className="relative overflow-hidden md:col-span-7">
          <img
            src="/images/hero.jpg"
            alt="暮色中的山与湖"
            className="h-full min-h-[60vh] w-full object-cover"
          />
          <div className="absolute bottom-5 left-5 rounded-full bg-paper/90 px-4 py-2 text-xs backdrop-blur">
            37.7749° N — Personal archive
          </div>
        </div>
      </section>

      <section id="works" className="mx-auto max-w-screen-2xl px-5 py-24 md:px-10">
        <div className="mb-14 flex flex-col justify-between gap-6 border-t border-ink/20 pt-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-rust">Selected works / 01</p>
            <h2 className="mt-3 font-serif text-5xl md:text-6xl">近期作品</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink/55">从旅行、街头到自然，按下快门不是结束，而是重新理解一次眼前的世界。</p>
        </div>
        {error && <p className="rounded-xl bg-rust/10 p-4 text-rust">{error}</p>}
        <div className="grid gap-x-7 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {works.map((work, index) => <WorkCard key={work.id} work={work} index={index} />)}
        </div>
      </section>

      <section className="bg-ink px-5 py-24 text-paper md:px-10">
        <div className="mx-auto grid max-w-screen-2xl gap-14 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-[0.25em] text-paper/45">About / 02</p>
            <h2 className="mt-6 max-w-3xl font-serif text-5xl leading-tight md:text-7xl">镜头是我理解世界的一种慢方法。</h2>
          </div>
          <div className="flex flex-col justify-end gap-8 md:col-span-5">
            <p className="text-base leading-8 text-paper/65">这里既是摄影档案，也是持续生长的个人网站。我会记录拍摄背后的故事、技术实践，以及关于 AI Agent 的小实验。</p>
            <div className="flex gap-8 border-t border-paper/20 pt-6 text-sm text-paper/65">
              <span className="flex items-center gap-2"><Camera size={16} /> Visual stories</span>
              <span className="flex items-center gap-2"><MapPin size={16} /> Beijing, CN</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
