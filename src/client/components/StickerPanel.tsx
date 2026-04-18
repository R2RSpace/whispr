import React, { useState, useRef } from 'react';
import { CloseIcon, ImageIcon } from './Icons';

// Default stickers: large emoji rendered as sticker images
const DEFAULT_STICKERS = [
  '😀', '😂', '🥰', '😎', '🤯', '🥳', '😤', '🤗',
  '👋', '👍', '👎', '🙏', '💪', '🎉', '🔥', '❤️',
  '💀', '🤡', '👻', '🎃', '🌟', '⭐', '💫', '🌈',
  '🚀', '💎', '🏆', '🎯', '🛡️', '⚡', '🎵', '🍕',
];

interface Props {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

export default function StickerPanel({ onSelect, onClose }: Props) {
  const [tab, setTab] = useState<'default' | 'custom'>('default');
  const [customStickers, setCustomStickers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('whispr_stickers') || '[]'); } catch { return []; }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleConvertToSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      // Resize to sticker size using canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        // Fit image into 256x256
        const scale = Math.min(256 / img.width, 256 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
        const stickerUrl = canvas.toDataURL('image/png');
        const updated = [...customStickers, stickerUrl];
        setCustomStickers(updated);
        localStorage.setItem('whispr_stickers', JSON.stringify(updated));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeCustom = (index: number) => {
    const updated = customStickers.filter((_, i) => i !== index);
    setCustomStickers(updated);
    localStorage.setItem('whispr_stickers', JSON.stringify(updated));
  };

  return (
    <div style={{
      background: 'var(--md-sys-color-surface-container)',
      borderTop: '1px solid var(--md-sys-color-outline-variant)',
      height: 280, display: 'flex', flexDirection: 'column',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', padding: '4px 8px', gap: 2, borderBottom: '1px solid var(--md-sys-color-outline-variant)', alignItems: 'center' }}>
        <TabBtn active={tab === 'default'} onClick={() => setTab('default')}>Stickers</TabBtn>
        <TabBtn active={tab === 'custom'} onClick={() => setTab('custom')}>Custom</TabBtn>
        <div style={{ flex: 1 }} />
        {tab === 'custom' && (
          <button onClick={() => fileRef.current?.click()} style={{
            padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)',
            fontSize: 11, fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <ImageIcon size={14} color="var(--md-sys-color-on-primary)" /> Add
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', marginLeft: 4 }}>
          <CloseIcon size={18} color="var(--md-sys-color-on-surface-variant)" />
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleConvertToSticker} />

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tab === 'default' && DEFAULT_STICKERS.map((emoji, i) => {
            // Create a canvas-rendered sticker from emoji
            return (
              <button key={i} onClick={() => {
                // Convert emoji to dataURL for consistent sticker rendering
                const canvas = document.createElement('canvas');
                canvas.width = 256; canvas.height = 256;
                const ctx = canvas.getContext('2d')!;
                ctx.font = '180px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, 128, 140);
                onSelect(canvas.toDataURL());
              }} style={{
                width: 64, height: 64, border: 'none', cursor: 'pointer', borderRadius: 12,
                background: 'none', fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {emoji}
              </button>
            );
          })}
          {tab === 'custom' && customStickers.length === 0 && (
            <div style={{ width: '100%', textAlign: 'center', padding: 40, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 13 }}>
              <p>No custom stickers yet</p>
              <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Tap "Add" to convert an image to a sticker</p>
            </div>
          )}
          {tab === 'custom' && customStickers.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <button onClick={() => onSelect(url)} style={{
                width: 72, height: 72, border: 'none', cursor: 'pointer', borderRadius: 12,
                background: 'none', padding: 4, transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </button>
              <button onClick={() => removeCustom(i)} style={{
                position: 'absolute', top: -4, right: -4, width: 20, height: 20,
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'var(--md-sys-color-error)', color: '#fff',
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', border: 'none', cursor: 'pointer', borderRadius: 8,
      background: active ? 'var(--md-sys-color-primary-container)' : 'none',
      color: active ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
      fontSize: 12, fontFamily: 'var(--font-family)', fontWeight: active ? 600 : 400,
    }}>{children}</button>
  );
}
