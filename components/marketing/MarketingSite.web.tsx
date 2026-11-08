import { useEffect, useRef, useState } from 'react';
import { AskPage, AuthorsPage, FeaturesPage, HomePage, SupportPage } from './MarketingSections.web';
import { PUBLIC_PAGES, STUDY_LINKS } from './marketingData';
import { marketingStyles } from './marketingStyles';

export type GospelAIMarketingPage =
  | 'home'
  | 'features'
  | 'app-features'
  | 'ask'
  | 'ask-gospelai'
  | 'authors'
  | 'authors-insight'
  | 'support';

export default function MarketingSite({ page = 'home' }: { page?: GospelAIMarketingPage }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gospelai-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      // The reference theme remains usable when browser storage is unavailable.
    }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(preference.matches);
    syncMotion();
    preference.addEventListener('change', syncMotion);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector('summary')?.focus();
      }
    };
    const handleOutside = (event: PointerEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      preference.removeEventListener('change', syncMotion);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('gospelai-theme', next); } catch {
      // Theme switching does not require persistent storage.
    }
  };
  const closeMenu = () => { if (menuRef.current) menuRef.current.open = false; };
  const currentPath = page === 'home' ? '/'
    : page === 'features' || page === 'app-features' ? '/features'
      : page === 'ask' || page === 'ask-gospelai' ? '/ask'
        : page === 'authors' || page === 'authors-insight' ? '/authors-insight' : '/support';

  return (
    <div className="gospel-marketing" data-theme={theme} data-motion={paused || reducedMotion ? 'paused' : 'playing'}>
      <style>{marketingStyles}</style>
      <a href="#main" className="skip">Skip to content</a>
      <header className="wrap">
        <a className="brand" href="/" aria-label="GospelAI home">
          <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M18 28C13 24 7 24 3 25V9c5-1 10 0 15 4 5-4 10-5 15-4v16c-4-1-10-1-15 3Zm0-15v15M18 2v8M15 5h6" />
          </svg>
          GospelAI
        </a>
        <div className="actions">
          <a className="pill primary top-support" href="/support">Support GospelAI</a>
          <button className="round motion-control" hidden={reducedMotion} aria-label={paused ? 'Resume decorative animation' : 'Pause decorative animation'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '▶️' : 'Ⅱ'}</button>
          <button className="round" aria-label="Toggle colour theme" aria-pressed={theme === 'dark'} onClick={toggleTheme}>◐</button>
          <details ref={menuRef}>
            <summary className="round" aria-label="Navigation menu">☰</summary>
            <nav aria-label="Main navigation">
              {PUBLIC_PAGES.map(link => <a key={link.href} href={link.href} aria-current={currentPath === link.href ? 'page' : undefined} onClick={closeMenu}>{link.label}</a>)}
              <a href="/login?type=login" onClick={closeMenu}>Sign in</a>
              <a href="/login?type=register" onClick={closeMenu}>Create an account</a>
              <a href="/today" onClick={closeMenu}>Open GospelAI →</a>
            </nav>
          </details>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {page === 'home' && <HomePage />}
        {(page === 'features' || page === 'app-features') && <FeaturesPage />}
        {(page === 'ask' || page === 'ask-gospelai') && <AskPage />}
        {(page === 'authors' || page === 'authors-insight') && <AuthorsPage />}
        {page === 'support' && <SupportPage />}
      </main>
      <footer>
        <div className="wrap">
          <div className="foot">
            <a className="brand" href="/">GospelAI ↑</a>
            <div aria-label="Public pages">
              <a href="/features">The app</a>
              <a href="/ask">Sample study</a>
              <a href="/authors-insight">Author insights</a>
              <a href="/support">Support</a>
            </div>
          </div>
          <div className="study-links" aria-label="Study tools">
            {STUDY_LINKS.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
          </div>
          <p className="fine">Built by Tivere Orugbo and Stephen Omitogun.</p>
        </div>
      </footer>
    </div>
  );
}
