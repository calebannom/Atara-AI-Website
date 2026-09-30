import React, { useEffect, useMemo, useRef, useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useCounselor } from '../context/CounselorContext';
import { useAuth, ROLE } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Send, Shield, Clock, CheckCircle, XCircle, ChevronLeft,
  Filter, Tag, UserCheck, Archive, HandHelping, Eye, EyeOff,
  UserPlus, Ban, Award, Mail, Briefcase, Calendar, Users, RefreshCw,
} from 'lucide-react';
import { moodLabels } from '../constants/theme';
import { CRISIS_LINES } from '../constants/crisisResources';
import MoodFace from '../components/MoodFace';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './CounselorChat.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Requested me' },
  { id: 'open', label: 'Open & unclaimed' },
  { id: 'mine', label: 'Mine' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_STYLE = {
  open:   { text: 'Open',   color: '#f59e0b', Icon: Clock },
  claimed:{ text: 'Claimed',color: '#10b981', Icon: UserCheck },
  closed: { text: 'Closed', color: '#6b7280', Icon: XCircle },
};

const PRIORITY_STYLE = {
  low:    { color: '#10b981' },
  normal: { color: '#3b82f6' },
  high:   { color: '#f59e0b' },
  urgent: { color: '#ef4444' },
};

const DASH_TAB = {
  TICKETS: 'tickets',
  APPROVALS: 'approvals',
};

function CounselorDashboardContent() {
  const { user } = useAuth();
  const {
    isCounselor, isAdmin, allTickets, loading,
    claimTicket, sendCounselorMessage, closeTicketAsCounselor,
    getTicketById, getUserTicketMessages, subscribeToTicketMessages,
    anonymousMode, toggleAnonymousMode,
    pendingApplications, approveCounselor, rejectCounselor,
    syncMissingCounselorProfiles,
  } = useCounselor();
  const { confirm, Dialog } = useConfirm();

  const [activeTab, setActiveTab] = useState(DASH_TAB.TICKETS);
  const [activeFilter, setActiveFilter] = useState('open');
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const bottomRef = useRef(null);

  const activeTicket = activeTicketId ? getTicketById(activeTicketId) : null;
  const activeMessages = activeTicket ? getUserTicketMessages(activeTicketId) : [];
  const selectedApp = selectedAppId ? pendingApplications.find((a) => a.id === selectedAppId) : null;

  const filtered = useMemo(() => {
    const uid = user?.uid;
    switch (activeFilter) {
      case 'open':      return allTickets.filter((t) => t.status === 'open');
      case 'requested': return allTickets.filter((t) => t.requestedCounselorId === uid && t.status !== 'closed');
      case 'mine':      return allTickets.filter((t) => t.claimedBy === uid);
      case 'closed':    return allTickets.filter((t) => t.status === 'closed');
      default:       return allTickets;
    }
  }, [allTickets, activeFilter, user?.uid]);

  useEffect(() => {
    if (!activeTicketId) return;
    const unsub = subscribeToTicketMessages(activeTicketId);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeTicketId, subscribeToTicketMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeMessages.length, activeTicketId]);

  const renderDate = (raw) => {
    try {
      const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw || 0);
      return d.toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', year: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleClaim = async () => {
    if (!activeTicket || activeTicket.status !== 'open') return;
    try { await claimTicket(activeTicket.id); } catch (e) { if (import.meta.env.DEV) console.warn(e); }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!activeTicket || !message.trim()) return;
    const text = message;
    setMessage('');
    try { await sendCounselorMessage(activeTicket.id, text); } catch (e) { if (import.meta.env.DEV) console.warn(e); }
  };

  const handleClose = async () => {
    if (!activeTicket) return;
    await confirm({
      title: 'Close ticket?',
      message: `Closing ticket ${activeTicket.anonymousCode}. The user will see "conversation closed" but can still open a new ticket later.`,
      confirmLabel: 'Close ticket',
      tone: 'neutral',
      onConfirm: async () => {
        await closeTicketAsCounselor(activeTicket.id);
        setActiveTicketId(null);
      },
    });
  };

  const handleApprove = async (appId) => {
    const app = pendingApplications.find((a) => a.id === appId);
    if (!app) return;
    await confirm({
      title: 'Approve this counselor?',
      message: `Approve ${app.displayName} (${app.email}) as a counselor? They'll gain immediate access to the counselor desk. This cannot be undone from here.`,
      confirmLabel: 'Approve counselor',
      tone: 'safe',
      icon: <CheckCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />,
      onConfirm: async () => {
        try {
          await approveCounselor(appId);
          setSelectedAppId(null);
        } catch (e) {
          if (import.meta.env.DEV) console.warn(e);
        }
      },
    });
  };

  const handleRejectOpen = () => setShowReject(true);
  const handleRejectCancel = () => { setShowReject(false); setRejectReason(''); };

  const handleSyncDirectory = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMissingCounselorProfiles();
      setSyncResult(result);
    } catch (e) {
      if (import.meta.env.DEV) console.warn(e);
      setSyncResult({ error: true });
    } finally {
      setSyncing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedApp) return;
    try {
      await rejectCounselor(selectedApp.id, rejectReason.trim());
      setSelectedAppId(null);
      setShowReject(false);
      setRejectReason('');
    } catch (e) {
      if (import.meta.env.DEV) console.warn(e);
    }
  };

  if (!isCounselor && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="counselor-page">
      <div className="crisis-banner crisis-banner-counselor" role="alert">
        <Shield size={18} className="crisis-icon" />
        <div className="crisis-body">
          <strong>Counselor view.</strong> Please report any imminent risk of harm per your employer/professional protocols.
          Ghana crisis: {CRISIS_LINES[0].name} {CRISIS_LINES[0].number} · {CRISIS_LINES[1].name} {CRISIS_LINES[1].number} ·
          Outside Ghana: <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.
        </div>
      </div>

      <div className="counselor-page-head">
        <div className="page-head-text" style={{ flex: 1 }}>
          <div className="page-icon-badge page-icon-primary"><HandHelping size={18} /></div>
          <div>
            <h1 className="page-title">Counselor desk</h1>
            <p className="page-head-sub">{isAdmin ? 'Admin access — review tickets and counselor applications' : 'Support people anonymously. All user data is redacted.'}</p>
          </div>
        </div>
        <label
          className="anon-toggle"
          title={anonymousMode ? 'Hide user identity (default)' : 'Show any identity fields the user typed'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            borderRadius: 999,
            background: anonymousMode ? 'rgba(0,201,167,0.12)' : 'rgba(30,64,175,0.1)',
            border: `1px solid ${anonymousMode ? 'rgba(0,201,167,0.28)' : 'rgba(30,64,175,0.25)'}`,
            fontSize: 12, fontWeight: 600,
            color: anonymousMode ? 'var(--color-accent-dark, #0C2A7A)' : 'var(--color-primary)',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={anonymousMode}
            onChange={toggleAnonymousMode}
            style={{ display: 'none' }}
          />
          {anonymousMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {anonymousMode ? 'Anonymous mode ON' : 'Anonymous mode OFF'}
        </label>
      </div>

      {isAdmin && (
        <div className="dash-filter-row" style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--color-border-soft)' }}>
          <button
            onClick={() => { setActiveTab(DASH_TAB.TICKETS); setActiveTicketId(null); setSelectedAppId(null); }}
            className={`dash-filter ${activeTab === DASH_TAB.TICKETS ? 'dash-filter-active' : ''}`}
            style={{ padding: '8px 14px' }}
          >
            <HandHelping size={14} style={{ marginRight: 6 }} />
            Tickets
            <span className="dash-filter-count">{allTickets.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab(DASH_TAB.APPROVALS); setActiveTicketId(null); setSelectedAppId(null); }}
            className={`dash-filter ${activeTab === DASH_TAB.APPROVALS ? 'dash-filter-active' : ''}`}
            style={{ padding: '8px 14px' }}
          >
            <UserPlus size={14} style={{ marginRight: 6 }} />
            Approvals
            <span className="dash-filter-count">{pendingApplications.length}</span>
          </button>
        </div>
      )}

      {loading ? (
        <p className="journal-empty">Loading…</p>
      ) : activeTab === DASH_TAB.APPROVALS && isAdmin ? (
        !selectedAppId ? (
          <>
            <div className="dash-stats">
              <div className="stat-pill"><span>Pending</span><strong>{pendingApplications.length}</strong></div>
              <div className="stat-pill"><span>Tickets open</span><strong>{allTickets.filter((t) => t.status === 'open').length}</strong></div>
              <div className="stat-pill"><span>Counselors active</span><strong>{new Set(allTickets.filter((t) => t.claimedBy).map((t) => t.claimedBy)).size}</strong></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '4px 0 20px' }}>
              <button
                className="btn-secondary"
                onClick={handleSyncDirectory}
                disabled={syncing}
                title="Find any counselor accounts whose role was edited directly in Firestore and backfill their public directory entry, without waiting for them to log in."
              >
                <RefreshCw size={13} className={syncing ? 'spin' : ''} style={{ marginRight: 6 }} />
                {syncing ? 'Syncing…' : 'Sync counselor directory'}
              </button>
              {syncResult && !syncResult.error && (
                <span style={{ fontSize: 12.5, color: 'var(--color-ink-secondary)' }}>
                  {syncResult.synced === 0
                    ? `All ${syncResult.checked} counselor account${syncResult.checked === 1 ? '' : 's'} already have a directory entry.`
                    : `Added ${syncResult.synced} missing directory entr${syncResult.synced === 1 ? 'y' : 'ies'} (checked ${syncResult.checked} counselor account${syncResult.checked === 1 ? '' : 's'}).`}
                </span>
              )}
              {syncResult?.error && (
                <span style={{ fontSize: 12.5, color: 'var(--color-error)' }}>
                  Couldn't sync — check the console for details.
                </span>
              )}
            </div>

            {pendingApplications.length === 0 ? (
              <div className="counselor-empty">
                <Award size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p>No pending counselor applications. Check back later.</p>
              </div>
            ) : (
              <ul className="ticket-list ticket-list-dash">
                {pendingApplications.map((a) => (
                  <li key={a.id}>
                    <button className="ticket-item ticket-item-dash" onClick={() => setSelectedAppId(a.id)}>
                      <div className="ticket-item-head">
                        <span className="ticket-code" style={{ background: 'rgba(30,64,175,0.1)', color: 'var(--color-primary)' }}>
                          <Clock size={12} style={{ marginRight: 4 }} />
                          Pending
                        </span>
                        <span className="ticket-status" style={{ color: '#f59e0b' }}>
                          <Mail size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                          {a.email}
                        </span>
                      </div>
                      <div className="ticket-tags">
                        {a.specialization && (
                          <span className="pri-tag pri-tag-mood">
                            <Briefcase size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            {a.specialization}
                          </span>
                        )}
                        {a.yearsExperience != null && (
                          <span className="pri-tag" style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                            <Calendar size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            {a.yearsExperience} yr{a.yearsExperience === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <p className="ticket-subject"><strong style={{ color: 'var(--color-ink)' }}>{a.displayName}</strong></p>
                      <p className="ticket-meta">
                        Applied · {renderDate(a.requestedAt || a.createdAt)}
                        {a.licenseNumber && <> · License: {a.licenseNumber}</>}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : selectedApp ? (
          <div className="counselor-chat">
            <div className="chat-head">
              <button className="back-btn" onClick={() => setSelectedAppId(null)} aria-label="Back">
                <ChevronLeft size={18} />
              </button>
              <div>
                <div className="chat-head-row">
                  <p className="chat-head-title">Application review</p>
                </div>
                <p className="chat-head-status" style={{ color: '#f59e0b' }}>
                  <Clock size={12} style={{ marginRight: 6, verticalAlign: -1 }} />
                  Awaiting your decision
                </p>
              </div>
              <div className="chat-head-actions">
                <button
                  className="close-convo-btn"
                  style={{ background: 'rgba(30,64,175,0.08)', color: '#ef4444', border: '1px solid rgba(30,64,175,0.2)' }}
                  onClick={handleRejectOpen}
                >
                  <Ban size={14} /> Reject
                </button>
                <button
                  className="claim-btn"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                  onClick={() => handleApprove(selectedApp.id)}
                >
                  <CheckCircle size={14} /> Approve
                </button>
              </div>
            </div>

            <div style={{ padding: 20, maxWidth: 760, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(30,64,175,0.1)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700,
                }}>
                  {selectedApp.displayName?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontFamily: 'var(--font-display)' }}>{selectedApp.displayName}</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-ink-secondary)', fontSize: 13 }}>
                    <Mail size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {selectedApp.email}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10, marginBottom: 20,
              }}>
                {[
                  { Icon: Briefcase, label: 'Specialization', value: selectedApp.specialization || '—' },
                  { Icon: Award, label: 'License #', value: selectedApp.licenseNumber || 'Not provided' },
                  { Icon: Calendar, label: 'Experience', value: selectedApp.yearsExperience != null ? `${selectedApp.yearsExperience} year${selectedApp.yearsExperience === 1 ? '' : 's'}` : 'Not provided' },
                  { Icon: Clock, label: 'Applied', value: renderDate(selectedApp.requestedAt || selectedApp.createdAt) },
                ].map(({ Icon, label, value }) => (
                  <div key={label} style={{
                    padding: '12px 14px',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-border-soft)',
                    borderRadius: 'var(--radius)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600, marginBottom: 4 }}>
                      <Icon size={12} /> {label}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              {selectedApp.bio ? (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border-soft)',
                  borderRadius: 'var(--radius)',
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600, marginBottom: 6 }}>
                    <Users size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                    Applicant bio
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-ink)', whiteSpace: 'pre-wrap' }}>
                    {selectedApp.bio}
                  </p>
                </div>
              ) : null}

              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: 'rgba(30,64,175,0.06)',
                border: '1px solid rgba(30,64,175,0.14)',
                borderRadius: 'var(--radius)',
                fontSize: 13, color: 'var(--color-ink-secondary)',
                lineHeight: 1.55,
              }}>
                <strong style={{ color: 'var(--color-primary)' }}>Before approving:</strong> verify licensure with the issuing body if applicable.
                Approved counselors can claim tickets, send replies, and view user-submitted (non-account) info.
                Rejected applicants revert to regular user accounts and retain their personal data (moods, journals, etc.).
              </div>
            </div>

            {showReject && (
              <div className="confirm-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleRejectCancel(); }} role="dialog" aria-modal="true">
                <div className="confirm-dialog">
                  <h2 className="confirm-title" style={{ color: 'var(--color-error)' }}>
                    <Ban size={18} style={{ marginRight: 8 }} />
                    Reject this application?
                  </h2>
                  <p className="confirm-body">
                    Rejecting will revert <strong>{selectedApp.displayName}</strong> to a regular user account.
                    Their personal Atara data (moods, journals, goals) stays intact. You can optionally include a reason.
                  </p>
                  <label className="field-label" style={{ display: 'block' }}>
                    Reason for rejection <span className="field-hint">(optional)</span>
                    <textarea
                      className="counselor-textarea"
                      rows={3}
                      placeholder="e.g. Unable to verify license. Please re-submit with documentation."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                      style={{ marginTop: 6 }}
                    />
                  </label>
                  <div className="confirm-actions">
                    <button type="button" className="confirm-cancel" onClick={handleRejectCancel}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="confirm-confirm"
                      onClick={handleRejectSubmit}
                    >
                      Reject application
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null
      ) : !activeTicketId ? (
        <>
          <div className="dash-stats">
            <div className="stat-pill"><span>Open</span><strong>{allTickets.filter((t) => t.status === 'open').length}</strong></div>
            <div className="stat-pill"><span>Mine</span><strong>{allTickets.filter((t) => t.claimedBy === user?.uid).length}</strong></div>
            <div className="stat-pill"><span>Closed</span><strong>{allTickets.filter((t) => t.status === 'closed').length}</strong></div>
            <div className="stat-pill"><span>All</span><strong>{allTickets.length}</strong></div>
          </div>

          <div className="dash-filter-row">
            <Filter size={16} />
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`dash-filter ${activeFilter === f.id ? 'dash-filter-active' : ''}`}
              >
                {f.label}
                <span className="dash-filter-count">{
                  f.id === 'all' ? allTickets.length
                  : f.id === 'mine' ? allTickets.filter((t) => t.claimedBy === user?.uid).length
                  : f.id === 'requested' ? allTickets.filter((t) => t.requestedCounselorId === user?.uid && t.status !== 'closed').length
                  : allTickets.filter((t) => t.status === f.id).length
                }</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="counselor-empty">
              <HandHelping size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>No tickets in this view. Switch filters or check back later.</p>
            </div>
          ) : (
            <ul className="ticket-list ticket-list-dash">
              {filtered.map((t) => {
                const st = STATUS_STYLE[t.status] || STATUS_STYLE.open;
                const StIc = st.Icon;
                const pri = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.normal;
                const showCode = anonymousMode || t.anonymous !== false;
                return (
                  <li key={t.id}>
                    <button className="ticket-item ticket-item-dash" onClick={() => setActiveTicketId(t.id)}>
                      <div className="ticket-item-head">
                        <span className="ticket-code">{showCode ? `#${t.anonymousCode}` : `User: ${t.userId.slice(0, 6)}…`}</span>
                        <span className="ticket-status" style={{ color: st.color }}>
                          <StIc size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                          {st.text}
                        </span>
                      </div>
                      <div className="ticket-tags">
                        <span className="pri-tag" style={{ color: pri.color, borderColor: pri.color }}>
                          <Tag size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                          {(t.priority || 'normal').toUpperCase()}
                        </span>
                        {t.initialMood && (
                          <span className="pri-tag pri-tag-mood">
                            <MoodFace mood={t.initialMood} size={14} /> {moodLabels[t.initialMood] || t.initialMood}
                          </span>
                        )}
                        {t.claimedByName && t.status !== 'closed' && (
                          <span className="pri-tag pri-tag-counselor"><UserCheck size={10} style={{ marginRight: 3, verticalAlign: -1 }} />{t.claimedByName}</span>
                        )}
                        {t.requestedCounselorId && t.status !== 'closed' && (
                          <span
                            className="pri-tag"
                            style={{
                              color: t.requestedCounselorId === user?.uid ? 'var(--color-success)' : 'var(--color-ink-muted)',
                              borderColor: t.requestedCounselorId === user?.uid ? 'var(--color-success)' : 'var(--color-border)',
                            }}
                          >
                            <UserCheck size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            {t.requestedCounselorId === user?.uid ? 'Requested you' : `Requested ${t.requestedCounselorName || 'a counselor'}`}
                          </span>
                        )}
                        {t.anonymous === false && !anonymousMode && (
                          <span className="pri-tag" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                            <Eye size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            Named
                          </span>
                        )}
                      </div>
                      <p className="ticket-subject">{t.subject || '(No subject)'}</p>
                      <p className="ticket-meta">
                        {t.messageCount || 0} msgs · Last {renderDate(t.lastMessageAt)} · Opened {renderDate(t.createdAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <div className="counselor-chat">
          <div className="chat-head">
            <button className="back-btn" onClick={() => setActiveTicketId(null)} aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="chat-head-row">
                <p className="chat-head-title">
                  {anonymousMode || activeTicket.anonymous !== false ? (
                    <>Anonymous user <code className="ticket-code-badge">#{activeTicket.anonymousCode}</code></>
                  ) : (
                    <>User conversation <code className="ticket-code-badge">#{activeTicket.anonymousCode}</code></>
                  )}
                </p>
              </div>
              <p className="chat-head-status" style={{ color: (STATUS_STYLE[activeTicket.status] || STATUS_STYLE.open).color }}>
                {(STATUS_STYLE[activeTicket.status] || STATUS_STYLE.open).text}
                {activeTicket.claimedByName ? ` · ${activeTicket.claimedByName}` : ''}
              </p>
            </div>
            <div className="chat-head-actions">
              {activeTicket.status === 'open' && (
                <button className="claim-btn" onClick={handleClaim}>
                  <UserCheck size={14} /> Claim
                </button>
              )}
              {activeTicket.status !== 'closed' && (
                <button className="close-convo-btn" onClick={handleClose}>
                  <Archive size={14} /> Close
                </button>
              )}
            </div>
          </div>

          <div className="counselor-messages" aria-live="polite">
            <div className={`anony-notice anony-notice-counselor ${anonymousMode ? '' : 'anony-notice-named'}`}>
              {anonymousMode ? (
                <><Shield size={14} /> Anonymous user. All account fields (name, email) are hidden from you.</>
              ) : (
                <><Eye size={14} /> Identity fields shown. Respect confidentiality and only use disclosures the user typed in-thread.</>
              )}
            </div>
            {activeMessages.map((m) => {
              const isCounselorMsg = m.sender === 'counselor';
              const showSenderName = !anonymousMode || isCounselorMsg;
              return (
                <div key={m.id} className={`cc-row ${isCounselorMsg ? 'cc-row-user' : 'cc-row-counselor'}`}>
                  <div className={`cc-bubble ${isCounselorMsg ? 'cc-bubble-user' : 'cc-bubble-counselor'}`}>
                    {m.sender === 'user' && (
                      <p className="cc-counselor-name">
                        {showSenderName && m.senderName ? m.senderName : 'Anonymous user'}
                      </p>
                    )}
                    {isCounselorMsg && <p className="cc-counselor-name">{m.senderName || 'You'}</p>}
                    <p className="cc-text">{m.text}</p>
                    <p className="cc-time">{renderDate(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            {activeTicket.status === 'open' && (
              <div className="cc-waiting">
                <Clock size={16} />
                Ticket is open and waiting. Claim it to start replying.
              </div>
            )}
            {activeTicket.status === 'closed' && (
              <div className="cc-closed">
                <Archive size={16} />
                Ticket closed.
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {activeTicket.status !== 'closed' && (
            <form onSubmit={handleSend} className="chat-input-bar counselor-input-bar">
              <input
                className="chat-input"
                placeholder={
                  activeTicket.status === 'open'
                    ? 'Claim the ticket to send your first message…'
                    : 'Write a supportive reply…'
                }
                value={message}
                disabled={activeTicket.status === 'open'}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                maxLength={4000}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={activeTicket.status === 'open' || !message.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      )}

      {Dialog}
    </div>
  );
}

export default function CounselorDashboardPage() {
  return (
    <AuthGate requireRole={[ROLE.COUNSELOR, ROLE.ADMIN]}>
      <CounselorDashboardContent />
    </AuthGate>
  );
}
