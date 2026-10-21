import { createContext, useContext, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { api, defaultSettings, type PortfolioSettings } from "../lib/api";
const SettingsContext = createContext<PortfolioSettings>(defaultSettings);
export const usePortfolio = () => useContext(SettingsContext);
export function SiteLayout() {
  const [settings, setSettings] = useState(defaultSettings);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    api
      .settings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (hash === "#collection")
      document.getElementById("collection")?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <SettingsContext.Provider value={settings}>
      <div className="portfolio">
        <header className="site-header">
          <Link className="wordmark" to="/" aria-label="返回摄影作品首页">
            <span className="brand-symbol">
              k<span>.</span>
            </span>
            <span>
              {settings.name}
              <small>{settings.subtitle}</small>
            </span>
          </Link>
          <div className="header-right">
            <span className="availability">
              <i />
              光影持续记录中
            </span>
            <Link className="nav-active" to="/">
              摄影作品 <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="site-footer">
          <Link to="/" className="footer-brand">
            {settings.name}
            <span>© {new Date().getFullYear()}</span>
          </Link>
          <p>让每一次停留，都有所看见。</p>
          {settings.contact ? (
            <a href={`mailto:${settings.contact}`}>
              联系摄影师 <ArrowUpRight size={14} />
            </a>
          ) : (
            <span className="footer-note">以影像，收藏时间。</span>
          )}
        </footer>
      </div>
    </SettingsContext.Provider>
  );
}
