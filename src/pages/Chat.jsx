import React, { useState, useRef, useEffect } from 'react';
import AuthGate from '../components/AuthGate';
import { useConfirm } from '../components/ConfirmDialog';
import { useChat } from '../context/ChatContext';
import { useMood } from '../context/MoodContext';
import { useJournal } from '../context/JournalContext';
import { useGoals } from '../context/GoalContext';
import { callAI } from '../services/aiService';
import { buildUserContextSummary } from '../services/userContext';
import { buildPersonaSystemPrompt } from '../constants/aiConfig';
import { PERSONAS, getPersona } from '../constants/personas';
import { useSpeechToText } from '../hooks/useSpeechToText';
import {
  Send, AlertCircle, EyeOff, Eye, Sparkles, Info,
  CloudRain, Waves, Flame, ChevronRight, ChevronDown, X, Mic, Square, PenSquare, History as HistoryIcon, Trash2,
} from 'lucide-react';
import './Chat.css';

const PERSONA_ICONS = { Sparkles, CloudRain, Waves, Flame };

function PersonaIcon({ icon, size = 20 }) {
  const Icon = PERSONA_ICONS[icon] || Sparkles;
  return <Icon size={size} />;
}

const SUGGESTED_PROMPTS = [
  "I've been feeling anxious lately",
  'Help me challenge negative thoughts',
  'I need some motivation today',
  'Talk me through a breathing exercise',
];

const AI_ANON_KEY = 'atara_ai_anon_mode';

/* The "Who would you like to talk to?" screen. Used both as the very
   first thing a new user sees, and as the overlay a returning user opens
   from the header to switch personas mid-session. */
function PersonaPicker({ activeId, onPick, onClose, embedded }) {
  return (
    <div className={`persona-picker ${embedded ? 'persona-picker-embedded' : ''}`}>
      {embedded && (
        <div className="persona-picker-head">
          <div>
            <p className="persona-picker-title">Switch who you&apos;re talking to</p>
            <p className="persona-picker-sub">Your other conversations are saved — nothing is lost.</p>
          </div>
          <button className="persona-picker-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}
      {!embedded && (
        <div className="persona-picker-intro">
          <img src="/logo-icon.png" alt="" className="persona-picker-logo" />
          <h1 className="persona-picker-h1">Atara</h1>
          <p className="persona-picker-lead">Who would you like to talk to?</p>
        </div>
      )}

      <div className="persona-list">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`persona-card persona-tone-${p.tone} ${activeId === p.id ? 'is-active' : ''}`}
            onClick={() => onPick(p.id)}
          >
            <span className="persona-card-icon"><PersonaIcon icon={p.icon} /></span>
            <span className="persona-card-text">
              <span className="persona-card-name">{p.name}</span>
              <span className="persona-card-subtitle">{p.subtitle}</span>
            </span>
            <ChevronRight size={16} className="persona-card-chevron" />
          </button>
        ))}
      </div>

      <p className="persona-picker-footnote">
        Each one remembers its own conversation with you, and you can switch between them
        any time from inside the chat.
      </p>
    </div>
  );
}

/* List of past + current chats with one persona. Picking one makes it the
   live conversation again — viewing and continuing it both just work. */
