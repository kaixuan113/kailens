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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-5 py-3 md:px-8">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="Kai Lens 首页">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-ink/15 transition duration-300 group-hover:rotate-12 group-hover:border-rust group-hover:text-rust">
              <Aperture size={16} strokeWidth={1.5} />
            </span>
            <span className="text-xs font-semibold tracking-widest">KAI LENS</span>
          </Link>
          <nav className="hidden items-center gap-9 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `border-b pb-1 text-xs tracking-wider transition ${isActive ? 'border-rust text-rust' : 'border-transparent text-ink/60 hover:border-ink/20 hover:text-ink'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button className="text-ink/70 md:hidden" onClick={() => setOpen(!open)} aria-label="切换菜单">
            {open ? <X size={20} /> : <Menu size={20} />}
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
      <main className="pt-14"><Outlet /></main>
      <footer className="px-5 py-9 md:px-8">
        <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-serif text-2xl">把一瞬，留久一点。</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-ink/45">Photography · Notes · Experiments</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-ink/55">
            <a href="mailto:hello@kailens.com" className="flex items-center gap-1 hover:text-rust">联系 <ArrowUpRight size={14} /></a>
            <Link to="/admin" className="hover:text-rust">管理</Link>
            <span>© {new Date().getFullYear()} Kai Lens</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
