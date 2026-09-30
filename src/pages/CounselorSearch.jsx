import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useCounselor } from '../context/CounselorContext';
import { SPECIALTIES } from '../constants/specialties';
import { Search, Users, Award, ChevronRight, ChevronLeft, UserCircle } from 'lucide-react';
import './Page.css';
import './CounselorSearch.css';

function initials(name) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const PAGE_SIZE = 8;

function CounselorSearchContent() {
  const { counselors, loading, counselorsError } = useCounselor();
  const [term, setTerm] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return counselors.filter((c) => {
      const matchesSpecialty = !specialty || c.specialization === specialty;
      const haystack = `${c.displayName || ''} ${c.specialization || ''} ${c.bio || ''}`.toLowerCase();
      const matchesTerm = !term.trim() || haystack.includes(term.trim().toLowerCase());
      return matchesSpecialty && matchesTerm;
    });
  }, [counselors, term, specialty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);

  return (
    <div className="cs-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-primary"><Users size={16} /></div>
            <div>
              <h1 className="page-title">Counselors</h1>
              <p className="page-head-sub">Browse verified counselors and choose who you&apos;d like to talk to</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cs-filter-bar">
        <div className="cs-search-field">
          <Search size={15} className="cs-search-icon" />
          <input
            type="text"
            placeholder="Search by name or keyword…"
            value={term}
            onChange={(e) => { setTerm(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="cs-specialty-select form-input"
          value={specialty}
          onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}
        >
          <option value="">All specializations</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="cs-result-count">
          {filtered.length} counselor{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {loading ? (
        <div className="cs-empty-state card">
          <p className="cs-empty-text">Loading counselors…</p>
        </div>
      ) : counselorsError ? (
        <div className="cs-empty-state card">
          <UserCircle size={32} className="cs-empty-icon" />
          <p className="cs-empty-text">
            We couldn&apos;t load the counselor directory ({counselorsError}). This usually means the
            Firestore security rules for this project haven&apos;t been deployed yet — ask an admin to
            run <code>firebase deploy --only firestore:rules</code>, or paste firestore.rules into the
            Firebase Console&apos;s Rules editor.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cs-empty-state card">
          <UserCircle size={32} className="cs-empty-icon" />
          <p className="cs-empty-text">
            {counselors.length === 0
              ? 'No verified counselors are available yet. Check back soon, or start an anonymous conversation and the next available counselor will help you.'
              : 'No counselors match your search. Try a different keyword or specialization.'}
          </p>
          {counselors.length === 0 && (
            <Link to="/counselor-chat" className="btn-primary" style={{ marginTop: 14 }}>
              Talk to next available counselor
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="card cs-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}></th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th style={{ width: 130 }}>Experience</th>
                  <th>Bio</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cs-avatar">{initials(c.displayName)}</div>
                    </td>
                    <td className="cs-name-cell">
                      <span className="cs-name">{c.displayName || 'Counselor'}</span>
                    </td>
                    <td>
                      {c.specialization && <span className="chip chip-primary">{c.specialization}</span>}
                    </td>
                    <td>
                      {typeof c.yearsExperience === 'number' ? (
                        <span className="cs-exp">
                          <Award size={12} /> {c.yearsExperience} yrs
                        </span>
                      ) : <span className="cs-exp-muted">—</span>}
                    </td>
                    <td className="cs-bio-cell">
                      {c.bio ? (
                        <span className="cs-bio">{c.bio}</span>
                      ) : <span className="cs-exp-muted">No bio provided</span>}
                    </td>
                    <td className="cs-action-cell">
                      <Link to={`/counselors/${c.id}`} className="cs-view-link">
                        View profile <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {startIdx + 1}–{endIdx} of {filtered.length}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`pagination-btn ${safePage === n ? 'pagination-btn-active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CounselorSearchPage() {
  return (
    <AuthGate>
      <CounselorSearchContent />
    </AuthGate>
  );
}
