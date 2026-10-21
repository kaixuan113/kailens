import { Aperture, ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: '作品' },
  { to: '/blog', label: '文字' },
  { to: '/ai', label: 'AI 实验室' },
];

export function SiteLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-5 py-4 md:px-10">
          <Link to="/" className="group flex items-center gap-3" aria-label="Kai Lens 首页">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 transition group-hover:rotate-12 group-hover:bg-ink group-hover:text-paper">
              <Aperture size={18} />
            </span>
            <span className="text-sm font-semibold tracking-widest">KAI LENS</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm transition hover:text-rust ${isActive ? 'text-rust' : 'text-ink/75'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="切换菜单">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-ink/10 px-5 py-6 md:hidden">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block py-3 text-xl font-serif">
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="pt-20"><Outlet /></main>
      <footer className="border-t border-ink/10 px-5 py-10 md:px-10">
        <div className="mx-auto flex max-w-screen-2xl flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-serif text-3xl">把一瞬，留久一点。</p>
            <p className="mt-2 text-sm text-ink/65">Photography · Notes · Experiments</p>
          </div>
          <div className="flex items-center gap-5 text-sm text-ink/70">
            <a href="mailto:hello@kailens.com" className="flex items-center gap-1 hover:text-rust">联系 <ArrowUpRight size={14} /></a>
            <Link to="/admin" className="hover:text-rust">管理</Link>
            <span>© {new Date().getFullYear()} Kai Lens</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
