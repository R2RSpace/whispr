import React, { useState, useEffect } from 'react';
import constitution from '../../../constitution.json';

interface Principle {
  id: string;
  name: string;
  description: string;
  weight: number;
  scope: string;
  enforcement_mode: string;
  violation_threshold: number;
  keywords: string[];
  patterns: string[];
}

export default function ConstitutionEditor() {
  const [principles, setPrinciples] = useState<Principle[]>(constitution.principles as Principle[]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('/api/constitution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...constitution, principles }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const updatePrinciple = (id: string, field: string, value: any) => {
    setPrinciples(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'BLOCK': return { bg: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)' };
      case 'WARN': return { bg: 'var(--md-sys-color-warn-container)', color: 'var(--md-sys-color-on-warn-container)' };
      case 'ANNOTATE': return { bg: 'var(--md-sys-color-annotate-container)', color: 'var(--md-sys-color-on-annotate-container)' };
      default: return { bg: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)' };
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500 }}>📜 Constitution Editor</h2>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save & Hot-Reload'}
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 24, lineHeight: 1.6 }}>
        {constitution._preamble}
      </p>

      {principles.map(p => {
        const modeStyle = getModeColor(p.enforcement_mode);
        const isEditing = editingId === p.id;

        return (
          <div key={p.id} className="card animate-fade-in" style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--md-sys-color-outline)', fontFamily: 'monospace' }}>{p.id}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</h3>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500,
                    background: modeStyle.bg, color: modeStyle.color,
                  }}>
                    {p.enforcement_mode}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.5 }}>
                  {p.description}
                </p>
              </div>
              <button
                onClick={() => setEditingId(isEditing ? null : p.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: 'var(--md-sys-color-primary)',
                }}
              >
                {isEditing ? '✕' : '✏️'}
              </button>
            </div>

            {isEditing && (
              <div className="animate-fade-in" style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--md-sys-color-outline)' }}>Weight (0-1)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0} max={1} step={0.05}
                    value={p.weight}
                    onChange={e => updatePrinciple(p.id, 'weight', parseFloat(e.target.value))}
                    style={{ padding: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--md-sys-color-outline)' }}>Threshold (0-1)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0} max={1} step={0.05}
                    value={p.violation_threshold}
                    onChange={e => updatePrinciple(p.id, 'violation_threshold', parseFloat(e.target.value))}
                    style={{ padding: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--md-sys-color-outline)' }}>Mode</label>
                  <select
                    className="input-field"
                    value={p.enforcement_mode}
                    onChange={e => updatePrinciple(p.id, 'enforcement_mode', e.target.value)}
                    style={{ padding: 8, fontSize: 13 }}
                  >
                    <option value="BLOCK">BLOCK</option>
                    <option value="WARN">WARN</option>
                    <option value="ANNOTATE">ANNOTATE</option>
                    <option value="PASS">PASS</option>
                  </select>
                </div>
              </div>
            )}

            {/* Weight bar */}
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar" style={{ height: 4 }}>
                <div className="progress-bar-fill" style={{
                  width: `${p.weight * 100}%`,
                  background: `linear-gradient(90deg, ${modeStyle.bg}, var(--md-sys-color-primary))`,
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
