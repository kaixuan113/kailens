import { ArrowLeft, Images, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Work } from '../lib/api';

export function WorkPage() {
  const { id } = useParams();
  const [work, setWork] = useState<Work | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const workId = Number(id);
    if (!Number.isInteger(workId)) {
      setError('作品集地址无效');
      return;
    }
    api.work(workId).then(setWork).catch((reason: Error) => setError(reason.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-5 py-24 text-center text-rust">{error}</div>;
  if (!work) return <div className="mx-auto max-w-3xl px-5 py-24 text-center text-ink/45">正在打开作品集…</div>;

  const allPhotoUrls = Array.from(new Set([work.image_url, ...work.gallery_urls]));
  const gallery = allPhotoUrls.filter((url) => url !== work.image_url);

  return (
    <article className="pb-24">
      <header className="mx-auto max-w-screen-2xl px-5 pb-12 pt-12 md:px-10 md:pb-16 md:pt-20">
        <Link to="/#works" className="inline-flex items-center gap-2 text-sm text-ink/55 transition hover:text-rust"><ArrowLeft size={16} /> 返回作品</Link>
        <div className="mt-12 grid gap-8 border-t border-ink/15 pt-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="text-xs uppercase tracking-widest text-rust">{work.category} · Portfolio</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight md:text-7xl">{work.title}</h1>
          </div>
          <div className="flex flex-col justify-end gap-4 text-sm text-ink/60 md:col-span-4">
            <p className="flex items-center gap-2"><MapPin size={15} /> {work.location || '未标注地点'} · {work.year}</p>
            <p className="flex items-center gap-2"><Images size={15} /> {allPhotoUrls.length} 张影像</p>
            {work.description && <p className="leading-7">{work.description}</p>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl px-5 md:px-10">
        <img src={work.image_url} alt={`${work.title}封面`} className="max-h-screen w-full bg-fog object-contain" />
        {gallery.length > 0 ? <div className="mt-8 columns-1 gap-8 md:columns-2">
          {gallery.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${work.title}作品 ${index + 1}`} loading="lazy" className="mb-8 w-full break-inside-avoid bg-fog" />)}
        </div> : <p className="mt-10 border-t border-ink/15 py-10 text-center text-sm text-ink/45">这个作品集目前只有封面照片，可以在管理后台继续批量添加。</p>}
      </div>
    </article>
  );
}
