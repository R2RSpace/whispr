import React from 'react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onCancel}>
      <div className="glass-card animate-fade-in" style={{
        width: 320, padding: 24, display: 'flex', flexDirection: 'column', gap: 16
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, margin: 0, color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn btn-outlined" onClick={onCancel} style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button className="btn" style={{
            padding: '8px 16px',
            background: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
            color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer'
          }} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
