import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import { api, type Post } from '../lib/api';

export function PostPage() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.post(slug).then(setPost).catch((err: Error) => setError(err.message));
  }, [slug]);

  if (error) return <div className="mx-auto min-h-screen max-w-3xl px-5 py-24 text-rust">{error}</div>;
  if (!post) return <div className="mx-auto min-h-screen max-w-3xl px-5 py-24 text-ink/50">正在打开这页笔记…</div>;

  return (
    <article className="mx-auto max-w-screen-xl px-5 py-14 md:px-10 md:py-20">
      <Link to="/blog" className="mb-12 inline-flex items-center gap-2 text-sm text-ink/55 hover:text-rust"><ArrowLeft size={16} /> 返回全部文章</Link>
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-rust">{post.tags.join(' · ')}</p>
        <h1 className="mt-6 font-serif text-5xl leading-tight md:text-7xl">{post.title}</h1>
        <p className="mt-6 text-sm text-ink/45">{post.published_at.slice(0, 10)}</p>
      </header>
      {post.cover_url && <img src={post.cover_url} alt="" className="mt-14 aspect-[16/8] w-full object-cover" />}
      <div className="prose-kailens mx-auto mt-14 max-w-3xl"><ReactMarkdown>{post.content}</ReactMarkdown></div>
    </article>
  );
}
