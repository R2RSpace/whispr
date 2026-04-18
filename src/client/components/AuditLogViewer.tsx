import React, { useState } from 'react';

export default function AuditLogViewer() {
  const [entries] = useState([
    { id: '1', author: 'user-3', action: 'WARN', principle: 'P3: Epistemic Clarity', block: 1425, score: 0.72 },
    { id: '2', author: 'user-5', action: 'BLOCK', principle: 'P1: Non-Violence', block: 1425, score: 0.95 },
    { id: '3', author: 'user-1', action: 'PASS', principle: '-', block: 1424, score: 0.02 },
    { id: '4', author: 'user-4', action: 'ANNOTATE', principle: 'P6: Privacy Sovereignty', block: 1424, score: 0.68 },
  ]);

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'BLOCK': return { bg: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)' };
      case 'WARN': return { bg: 'var(--md-sys-color-warn-container)', color: 'var(--md-sys-color-on-warn-container)' };
      case 'ANNOTATE': return { bg: 'var(--md-sys-color-annotate-container)', color: 'var(--md-sys-color-on-annotate-container)' };
      default: return { bg: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)' };
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>📋 Audit Log</h2>
      <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 16 }}>
        Append-only log of all CRP evaluations. Cannot be modified or deleted.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(e => {
          const style = getActionStyle(e.action);
          return (
            <div key={e.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                background: style.bg, color: style.color, flexShrink: 0,
              }}>
                {e.action}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{e.principle}</div>
                <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Author: {e.author} · Score: {e.score} · Block: {e.block}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
