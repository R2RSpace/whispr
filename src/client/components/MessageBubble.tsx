import React, { useState, useRef, useEffect } from 'react';
import { MessageItem } from '../App';
import { DoubleCheckIcon, PlayIcon, PauseIcon, ViewOnceIcon } from './Icons';

interface Props {
  msg: MessageItem;
  onViewOnce?: () => void;
}

export default function MessageBubble({ msg, onViewOnce }: Props) {
  const isSelf = msg.sender === 'self';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Deleted message
  if (msg.deletedForEveryone) {
    return (
      <div style={{
        alignSelf: isSelf ? 'flex-end' : 'flex-start',
        padding: '8px 14px', borderRadius: 16,
        background: 'transparent',
        border: '1px solid var(--md-sys-color-outline-variant)',
        fontSize: 13, fontStyle: 'italic',
        color: 'var(--md-sys-color-on-surface-variant)',
        opacity: 0.6, maxWidth: '75%', marginBottom: 2,
      }}>
        This message was deleted
        <span style={{ fontSize: 10, marginLeft: 8, opacity: 0.5 }}>{time}</span>
      </div>
    );
  }

  // Sticker message
  if (msg.type === 'sticker' && msg.stickerUrl) {
    return (
      <div style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
        <img src={msg.stickerUrl} alt="sticker" style={{ width: 150, height: 150, objectFit: 'contain' }} />
        <div style={{ fontSize: 10, color: 'var(--md-sys-color-on-surface-variant)', textAlign: isSelf ? 'right' : 'left', marginTop: 2 }}>
          {time} {isSelf && <DoubleCheckIcon size={14} color="var(--md-sys-color-primary)" />}
        </div>
      </div>
    );
  }

  // Photo message
  if (msg.type === 'photo' && msg.photoUrl) {
    return <PhotoBubble msg={msg} isSelf={isSelf} time={time} onViewOnce={onViewOnce} />;
  }

  // Voice message
  if (msg.type === 'voice' && msg.voiceUrl) {
    return <VoiceBubble msg={msg} isSelf={isSelf} time={time} />;
  }

  // CRP styling
  const crpBorder = msg.crpFlag === 'warn' ? '2px solid var(--crp-warn)' : msg.crpFlag === 'annotate' ? '2px solid var(--crp-annotate)' : 'none';

  return (
    <div style={{
      alignSelf: isSelf ? 'flex-end' : 'flex-start',
      maxWidth: '75%', marginBottom: 2,
    }}>
      <div style={{
        padding: '8px 12px',
        borderRadius: isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
        color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
        fontSize: 14, lineHeight: 1.45, border: crpBorder,
        wordBreak: 'break-word',
      }}>
        {msg.text}
        <span style={{
          fontSize: 10, marginLeft: 10, float: 'right', marginTop: 4,
          opacity: 0.7, display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {time}
          {isSelf && <DoubleCheckIcon size={14} color={isSelf ? 'rgba(255,255,255,0.7)' : 'var(--md-sys-color-primary)'} />}
        </span>
      </div>
      {msg.crpFlag && msg.crpReason && (
        <div style={{
          fontSize: 10, padding: '4px 12px', marginTop: 2,
          color: msg.crpFlag === 'warn' ? 'var(--crp-warn)' : 'var(--crp-annotate)',
          fontStyle: 'italic',
        }}>
          {msg.crpReason}
        </div>
      )}
    </div>
  );
}

function PhotoBubble({ msg, isSelf, time, onViewOnce }: { msg: MessageItem; isSelf: boolean; time: string; onViewOnce?: () => void }) {
  const [opened, setOpened] = useState(msg.viewOnceOpened || false);
  const [viewing, setViewing] = useState(false);

  if (msg.viewOnce && !opened && !viewing) {
    return (
      <div
        style={{
          alignSelf: isSelf ? 'flex-end' : 'flex-start',
          padding: '12px 18px', borderRadius: 16, maxWidth: '75%', marginBottom: 2,
          background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
          color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
        onClick={() => { setViewing(true); onViewOnce?.(); }}
      >
        <ViewOnceIcon size={20} />
        <span style={{ fontSize: 13 }}>View once photo · Tap to view</span>
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 'auto' }}>{time}</span>
      </div>
    );
  }

  if (msg.viewOnce && viewing) {
    // Show for 5 seconds then close
    setTimeout(() => { setViewing(false); setOpened(true); }, 5000);
  }

  if (msg.viewOnce && opened && !viewing) {
    return (
      <div style={{
        alignSelf: isSelf ? 'flex-end' : 'flex-start',
        padding: '8px 14px', borderRadius: 16, maxWidth: '75%', marginBottom: 2,
        background: 'transparent', border: '1px solid var(--md-sys-color-outline-variant)',
        fontSize: 13, fontStyle: 'italic', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6,
      }}>
        Photo · Opened
        <span style={{ fontSize: 10, marginLeft: 8 }}>{time}</span>
      </div>
    );
  }

  return (
    <div style={{
      alignSelf: isSelf ? 'flex-end' : 'flex-start',
      maxWidth: '65%', marginBottom: 2,
    }}>
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)'}`,
      }}>
        <img src={msg.photoUrl} alt="photo" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{
        fontSize: 10, color: 'var(--md-sys-color-on-surface-variant)',
        textAlign: isSelf ? 'right' : 'left', marginTop: 2,
        display: 'flex', alignItems: 'center', gap: 3, justifyContent: isSelf ? 'flex-end' : 'flex-start',
      }}>
        {msg.viewOnce && <ViewOnceIcon size={12} />}
        {time}
        {isSelf && <DoubleCheckIcon size={14} color="var(--md-sys-color-primary)" />}
      </div>
    </div>
  );
}

function VoiceBubble({ msg, isSelf, time }: { msg: MessageItem; isSelf: boolean; time: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(msg.voiceUrl);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const dur = msg.voiceDuration || 0;
  const formatDur = `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}`;

  return (
    <div style={{
      alignSelf: isSelf ? 'flex-end' : 'flex-start',
      maxWidth: '70%', marginBottom: 2,
    }}>
      <div style={{
        padding: '10px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10,
        background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
        color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
        minWidth: 200,
      }}>
        <button onClick={togglePlay} style={{
          width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer',
          background: isSelf ? 'rgba(255,255,255,0.2)' : 'var(--md-sys-color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {playing
            ? <PauseIcon size={16} color={isSelf ? '#fff' : 'var(--md-sys-color-on-primary)'} />
            : <PlayIcon size={16} color={isSelf ? '#fff' : 'var(--md-sys-color-on-primary)'} />
          }
        </button>
        <div style={{ flex: 1 }}>
          {/* Waveform bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                height: 6 + Math.sin(i * 0.8) * 12 + Math.random() * 6,
                background: i < (progress / 5) ? (isSelf ? '#fff' : 'var(--md-sys-color-primary)') : (isSelf ? 'rgba(255,255,255,0.3)' : 'var(--md-sys-color-outline-variant)'),
                transition: 'background 0.1s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
            <span>{formatDur}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {time} {isSelf && <DoubleCheckIcon size={12} color={isSelf ? 'rgba(255,255,255,0.7)' : 'var(--md-sys-color-primary)'} />}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
