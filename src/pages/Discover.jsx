import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { ARTICLES, DAILY_QUOTES } from '../constants/discoverContent';
import { BookOpen, Clock } from 'lucide-react';
import '../pages/Page.css';
import './Discover.css';

function DiscoverContent() {
  const quote = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_QUOTES.length;
    return DAILY_QUOTES[dayIndex];
  }, []);

  return (
    <div className="discover-page">
      <div className="page-head-row">
        <div className="page-head-text">
          <div className="page-icon-badge page-icon-primary"><BookOpen size={18} /></div>
          <div>
            <h1 className="page-title">Discover</h1>
            <p className="page-head-sub">A little something to lift you up today</p>
          </div>
        </div>
      </div>

      <div className="quote-card">
        <p className="quote-text">"{quote.text}"</p>
        <p className="quote-author">— {quote.author}</p>
      </div>

      <h2 className="discover-section-heading">Articles</h2>
      <div className="discover-grid">
        {ARTICLES.map((a) => (
          <Link key={a.id} to={`/discover/${a.id}`} className="discover-card">
            <div className="discover-card-image" style={{ backgroundImage: `url(${a.image})` }}>
              <span className="discover-card-tag">{a.category}</span>
            </div>
            <p className="discover-card-title">{a.title}</p>
            {a.readTime && (
              <p className="discover-card-meta"><Clock size={12} /> {a.readTime}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <AuthGate>
      <DiscoverContent />
    </AuthGate>
  );
}
