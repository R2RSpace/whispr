import React, { useState } from 'react';

export default function StorageManager() {
  const [r2Used] = useState(12.5 * 1024 * 1024); // 12.5 MB demo
  const [d1Used] = useState(2.3 * 1024 * 1024);  // 2.3 MB demo
  const [r2Quota] = useState(50 * 1024 * 1024);
  const [d1Quota] = useState(10 * 1024 * 1024);

  const r2Pct = (r2Used / r2Quota) * 100;
  const d1Pct = (d1Used / d1Quota) * 100;

  const getColor = (pct: number) => {
    if (pct < 70) return 'storage-green';
    if (pct < 85) return 'storage-amber';
    if (pct < 95) return 'storage-orange';
    return 'storage-red';
  };

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>💾 Storage Manager</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>Media Storage</span>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{formatMB(r2Used)} MB / {formatMB(r2Quota)} MB</span>
        </div>
        <div className="progress-bar" style={{ height: 10, borderRadius: 5 }}>
          <div className={`progress-bar-fill ${getColor(r2Pct)}`} style={{ width: `${r2Pct}%`, borderRadius: 5 }} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>Messages</span>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{formatMB(d1Used)} MB / {formatMB(d1Quota)} MB</span>
        </div>
        <div className="progress-bar" style={{ height: 10, borderRadius: 5 }}>
          <div className={`progress-bar-fill ${getColor(d1Pct)}`} style={{ width: `${d1Pct}%`, borderRadius: 5 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outlined" style={{ flex: 1 }}>Delete Old Media</button>
        <button className="btn btn-outlined" style={{ flex: 1 }}>Clear Cache</button>
      </div>
    </div>
  );
}
