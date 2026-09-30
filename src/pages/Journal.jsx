import React, { useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useJournal } from '../context/JournalContext';
import MoodFace from '../components/MoodFace';
import { BookOpen, Trash2, Pencil, Plus, X } from 'lucide-react';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './Page.css';
import './Journal.css';

const MOODS = ['rad', 'good', 'meh', 'bad', 'awful'];

function JournalContent() {
  const { journals, addJournal, updateJournal, deleteJournal, loading: journalLoading } = useJournal();
  const { confirm, Dialog } = useConfirm();
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState('good');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [saveError, setSaveError] = useState('');

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setMood('good');
    setIsWriting(false);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      if (editingId) {
        await updateJournal(editingId, {
          title: title.trim(),
          body: body.trim(),
          mood,
        });
      } else {
        await addJournal({
          title: title.trim(),
          body: body.trim(),
          mood,
          activities: [],
          date: new Date().toISOString().split('T')[0],
        });
      }
      resetEditor();
    } catch (err) {
      setSaveError(err?.message || 'Could not save this entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setMood(entry.mood || 'good');
    setIsWriting(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entry) => {
    if (deletingId) return;
    const ok = await confirm({
      title: 'Delete journal entry?',
      message: `Are you sure you want to delete "${entry.title}"? This will permanently remove the entry and cannot be undone.`,
      confirmLabel: 'Delete entry',
      tone: 'danger',
      onConfirm: async () => {
        setDeletingId(entry.id);
        try {
          await deleteJournal(entry.id);
        } catch (err) {
          setSaveError(err?.message || 'Could not delete this entry. Please try again.');
        } finally {
          setDeletingId(null);
        }
      },
    });
    if (!ok) { /* cancelled */ }
  };

  return (
    <div className="journal-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-bloom"><BookOpen size={16} /></div>
            <div>
              <h1 className="page-title">Journal</h1>
              <p className="page-head-sub">A private space to reflect</p>
            </div>
          </div>
          {!isWriting && (
            <button onClick={() => setIsWriting(true)} className="btn-primary" disabled={journalLoading}>
              <Plus size={13} /> New entry
            </button>
          )}
        </div>
      </div>

      {isWriting && (
        <div className="card journal-editor-card">
          <div className="card-head journal-editor-head">
            <p className="card-title journal-editor-title">
              {editingId ? <><Pencil size={13} style={{ marginRight: 6 }} /> Editing entry</> : <>Write a new entry</>}
            </p>
            <button onClick={resetEditor} className="journal-close-btn" aria-label="Close editor" disabled={saving}>
              <X size={14} />
            </button>
          </div>
          <div className="card-body journal-editor-body">
            <div className="journal-form-section">
              <label className="form-label">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your entry a title"
                className="form-input journal-input"
                disabled={saving}
              />
            </div>
            <div className="journal-form-section">
              <label className="form-label">How are you feeling?</label>
              <div className="journal-mood-picker">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`journal-mood-btn ${mood === m ? 'journal-mood-btn-active' : ''}`}
                    disabled={saving}
                  >
                    <MoodFace mood={m} size={26} className="journal-mood-emoji" />
                  </button>
                ))}
              </div>
            </div>
            <div className="journal-form-section">
              <label className="form-label">Your thoughts</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's on your mind today?"
                rows={6}
                className="form-input journal-textarea"
                disabled={saving}
              />
            </div>
            <div className="journal-editor-actions">
              <button onClick={handleSave} disabled={saving || !title.trim() || !body.trim()} className="btn-primary journal-save-btn">
                {saving ? 'Saving…' : editingId ? 'Update entry' : 'Save entry'}
              </button>
              <button onClick={resetEditor} className="journal-cancel" disabled={saving}>Cancel</button>
              {saveError && (
                <span style={{ color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>{saveError}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card journal-list-card">
        <div className="card-head">
          <h2 className="card-title">Entries</h2>
          <span className="journal-list-count">{journals.length} total</span>
        </div>
        {saveError && (
          <div style={{ padding: '10px 20px', color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>
            {saveError}
          </div>
        )}
        <div className="card-body" style={{ padding: 0 }}>
          {journalLoading ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="journal-empty-text">Loading entries…</p>
            </div>
          ) : journals.length === 0 && !isWriting ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="journal-empty-text">No entries yet — write your first one above.</p>
            </div>
          ) : (
            <ul className="journal-list">
              {journals.map((j) => (
                <li key={j.id} className={`journal-row ${editingId === j.id ? 'journal-row-active' : ''} ${deletingId === j.id ? 'journal-row-muted' : ''}`}>
                  <div className="journal-row-datecol">
                    <span className="journal-row-date">{j.date}</span>
                    <span className="journal-row-mood">
                      <MoodFace mood={j.mood || 'good'} size={22} label />
                    </span>
                  </div>
                  <div className="journal-row-main">
                    <p className="journal-row-title">{j.title}</p>
                    <p className="journal-row-preview">{j.body}</p>
                  </div>
                  <div className="journal-row-actions">
                    <button
                      onClick={() => handleStartEdit(j)}
                      className="journal-icon-btn journal-edit-btn"
                      aria-label="Edit entry"
                      disabled={deletingId === j.id || saving}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(j)}
                      className="journal-icon-btn journal-del-btn"
                      aria-label="Delete entry"
                      disabled={deletingId === j.id}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {Dialog}
    </div>
  );
}

export default function JournalPage() {
  return (
    <AuthGate>
      <JournalContent />
    </AuthGate>
  );
}
