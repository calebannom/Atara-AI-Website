import React, { useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useGoals } from '../context/GoalContext';
import { Target, Trash2, CheckCircle2, Circle, Pencil, Plus, X, PlusCircle } from 'lucide-react';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './Page.css';
import './Goals.css';

const CATEGORY_LABELS = {
  mental: 'Mental', physical: 'Physical', social: 'Social', habits: 'Habits', other: 'Other',
};

const CATEGORY_STYLES = {
  mental: 'goal-cat-mental',
  physical: 'goal-cat-physical',
  social: 'goal-cat-social',
  habits: 'goal-cat-habits',
  other: 'goal-cat-other',
};

function GoalsContent() {
  const { goals, logProgress, toggleComplete, updateGoal, deleteGoal, addGoal, loading } = useGoals();
  const { confirm, Dialog } = useConfirm();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(7);
  const [unit, setUnit] = useState('days');
  const [category, setCategory] = useState('mental');
  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState('');

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setTarget(7);
    setUnit('days');
    setCategory('mental');
    setIsAdding(false);
    setActionError('');
  };

  const handleSave = async () => {
    if (!title.trim() || actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (editingId) {
        await updateGoal(editingId, {
          title: title.trim(),
          target: Number(target) || 1,
          unit,
          category,
        });
      } else {
        await addGoal({ title: title.trim(), description: '', category, target: Number(target) || 1, unit });
      }
      resetEditor();
    } catch (err) {
      setActionError(err?.message || 'Could not save this goal. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProgress = async (id) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try { await logProgress(id); } catch (err) { setActionError(err?.message || 'Could not update progress.'); } finally { setActionLoading(false); }
  };

  const handleToggle = async (id) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try { await toggleComplete(id); } catch (err) { setActionError(err?.message || 'Could not update this goal.'); } finally { setActionLoading(false); }
  };

  const handleStartEdit = (goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTarget(goal.target ?? 1);
    setUnit(goal.unit);
    setCategory(goal.category || 'other');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (goal) => {
    if (actionLoading) return;
    await confirm({
      title: 'Delete this goal?',
      message: `Are you sure you want to delete "${goal.title}"? All progress (${goal.progress || 0}/${goal.target} ${goal.unit}) will be lost and this cannot be undone.`,
      confirmLabel: 'Delete goal',
      tone: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try { await deleteGoal(goal.id); } catch (err) { setActionError(err?.message || 'Could not delete this goal.'); } finally { setActionLoading(false); }
      },
    });
  };

  const activeCount = goals.filter((g) => !g.completed).length;
  const doneCount = goals.filter((g) => g.completed).length;

  return (
    <div className="goals-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-accent"><Target size={16} /></div>
            <div>
              <h1 className="page-title">Goals</h1>
              <p className="page-head-sub">Small steps, tracked over time</p>
            </div>
          </div>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="btn-primary" disabled={loading}>
              <Plus size={13} /> New goal
            </button>
          )}
        </div>
      </div>

      <div className="goals-summary-row">
        <div className="goals-summary-card">
          <Target size={14} className="goals-summary-icon goals-icon-active" />
          <div>
            <span className="goals-summary-num">{activeCount}</span>
            <span className="goals-summary-label">Active</span>
          </div>
        </div>
        <div className="goals-summary-card">
          <CheckCircle2 size={14} className="goals-summary-icon goals-icon-done" />
          <div>
            <span className="goals-summary-num">{doneCount}</span>
            <span className="goals-summary-label">Completed</span>
          </div>
        </div>
        <div className="goals-summary-card">
          <Target size={14} className="goals-summary-icon goals-icon-total" />
          <div>
            <span className="goals-summary-num">{goals.length}</span>
            <span className="goals-summary-label">Total goals</span>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="card goals-editor-card">
          <div className="card-head goals-editor-head">
            <p className="card-title goals-editor-title">
              {editingId ? <><Pencil size={13} style={{ marginRight: 6 }} /> Edit goal</> : <>Create a new goal</>}
            </p>
            <button onClick={resetEditor} className="goals-close-btn" aria-label="Close editor" disabled={actionLoading}>
              <X size={14} />
            </button>
          </div>
          <div className="card-body goals-editor-body">
            <div className="goals-form-row">
              <div className="goals-form-field goals-field-title">
                <label className="form-label">Goal title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Meditate daily"
                  className="form-input goals-input"
                  disabled={actionLoading}
                />
              </div>
            </div>
            <div className="goals-form-row goals-form-multicol">
              <div className="goals-form-field">
                <label className="form-label">Target</label>
                <input
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="form-input goals-input goals-input-num"
                  disabled={actionLoading}
                />
              </div>
              <div className="goals-form-field">
                <label className="form-label">Unit</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="days, sessions..."
                  className="form-input goals-input"
                  disabled={actionLoading}
                />
              </div>
              <div className="goals-form-field">
                <label className="form-label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input goals-input" disabled={actionLoading}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="goals-editor-actions">
              <button onClick={handleSave} className="btn-primary goals-save-btn" disabled={actionLoading || !title.trim()}>
                {actionLoading ? 'Saving…' : editingId ? 'Update goal' : 'Add goal'}
              </button>
              <button onClick={resetEditor} className="goals-cancel" disabled={actionLoading}>Cancel</button>
              {actionError && (
                <span style={{ color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>{actionError}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card goals-list-card">
        <div className="card-head">
          <h2 className="card-title">Your goals</h2>
        </div>
        {actionError && !isAdding && (
          <div style={{ padding: '10px 20px', color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>
            {actionError}
          </div>
        )}
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="goals-empty-text">Loading goals…</p>
            </div>
          ) : goals.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center' }}>
              <p className="goals-empty-text">No goals yet — create your first one to get started.</p>
            </div>
          ) : (
            <ul className="goals-list">
              {goals.map((g) => {
                const gProgress = g.progress || 0;
                const gTarget = g.target || 1;
                const pct = Math.min(100, (gProgress / gTarget) * 100);
                return (
                  <li key={g.id} className={`goal-row ${g.completed ? 'goal-row-done' : ''} ${editingId === g.id ? 'goal-row-active' : ''}`}>
                    <button
                      onClick={() => handleToggle(g.id)}
                      className="goal-check-btn"
                      aria-label="Toggle complete"
                      disabled={actionLoading}
                    >
                      {g.completed
                        ? <CheckCircle2 size={17} className="goal-check-done" />
                        : <Circle size={17} className="goal-check-open" />}
                    </button>

                    <div className="goal-row-main">
                      <div className="goal-row-top">
                        <p className={`goal-row-title ${g.completed ? 'goal-title-done' : ''}`}>{g.title}</p>
                        <span className={`goal-category-chip ${CATEGORY_STYLES[g.category] || CATEGORY_STYLES.other}`}>
                          {CATEGORY_LABELS[g.category]}
                        </span>
                      </div>

                      <div className="goal-row-progress-wrap">
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="goal-progress-count">
                          {gProgress}/{gTarget} {g.unit}
                        </span>
                      </div>
                    </div>

                    <div className="goal-row-right">
                      {!g.completed && (
                        <button
                          onClick={() => handleProgress(g.id)}
                          className="goal-log-btn"
                          disabled={actionLoading || gProgress >= gTarget}
                        >
                          <PlusCircle size={13} /> +1
                        </button>
                      )}
                      <div className="goal-row-actions">
                        <button
                          onClick={() => handleStartEdit(g)}
                          className="goal-icon-btn goal-edit-btn"
                          aria-label="Edit goal"
                          disabled={actionLoading}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="goal-icon-btn goal-del-btn"
                          aria-label="Delete goal"
                          disabled={actionLoading}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {Dialog}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <AuthGate>
      <GoalsContent />
    </AuthGate>
  );
}
