import React, { useEffect, useRef } from 'react';
import { AlertTriangle, LogOut, Trash2, Info } from 'lucide-react';

/**
 * Generic confirmation dialog for destructive or important actions.
 *
 * Props:
 *   open          – boolean, controls visibility
 *   title         – string e.g. "Delete journal entry?"
 *   message       – string (can be plain text; dangerous keywords auto-bolded)
 *   confirmLabel  – string for confirm button [default: "Delete" / "Confirm"]
 *   cancelLabel   – string for cancel button  [default: "Cancel"]
 *   tone          – 'danger' | 'safe' | 'neutral' [default: 'danger']
 *   onConfirm     – () => Promise<void> | void – fires when user clicks confirm
 *   onCancel      – () => void – fires on cancel, backdrop click, or Escape
 *   icon          – optional custom icon node; auto-picked from tone if omitted
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  icon,
}) {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmText = confirmLabel ?? (tone === 'danger' ? 'Delete' : tone === 'safe' ? 'Sign out' : 'Confirm');
  const confirmClass = tone === 'danger' ? 'confirm-confirm' : 'confirm-confirm confirm-safe';
  const IconNode = icon ?? (
    tone === 'danger' ? <Trash2 size={18} style={{ marginRight: 8, flexShrink: 0 }} />
    : tone === 'safe' ? <LogOut size={18} style={{ marginRight: 8, flexShrink: 0 }} />
    : <Info size={18} style={{ marginRight: 8, flexShrink: 0, color: 'var(--color-primary)' }} />
  );

  const renderMessage = (msg) => {
    const dangerous = /delete|remove|permanent|cannot be undone|lose all|sign out|log out|overwrite/i;
    if (!dangerous.test(msg)) return <p className="confirm-body">{msg}</p>;
    const parts = msg.split(dangerous);
    const matches = msg.match(dangerous) || [];
    return (
      <p className="confirm-body">
        {parts.flatMap((p, i) => (
          <React.Fragment key={i}>
            {p}
            {matches[i] && <strong>{matches[i]}</strong>}
          </React.Fragment>
        ))}
      </p>
    );
  };

  const handleConfirm = async () => {
    if (!onConfirm) { onCancel?.(); return; }
    try { await onConfirm(); } finally { /* dialog caller closes */ }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  return (
    <div className="confirm-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-dialog" ref={dialogRef}>
        <h2 id="confirm-title" className="confirm-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: tone === 'danger' ? 'var(--color-error)' : undefined }}>
          {IconNode}
          {title}
        </h2>
        {renderMessage(message || '')}
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={handleConfirm}
            ref={confirmBtnRef}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small helper hook to keep dialog state tidy in consuming components
export function useConfirm() {
  const [state, setState] = React.useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: undefined,
    cancelLabel: 'Cancel',
    tone: 'danger',
    icon: undefined,
    onConfirm: undefined,
  });

  const confirm = React.useCallback((opts) => new Promise((resolve) => {
    setState({
      open: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel,
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      tone: opts.tone ?? 'danger',
      icon: opts.icon,
      onConfirm: async () => {
        const result = await opts.onConfirm?.();
        setState((s) => ({ ...s, open: false }));
        resolve(result ?? true);
      },
    });
  }), []);

  const cancel = React.useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const Dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      tone={state.tone}
      icon={state.icon}
      onConfirm={state.onConfirm}
      onCancel={cancel}
    />
  );

  return { confirm, Dialog };
}
