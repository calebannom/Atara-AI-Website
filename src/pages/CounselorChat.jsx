import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useCounselor } from '../context/CounselorContext';
import { useMood } from '../context/MoodContext';
import { useAuth } from '../context/AuthContext';
import {
  Send, MessageCircleHeart, AlertTriangle, Clock, CheckCircle, XCircle,
  ShieldCheck, Sparkles, Plus, ChevronLeft, EyeOff, Eye,
} from 'lucide-react';
import { moodLabels } from '../constants/theme';
import { CRISIS_LINES } from '../constants/crisisResources';
import MoodFace from '../components/MoodFace';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './CounselorChat.css';

const MOODS = ['awful', 'bad', 'meh', 'good', 'rad'];
const USER_ANON_KEY = 'atara_user_anon_mode';

const STATUS_LABEL = {
  open: { text: 'Waiting for counselor', color: '#f59e0b', Icon: Clock },
  claimed: { text: 'Counselor connected', color: '#10b981', Icon: CheckCircle },
  closed: { text: 'Conversation closed', color: '#6b7280', Icon: XCircle },
};

function CounselorChatContent() {
  const {
    userTickets, createTicket, getUserTicketMessages,
    sendUserMessage, closeUserTicket, subscribeToTicketMessages, loading,
  } = useCounselor();
  const { user } = useAuth();
  const { confirm, Dialog } = useConfirm();
  const { moods } = useMood();
  const todayMood = moods.find((m) => m.date === new Date().toISOString().split('T')[0]);
  const location = useLocation();
  const navigate = useNavigate();
  const requestedCounselor = location.state?.requestedCounselorId
    ? { id: location.state.requestedCounselorId, name: location.state.requestedCounselorName }
    : null;

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [initialMood, setInitialMood] = useState(todayMood?.mood || '');
  const [introText, setIntroText] = useState('');
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);
  const [userAnonMode, setUserAnonMode] = useState(() => {
    try {
      const raw = window.localStorage.getItem(USER_ANON_KEY);
      return raw == null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  const toggleUserAnon = () => {
    setUserAnonMode((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(USER_ANON_KEY, String(next)); } catch {}
      return next;
    });
  };

  const activeTicket = userTickets.find((t) => t.id === activeTicketId) || null;
  const activeMessages = activeTicket ? getUserTicketMessages(activeTicketId) : [];

  useEffect(() => {
    if (!activeTicketId) return;
    const unsub = subscribeToTicketMessages(activeTicketId);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeTicketId, subscribeToTicketMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeMessages.length, activeTicketId, composing]);

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (composing) return;
    setComposing(true);
    try {
      const tid = await createTicket({
        subject,
        initialMood,
        introText,
        anonymous: userAnonMode,
        requestedCounselorId: requestedCounselor?.id,
        requestedCounselorName: requestedCounselor?.name,
      });
      setActiveTicketId(tid);
      setSubject('');
      setInitialMood('');
      setIntroText('');
      // Clear the requested-counselor state so a second new ticket
      // doesn't silently re-request the same counselor.
      navigate(location.pathname, { replace: true, state: null });
    } finally {
      setComposing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!activeTicketId || !message.trim()) return;
    const text = message;
    setMessage('');
    try {
      await sendUserMessage(activeTicketId, text);
    } catch (e) {
      if (import.meta.env.DEV) console.warn(e);
    }
  };

  const handleClose = async () => {
    if (!activeTicket) return;
    await confirm({
      title: 'Close this conversation?',
      message: 'Closing the conversation means the counselor will consider it resolved. You can always open a new ticket later.',
      tone: 'neutral',
      confirmLabel: 'Close conversation',
      onConfirm: async () => {
        await closeUserTicket(activeTicket.id);
        setActiveTicketId(null);
      },
    });
  };

  const renderDate = (raw) => {
    try {
      const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw || 0);
      return d.toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const status = activeTicket ? STATUS_LABEL[activeTicket.status] || STATUS_LABEL.open : null;
  const StatusIcon = status?.Icon;

  return (
    <div className="counselor-page">
      <div className="crisis-banner" role="alert">
        <AlertTriangle size={18} className="crisis-icon" />
        <div className="crisis-body">
          <strong>Not for emergencies.</strong> If you or someone you know is in immediate danger or having thoughts of self-harm,
          call your local emergency number. In Ghana, call the {CRISIS_LINES[0].name} at <strong>{CRISIS_LINES[0].number}</strong> or
          the {CRISIS_LINES[1].name} at <strong>{CRISIS_LINES[1].number}</strong>.
          Outside Ghana: <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.
        </div>
      </div>

      <div className="counselor-page-head">
        <div className="page-head-text" style={{ flex: 1 }}>
          <div className="page-icon-badge page-icon-bloom"><MessageCircleHeart size={18} /></div>
          <div>
            <h1 className="page-title">Talk to a counselor</h1>
            <p className="page-head-sub">Anonymous by default — one-on-one with a human counselor</p>
          </div>
        </div>
        {!activeTicketId && (
          <label
            title={userAnonMode ? 'Anonymous — counselor never sees your account info' : 'Named — your display name is visible to the counselor'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              background: userAnonMode ? 'rgba(0,201,167,0.12)' : 'rgba(30,64,175,0.1)',
              border: `1px solid ${userAnonMode ? 'rgba(0,201,167,0.28)' : 'rgba(30,64,175,0.25)'}`,
              fontSize: 12, fontWeight: 600,
              color: userAnonMode ? 'var(--color-accent-dark, #0C2A7A)' : 'var(--color-primary)',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={userAnonMode}
              onChange={toggleUserAnon}
              style={{ display: 'none' }}
            />
            {userAnonMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {userAnonMode ? 'Anonymous' : 'Named'}
          </label>
        )}
      </div>

      <div className="anony-badge">
        {userAnonMode ? (
          <><ShieldCheck size={16} /> <span>Anonymous by default. No account info (name, email) is shared with the counselor — unless you type it.</span></>
        ) : (
          <><Eye size={16} /> <span>Named mode. Your display name (<strong>{user?.displayName || 'you'}</strong>) will be visible to the counselor. Account email is never shared automatically.</span></>
        )}
      </div>

      {loading ? (
        <p className="journal-empty">Loading…</p>
      ) : !activeTicketId ? (
        <>
          <div className="counselor-grid">
            <section className="counselor-card">
              <h2 className="counselor-card-title">
                <Sparkles size={16} style={{ marginRight: 8 }} />
                Start a new conversation
              </h2>
              {requestedCounselor && (
                <div className="auth-banner auth-banner-success" style={{ marginBottom: 14 }}>
                  <MessageCircleHeart size={16} style={{ color: 'var(--color-primary)', marginTop: 1 }} />
                  <div>
                    <strong>Requesting {requestedCounselor.name}.</strong> They'll see this conversation is meant for them first.{' '}
                    <button
                      type="button"
                      onClick={() => navigate(location.pathname, { replace: true, state: null })}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Talk to next available counselor instead
                    </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleCreate} className="counselor-form">
                <label className="field-label">
                  What would you like to talk about?
                  <span className="field-hint">Optional — counselors use this to prioritize.</span>
                  <input
                    className="counselor-input"
                    placeholder="e.g. feeling overwhelmed at work"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={120}
                    disabled={composing}
                  />
                </label>
                <label className="field-label">
                  How are you feeling right now?
                  <div className="chip-row">
                    {MOODS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        className={`mood-chip ${initialMood === m ? 'mood-chip-active' : ''}`}
                        onClick={() => setInitialMood(initialMood === m ? '' : m)}
                        disabled={composing}
                      >
                        <MoodFace mood={m} size={20} />
                        <span>{moodLabels[m]}</span>
                      </button>
                    ))}
                  </div>
                </label>
                <label className="field-label">
                  Share anything that's on your mind
                  <span className="field-hint">Optional — but writing helps the counselor jump in.</span>
                  <textarea
                    className="counselor-textarea"
                    rows={5}
                    placeholder="Take your time — there's no pressure to share anything you don't want to."
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    maxLength={2000}
                    disabled={composing}
                  />
                </label>
                <button type="submit" className="btn-primary" disabled={composing}>
                  {composing ? 'Connecting…' : requestedCounselor ? `Request ${requestedCounselor.name.split(' ')[0]}` : 'Request a counselor'}
                </button>
              </form>
            </section>

            <section className="counselor-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="counselor-card-title">
                  <Plus size={16} style={{ marginRight: 8 }} />
                  Your past conversations
                </h2>
                <span className="ticket-count">{userTickets.length}</span>
              </div>
              {userTickets.length === 0 ? (
                <div className="counselor-empty">
                  <MessageCircleHeart size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p>No conversations yet. Your first one starts on the left.</p>
                </div>
              ) : (
                <ul className="ticket-list">
                  {userTickets.map((t) => {
                    const st = STATUS_LABEL[t.status] || STATUS_LABEL.open;
                    const Ic = st.Icon;
                    return (
                      <li key={t.id}>
                        <button className="ticket-item" onClick={() => setActiveTicketId(t.id)}>
                          <div className="ticket-item-head">
                            <span className="ticket-code">#{t.anonymousCode}</span>
                            <span className="ticket-status" style={{ color: st.color }}>
                              <Ic size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                              {st.text}
                            </span>
                          </div>
                          <p className="ticket-subject">{t.subject || '(No subject)'}</p>
                          <p className="ticket-meta">
                            {t.requestedCounselorName && `Requested ${t.requestedCounselorName} · `}
                            Last message · {renderDate(t.lastMessageAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="counselor-chat">
          <div className="chat-head">
            <button className="back-btn" onClick={() => setActiveTicketId(null)} aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="chat-head-row">
                <p className="chat-head-title">Conversation <code className="ticket-code-badge">#{activeTicket.anonymousCode}</code></p>
              </div>
              <p className="chat-head-status" style={{ color: status?.color }}>
                {StatusIcon && <StatusIcon size={13} style={{ marginRight: 6, verticalAlign: -1 }} />}
                {status?.text}
                {activeTicket.claimedByName && activeTicket.status !== 'closed' && (
                  <span className="chat-counselor-with">· with {activeTicket.claimedByName}</span>
                )}
              </p>
            </div>
            {activeTicket.status !== 'closed' && (
              <button className="close-convo-btn" onClick={handleClose}>Close</button>
            )}
          </div>

          <div className="counselor-messages" aria-live="polite">
            <div className="anony-notice">
              <ShieldCheck size={14} />
              {activeTicket.anonymous === false
                ? 'Named session — your display name may be visible. Do not share your real address or financial information.'
                : 'Anonymous session. Do not share your real name, address, or financial information.'}
            </div>
            {activeMessages.map((m) => (
              <div key={m.id} className={`cc-row ${m.sender === 'user' ? 'cc-row-user' : 'cc-row-counselor'}`}>
                <div className={`cc-bubble ${m.sender === 'user' ? 'cc-bubble-user' : 'cc-bubble-counselor'}`}>
                  {m.sender === 'counselor' && (
                    <p className="cc-counselor-name">{m.senderName || 'Counselor'}</p>
                  )}
                  <p className="cc-text">{m.text}</p>
                  <p className="cc-time">{renderDate(m.createdAt)}</p>
                </div>
              </div>
            ))}
            {activeTicket.status === 'open' && (
              <div className="cc-waiting">
                <Clock size={16} />
                <span>
                  {activeTicket.requestedCounselorName
                    ? `Waiting for ${activeTicket.requestedCounselorName} to join. They've been notified this conversation is for them.`
                    : "We're finding the next available counselor. Typical wait: a few minutes to an hour, depending on volume."}
                </span>
              </div>
            )}
            {activeTicket.status === 'closed' && (
              <div className="cc-closed">
                <XCircle size={16} />
                This conversation has been closed. Feel free to open a new ticket anytime.
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {activeTicket.status !== 'closed' && (
            <form onSubmit={handleSendMessage} className="chat-input-bar counselor-input-bar">
              <input
                className="chat-input"
                placeholder="Write a message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                maxLength={4000}
              />
              <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
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

export default function CounselorChatPage() {
  return (
    <AuthGate>
      <CounselorChatContent />
    </AuthGate>
  );
}