function SessionHistory({ sessions, onPick, onDelete, onClose }) {
  return (
    <div className="persona-picker persona-picker-embedded">
      <div className="persona-picker-head">
        <div>
          <p className="persona-picker-title">Your chats</p>
          <p className="persona-picker-sub">Pick one to pick up where you left off.</p>
        </div>
        <button className="persona-picker-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="persona-picker-footnote">
          No messages yet in this chat — say something first, then it'll show up here
          once you start a new one.
        </p>
      ) : (
        <div className="persona-list">
          {sessions.map((s) => (
            <div key={s.id} className={`persona-card session-card ${s.isActive ? 'is-active' : ''}`}>
              <button type="button" className="session-card-main" onClick={() => onPick(s.id)}>
                <span className="persona-card-icon"><HistoryIcon size={16} /></span>
                <span className="persona-card-text">
                  <span className="persona-card-name">{s.preview}</span>
                  <span className="persona-card-subtitle">
                    {s.lastTimestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    {' · '}{s.messageCount} message{s.messageCount === 1 ? '' : 's'}
                    {s.isActive ? ' · Current' : ''}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="session-card-delete"
                onClick={() => onDelete(s)}
                aria-label={`Delete chat: ${s.preview}`}
                title="Delete this chat"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatContent() {
  const {
    activePersonaId, setActivePersonaId, getPersonaMessages, getPersonaSessions, hasConversation,
    addMessage, startNewChat, switchSession, deleteSession, loading: chatLoading,
  } = useChat();
  const { confirm, Dialog } = useConfirm();
  const { moods, currentStreak } = useMood();
  const { journals } = useJournal();
  const { goals } = useGoals();

  // Null until the user has picked a persona at least once — that's what
  // triggers the full-screen picker instead of jumping straight to "Base".
  const [pickedOnce, setPickedOnce] = useState(() => {
    try { return window.localStorage.getItem('atara_persona_ever_picked') === 'true'; }
    catch { return false; }
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const bottomRef = useRef(null);
  const [aiAnonMode, setAiAnonMode] = useState(() => {
    try {
      const raw = window.localStorage.getItem(AI_ANON_KEY);
      return raw == null ? false : raw === 'true';
    } catch {
      return false;
    }
  });

  const toggleAiAnon = () => {
    setAiAnonMode((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(AI_ANON_KEY, String(next)); } catch {}
      return next;
    });
  };

  // Voice input: each finalized phrase gets appended to whatever's already
  // in the composer — same effect as typing it, so it's still editable and
  // still requires an explicit Send before anything reaches the AI.
  const appendVoiceChunk = (chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    setInput((prev) => (prev ? `${prev.trimEnd()} ${trimmed}` : trimmed));
  };
  const {
    supported: micSupported, listening, interimText, error: voiceError,
    start: startListening, stop: stopListening,
  } = useSpeechToText({ onFinalChunk: appendVoiceChunk });

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  // What the composer displays: committed text plus whatever's being
  // spoken right now but not yet finalized. Only the committed half
  // (`input`) is ever what gets sent.
  const composerValue = listening && interimText
    ? `${input}${input ? ' ' : ''}${interimText}`
    : input;

  const persona = getPersona(activePersonaId);
  const messages = getPersonaMessages(activePersonaId);
  const orderedMessages = messages;
  const hasOnlyOpening = messages.length === 1 && messages[0].isOpening;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping, aiError, activePersonaId]);

  const handlePick = (id) => {
    if (listening) stopListening();
    setActivePersonaId(id);
    setPickedOnce(true);
    setSwitcherOpen(false);
    setInput('');
    try { window.localStorage.setItem('atara_persona_ever_picked', 'true'); } catch {}
  };

  const openSwitcher = () => {
    if (listening) stopListening();
    setSwitcherOpen(true);
  };

  const handleNewChat = () => {
    if (listening) stopListening();
    setInput('');
    setAiError('');
    startNewChat(activePersonaId);
  };

  const openHistory = () => {
    if (listening) stopListening();
    setHistoryOpen(true);
  };

  const handleSelectSession = (sessionId) => {
    setInput('');
    setAiError('');
    switchSession(activePersonaId, sessionId);
    setHistoryOpen(false);
  };

  const handleDeleteSession = (session) => {
    confirm({
      title: 'Delete this chat?',
      message: 'This will permanently delete this conversation. This cannot be undone.',
      confirmLabel: 'Yes — delete',
      tone: 'danger',
      onConfirm: async () => {
        await deleteSession(activePersonaId, session.id);
      },
    });
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;
    const trimmed = text.trim();
    const userMsg = {
      id: `msg_${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setInput('');
    setIsTyping(true);
    setAiError('');

    try {
      await addMessage(userMsg, activePersonaId);

      const allMessages = [...messages, userMsg];
      const conversationHistory = allMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const userContext = aiAnonMode ? '' : buildUserContextSummary(moods, journals, goals, currentStreak);
      const systemPrompt = buildPersonaSystemPrompt(persona);
      const response = await callAI(conversationHistory, userContext, systemPrompt);

      await addMessage({
        id: `msg_${Date.now()}_atara`,
        text: response,
        sender: 'atara',
        timestamp: new Date(),
      }, activePersonaId);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Error calling AI:', error);
      setAiError("Sorry, I couldn't respond right now. Please try again in a moment.");
    } finally {
      setIsTyping(false);
    }
  };

  // Wraps sendMessage so that speaking right up to the moment you hit
  // Send doesn't drop the last few words: it stops the mic and folds
  // whatever was still "interim" (not yet finalized) into the message
  // first, rather than racing the recognizer's own finalize-on-stop.
  const handleSendClick = () => {
    let text = input;
    if (listening) {
      if (interimText.trim()) {
        text = input ? `${input.trimEnd()} ${interimText.trim()}` : interimText.trim();
      }
      stopListening();
    }
    sendMessage(text);
  };

  // First-ever visit: full-screen picker, nothing else rendered yet.
  if (!pickedOnce) {
    return (
      <div className="chat-page">
        <div className="chat-wrap">
          <div className="chat-main chat-main-picker">
            <PersonaPicker activeId={activePersonaId} onPick={handlePick} embedded={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-wrap">
        <div className="chat-main">
          {/* Header */}
          <div className={`chat-header persona-tone-${persona.tone}`}>
            <div className="chat-header-left">
              <div className="chat-header-avatar chat-header-avatar-persona">
                <PersonaIcon icon={persona.icon} size={18} />
              </div>
              <div>
                <p className="chat-header-name">{persona.name}</p>
                <p className="chat-header-status">
                  <span className="chat-status-dot" /> {persona.subtitle}
                </p>
              </div>
            </div>
            <div className="chat-header-right">
              <button
                className="chat-switch-btn"
                onClick={openHistory}
                title="Browse past chats"
                aria-label="Browse past chats"
              >
                <HistoryIcon size={13} /> <span className="btn-label">History</span>
              </button>
              <button
                className="chat-switch-btn"
                onClick={handleNewChat}
                title="Start a new chat"
                aria-label="Start a new chat"
                disabled={hasOnlyOpening}
              >
                <PenSquare size={13} /> <span className="btn-label">New chat</span>
              </button>
              <button
                className="chat-switch-btn"
                onClick={openSwitcher}
                title="Talk to someone else"
                aria-label="Talk to someone else"
              >
                <span className="btn-label">Switch</span> <ChevronDown size={13} />
              </button>
              <label
                title={aiAnonMode ? 'Anonymous — personal context not sent' : 'Context-aware — uses your moods/journals for personalization'}
                className={`chat-context-toggle ${aiAnonMode ? 'chat-context-off' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={aiAnonMode}
                  onChange={toggleAiAnon}
                  style={{ display: 'none' }}
                />
                {aiAnonMode ? <EyeOff size={12} /> : <Eye size={12} />}
                <span className="btn-label">{aiAnonMode ? 'Private Mode' : 'Context On'}</span>
              </label>
            </div>
          </div>

          {/* Info bar */}
          <div className="chat-info-bar">
            <Info size={12} />
            <span>Atara is an AI companion and not a substitute for professional mental health care.</span>
          </div>

          {/* Messages */}
          <div className="chat-messages" aria-live="polite">
            {chatLoading ? (
              <div className="chat-empty-state">
                <img src="/logo-icon.png" alt="" className="chat-empty-icon" />
                <p className="chat-empty-text">Loading conversation…</p>
              </div>
            ) : (
              <>
                {orderedMessages.map((m) => {
                  const time = m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div key={m.id} className={`chat-row ${m.sender === 'user' ? 'chat-row-user' : 'chat-row-atara'}`}>
                      {m.sender === 'atara' && (
                        <div className={`chat-bubble-avatar chat-bubble-avatar-persona persona-tone-${persona.tone}`}>
                          <PersonaIcon icon={persona.icon} size={14} />
                        </div>
                      )}
                      <div className="chat-bubble-col">
                        <div className={`chat-bubble ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-atara'}`}>
                          {m.text}
                        </div>
                        <span className={`chat-time ${m.sender === 'user' ? 'chat-time-user' : ''}`}>{time}</span>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="chat-row chat-row-atara">
                    <div className={`chat-bubble-avatar chat-bubble-avatar-persona persona-tone-${persona.tone}`}>
                      <PersonaIcon icon={persona.icon} size={14} />
                    </div>
                    <div className="chat-bubble chat-bubble-atara chat-typing">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </div>
                  </div>
                )}
                {aiError && (
                  <div className="chat-row chat-row-atara">
                    <div className={`chat-bubble-avatar chat-bubble-avatar-persona persona-tone-${persona.tone}`}>
                      <PersonaIcon icon={persona.icon} size={14} />
                    </div>
                    <div className="chat-bubble chat-bubble-error">
                      <AlertCircle size={14} className="chat-error-icon" />
                      <span>{aiError}</span>
                    </div>
                  </div>
                )}
                {hasOnlyOpening && !isTyping && (
                  <div className="chat-suggestions-block">
                    <div className="chat-suggestions-head">
                      <Sparkles size={13} />
                      <span>Suggested prompts</span>
                    </div>
                    <div className="chat-suggestions">
                      {SUGGESTED_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => sendMessage(p)}
                          className="chat-suggestion-chip"
                          disabled={isTyping}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {voiceError && <p className="chat-voice-error">{voiceError}</p>}
          <div className="chat-input-bar">
            <input
              value={composerValue}
              onChange={(e) => setInput(e.target.value)}
              readOnly={listening}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendClick();
                }
              }}
              placeholder={listening ? 'Listening…' : `Message ${persona.name}…`}
              className="chat-input"
              disabled={chatLoading || isTyping}
            />
            {micSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={chatLoading || isTyping}
                className={`chat-mic-btn ${listening ? 'is-listening' : ''}`}
                aria-pressed={listening}
                aria-label={listening ? 'Stop voice input' : 'Speak your message'}
                title={listening ? 'Stop voice input' : 'Speak your message'}
              >
                {listening ? <Square size={14} /> : <Mic size={16} />}
                {listening && <span className="chat-mic-pulse" aria-hidden="true" />}
              </button>
            )}
            <button
              onClick={handleSendClick}
              disabled={(!input.trim() && !(listening && interimText.trim())) || isTyping || chatLoading}
              className="chat-send-btn"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>

          {switcherOpen && (
            <div className="persona-switcher-overlay" role="dialog" aria-label="Switch persona">
              <div className="persona-switcher-backdrop" onClick={() => setSwitcherOpen(false)} />
              <div className="persona-switcher-panel">
                <PersonaPicker
                  activeId={activePersonaId}
                  onPick={handlePick}
                  onClose={() => setSwitcherOpen(false)}
                  embedded
                />
              </div>
            </div>
          )}

          {historyOpen && (
            <div className="persona-switcher-overlay" role="dialog" aria-label="Chat history">
              <div className="persona-switcher-backdrop" onClick={() => setHistoryOpen(false)} />
              <div className="persona-switcher-panel">
                <SessionHistory
                  sessions={getPersonaSessions(activePersonaId)}
                  onPick={handleSelectSession}
                  onDelete={handleDeleteSession}
                  onClose={() => setHistoryOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {Dialog}
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGate>
      <ChatContent />
    </AuthGate>
  );
}
