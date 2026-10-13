import { ArrowRight, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Post } from '../lib/api';

export function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.posts().then(setPosts).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-screen-xl px-5 py-16 md:px-10 md:py-24">
      <header className="grid gap-8 border-b border-ink/20 pb-14 md:grid-cols-2 md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rust">Field notes / Blog</p>
          <h1 className="mt-5 font-serif text-6xl md:text-8xl">拍摄之外</h1>
        </div>
        <p className="max-w-lg text-base leading-8 text-ink/60 md:justify-self-end">关于摄影、技术和生活的随手记录。写下来的过程，也是把经验重新冲洗一遍。</p>
      </header>
      {error && <p className="mt-10 rounded-xl bg-rust/10 p-4 text-rust">{error}</p>}
      <div className="divide-y divide-ink/15">
        {posts.map((post, index) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group grid gap-6 py-10 md:grid-cols-12 md:items-center">
            <span className="text-xs text-ink/40 md:col-span-1">{String(index + 1).padStart(2, '0')}</span>
            <div className="md:col-span-3">
              <img src={post.cover_url || '/images/hero.jpg'} alt="" className="aspect-[3/2] w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" />
            </div>
            <div className="md:col-span-6">
              <div className="mb-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-ink/20 px-2 py-1 text-xs text-ink/65">{tag}</span>)}</div>
              <h2 className="font-serif text-3xl transition group-hover:text-rust md:text-4xl">{post.title}</h2>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/55">{post.excerpt}</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-ink/60"><Clock3 size={13} /> {post.published_at.slice(0, 10)}</p>
            </div>
            <ArrowRight className="transition group-hover:translate-x-2 md:col-span-2 md:justify-self-end" />
          </Link>
        ))}
      </div>
    </div>
  );
}
