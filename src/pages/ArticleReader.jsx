import React from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { ARTICLES } from '../constants/discoverContent';
import { ArrowLeft, Clock, BookOpen } from 'lucide-react';
import './Page.css';
import './ArticleReader.css';

function ArticleReaderContent() {
  const { id } = useParams();
  const article = ARTICLES.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="article-reader-page">
        <Link to="/discover" className="ar-back-link"><ArrowLeft size={14} /> Back to Discover</Link>
        <div className="cs-empty" style={{ marginTop: 24 }}>
          <p>We couldn't find that article. It may have been moved or removed.</p>
        </div>
      </div>
    );
  }

  const idx = ARTICLES.findIndex((a) => a.id === id);
  const next = ARTICLES[(idx + 1) % ARTICLES.length];

  return (
    <div className="article-reader-page">
      <Link to="/discover" className="ar-back-link"><ArrowLeft size={14} /> Back to Discover</Link>

      <div className="ar-hero" style={{ backgroundImage: `url(${article.image})` }}>
        <span className="discover-card-tag ar-hero-tag">{article.category}</span>
      </div>

      <h1 className="page-title ar-title">{article.title}</h1>
      {article.readTime && (
        <p className="ar-meta"><Clock size={13} /> {article.readTime}</p>
      )}

      <div className="ar-body">
        {article.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="ar-next-card">
        <p className="ar-next-label"><BookOpen size={14} /> Keep reading</p>
        <Link to={`/discover/${next.id}`} className="ar-next-link">
          {next.title}
        </Link>
      </div>
    </div>
  );
}

export default function ArticleReaderPage() {
  return (
    <AuthGate>
      <ArticleReaderContent />
    </AuthGate>
  );
}
