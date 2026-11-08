import { useState } from 'react';
import SupportWebFallback from '../Support.web';
import { AUTHORS, EXAMPLES, LEFT_BOOKS, RIGHT_BOOKS, STUDY_LINKS } from './marketingData';

function BookRail({ side, books }: { side: string; books: string[][] }) {
  return (
    <div className={rail ${side}} aria-hidden="true">
      <div className="rail-track">
        {[...books, ...books].map(([label, title], index) => (
          <div className="tile" key={index}><small>{label}</small>{title}</div>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="hero">
        <BookRail side="left" books={LEFT_BOOKS} />
        <BookRail side="right" books={RIGHT_BOOKS} />
        <div className="hero-content">
          <p className="label">A Bible study app for iPhone and iPad</p>
          <h1>Read Scripture.<br /><em>Ask deeper questions.</em></h1>
          <p>Open the Bible, bring your questions to GospelAI, and explore the passage with classic Christian commentary.</p>
          <div className="buttons">
            <a className="pill primary store" href="https://apps.apple.com/ie/app/gospelai/id6753168829">Download on the App Store ↗️</a>
            <a className="pill" href="/ask">Explore a sample</a>
          </div>
          <a href="#showcase" className="down label">See the app ↓</a>
        </div>
      </section>
      <PhoneShowcase />
      <section className="section intro">
        <div className="wrap">
          <p className="label">Scripture first</p>
          <h2>Start with the passage.<br /><em>Follow your questions.</em></h2>
          <p>Read the verses around a passage, look up related Scripture, and give yourself time to think about what you’ve read.</p>
        </div>
      </section>
    </>
  );
}

const SCREENS = [
  { label: 'Daily reading', title: 'Today', rows: [<>Verse of the day<br />Psalm 119:105</>, 'Open Bible →'] },
  { label: 'Scripture study', title: 'Ask GospelAI', rows: ['Why does Jesus call himself the good shepherd?', 'Read John 10'] },
  { label: 'Your study', title: 'Saved', rows: ['Bookmarks →', 'Highlights →', 'Notes →'] },
];

function PhoneShowcase() {
  const [offset, setOffset] = useState(0);
  const screens = SCREENS.map((_, index) => SCREENS[(index + offset) % SCREENS.length]);
  return (
    <section className="showcase" id="showcase" aria-label="Illustrated app preview">
      <div className="label">Inside GospelAI · illustrative screens</div>
      <div className="phones" aria-label="Illustrated app screens">
        {screens.map((screen, index) => (
          <div className={phone${index === 1 ? ' main' : ''}} key={screen.title}>
            <small>{screen.label}</small><b>{screen.title}</b>
            {screen.rows.map((row, rowIndex) => <span key={rowIndex}>{row}</span>)}
          </div>
        ))}
      </div>
      <div className="controls" aria-label="App preview controls">
        <button className="round" onClick={() => setOffset(value => (value + 2) % 3)} aria-label="Previous screen">←</button>
        <output aria-live="polite">{screens[1].title}</output>
        <button className="round" onClick={() => setOffset(value => (value + 1) % 3)} aria-label="Next screen">→</button>
      </div>
    </section>
  );
}

export function StudyLinks() {
  return (
    <div className="study-links" aria-label="Open study tools">
      {STUDY_LINKS.map(link => <a className="pill" key={link.href} href={link.href}>Open {link.label} →</a>)}
    </div>
  );
}

export function FeaturesPage() {
  return (
    <section className="section" id="reader">
      <div className="wrap">
        <div className="lead"><p className="label">The app</p><h2>From daily reading to deeper study.</h2></div>
        <div className="grid">
          <article className="card"><p className="label">01 · Read</p><h3>Open the Bible</h3><p>Start with a passage you know or make time for a verse of the day.</p></article>
          <article className="card"><p className="label">02 · Ask</p><h3>Explore a question</h3><p>Ask about a verse, a theme, or the context around a passage.</p></article>
          <article className="card"><p className="label">03 · Reflect</p><h3>Keep your place</h3><p>Use bookmarks, highlights and notes to return to passages you want to study again.</p></article>
        </div>
        <StudyLinks />
      </div>
    </section>
  );
}

export function AskPage() {
  const [selected, setSelected] = useState(0);
  const [, passage, question, response] = EXAMPLES[selected];
  return (
    <section className="section" id="ask">
      <div className="wrap demo">
        <div>
          <p className="label">Ask GospelAI · sample study</p>
          <h2>What would you ask?</h2>
          <p>Choose a question to see a prepared example. Open GospelAI to ask your own.</p>
          <div className="prompts" aria-label="Choose a prepared question">
            {EXAMPLES.map(([label], index) => <button className="pill" key={label} aria-pressed={selected === index} onClick={() => setSelected(index)}>{label}</button>)}
          </div>
          <div className="study-links"><a className="pill primary" href="/new">Ask your own question →</a><a className="pill" href="/bible">Open the Bible →</a></div>
        </div>
        <article className="card answer" aria-live="polite" aria-atomic="true">
          <p className="label">{passage}</p><h3>{question}</h3><p>{response}</p>
        </article>
      </div>
    </section>
  );
}

export function AuthorsPage() {
  const [selected, setSelected] = useState(0);
  const [work, name, description] = AUTHORS[selected];
  return (
    <section className="section" id="authors">
      <div className="wrap">
        <div className="lead"><p className="label">Author insights</p><h2>Read alongside classic Christian voices.</h2></div>
        <div className="prompts author-controls" aria-label="Choose a commentator">
          {AUTHORS.map(([, author], index) => <button className="pill" key={author} aria-pressed={selected === index} onClick={() => setSelected(index)}>{author}</button>)}
        </div>
        <article className="card author-detail" aria-live="polite" aria-atomic="true">
          <div><p className="label">{work}</p><h3>{name}</h3><p>{description}</p></div>
        </article>
        <div className="study-links"><a className="pill primary" href="/library">Open the library →</a></div>
      </div>
    </section>
  );
}

export function SupportPage() {
  return (
    <section className="section support" id="support">
      <div className="wrap demo">
        <div>
          <p className="label">Support the work</p>
          <h2>Help us keep building GospelAI.</h2>
          <p>GospelAI is free to use. If it has helped you study Scripture, you can support its development with an optional contribution.</p>
        </div>
        <div className="support-checkout"><SupportWebFallback /></div>
      </div>
    </section>
  );
}
