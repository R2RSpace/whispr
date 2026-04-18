import React, { useState } from 'react';

export default function SecuritySettings() {
  const [sessions] = useState([
    { id: '1', device: 'Chrome Windows', lastSeen: Date.now() - 60000, current: true },
    { id: '2', device: 'Firefox Linux', lastSeen: Date.now() - 3600000, current: false },
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>🔐 Security Settings</h2>

      {/* Active Sessions */}
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Active Sessions</h3>
      {sessions.map(s => (
        <div key={s.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.device} {s.current && <span style={{ color: 'var(--md-sys-color-primary)', fontSize: 11 }}>(current)</span>}</div>
            <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Last seen: {new Date(s.lastSeen).toLocaleTimeString()}
            </div>
          </div>
          {!s.current && <button className="btn btn-error" style={{ padding: '6px 12px', fontSize: 12 }}>Revoke</button>}
        </div>
      ))}
      <button className="btn btn-error" style={{ width: '100%', marginTop: 8, marginBottom: 24 }}>
        🚨 Revoke All Sessions
      </button>

      {/* Safety Number */}
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Identity Fingerprint</h3>
      <div className="card" style={{ padding: 12, marginBottom: 24, fontFamily: 'monospace', fontSize: 13, letterSpacing: 2, textAlign: 'center', color: 'var(--md-sys-color-primary)' }}>
        A7F3 B2C1 D9E5 F6A8 B3C4 D7E2 1F9A 4B6C 3D8E 2A7F
      </div>

      {/* Rotation Actions */}
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Credential Rotation</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-outlined">🔑 Change Password</button>
        <button className="btn btn-outlined">👤 Change Username</button>
        <button className="btn btn-outlined" style={{ borderColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-error)' }}>
          🔄 Rotate Identity Keys
        </button>
        <button className="btn btn-error">⚠️ Migrate Account</button>
      </div>

      {/* Duress Account */}
      <h3 style={{ fontSize: 15, fontWeight: 500, marginTop: 24, marginBottom: 8 }}>Duress Account</h3>
      <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 12 }}>
        Populate your duress account with non-sensitive content. If coerced, use the duress mnemonic.
      </p>
      <button className="btn btn-secondary">📝 Manage Duress Account</button>
    </div>
  );
}
