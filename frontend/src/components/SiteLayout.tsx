import { Aperture, ArrowUpRight } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';

export function SiteLayout() {
  const { pathname } = useLocation();
  const isBlog = pathname === '/blog' || pathname.startsWith('/blog/');
  const isAi = pathname === '/ai';
  const section = isBlog ? 'JOURNAL' : isAi ? 'AI LAB' : 'PHOTOGRAPHY';
  const footerTitle = isBlog ? '把想法，写慢一点。' : isAi ? '把问题，拆开一点。' : '把一瞬，留久一点。';
  const footerMeta = isBlog ? 'Notes & Essays' : isAi ? 'Agent Experiments' : 'Personal Photography Archive';

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-5 py-3 md:px-8">
          <div className="flex items-center gap-2.5" aria-label={`Kai Lens ${section}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-ink/15">
              <Aperture size={16} strokeWidth={1.5} />
            </span>
            <span className="text-xs font-semibold tracking-widest">KAI LENS</span>
          </div>
          <span className="text-xs tracking-widest text-ink/40">{section}</span>
        </div>
      </header>
      <main className="pt-14"><Outlet /></main>
      <footer className="px-5 py-9 md:px-8">
        <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-serif text-2xl">{footerTitle}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-ink/45">{footerMeta}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-ink/55">
            <a href="mailto:hello@kailens.com" className="flex items-center gap-1 hover:text-rust">联系 <ArrowUpRight size={14} /></a>
            <span>© {new Date().getFullYear()} Kai Lens</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
