import React, { useState, useRef } from 'react';
import { MessageItem } from '../App';
import { DoubleCheckIcon, PlayIcon, PauseIcon, ViewOnceIcon, ReplyIcon } from './Icons';

interface Props {
  msg: MessageItem;
  onViewOnce?: () => void;
  onReply?: (msg: MessageItem) => void;
}

export default function MessageBubble({ msg, onViewOnce, onReply }: Props) {
  const isSelf = msg.sender === 'self';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Swipe to reply logic
  const [translateX, setTranslateX] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !onReply) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0 && diff < 60) setTranslateX(diff); // Only swipe right
  };

  const handleTouchEnd = () => {
    if (translateX > 40 && onReply) {
      onReply(msg);
    }
    setTranslateX(0);
    touchStartX.current = null;
  };

  const crpBorder = msg.crpFlag === 'warn' ? '2px solid var(--crp-warn)' : msg.crpFlag === 'annotate' ? '2px solid var(--crp-annotate)' : 'none';

  const renderReplyPreview = () => {
    if (!msg.replyTo) return null;
    const isReplySelf = msg.replyTo.sender === 'self';
    return (
      <div style={{
        background: isSelf ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
        borderLeft: `4px solid ${isReplySelf ? (isSelf ? '#fff' : 'var(--md-sys-color-primary)') : '#7B61FF'}`,
        borderRadius: 4, padding: '4px 8px', marginBottom: 4, fontSize: 12,
        color: isSelf ? 'rgba(255,255,255,0.9)' : 'var(--md-sys-color-on-surface-variant)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{isReplySelf ? 'You' : 'They'}</div>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.replyTo.text}</div>
      </div>
    );
  };

  const getBubbleStyle = () => ({
    padding: '8px 12px',
    borderRadius: isSelf ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
    background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
    color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
    fontSize: 14, lineHeight: 1.45, border: crpBorder,
    wordBreak: 'break-word' as const,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  });

  const wrapperProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: {
      alignSelf: isSelf ? 'flex-end' : 'flex-start',
      maxWidth: '75%', marginBottom: 4,
      position: 'relative' as const,
      transform: `translateX(${translateX}px)`,
      transition: touchStartX.current === null ? 'transform 0.2s ease-out' : 'none',
      display: 'flex', alignItems: 'center'
    }
  };

  // Deleted message
  if (msg.deletedForEveryone) {
    return (
      <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block' }}>
        <div style={{
          padding: '8px 14px', borderRadius: 16, background: 'transparent',
          border: '1px solid var(--md-sys-color-outline-variant)',
          fontSize: 13, fontStyle: 'italic', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6,
        }}>
          This message was deleted
          <span style={{ fontSize: 10, marginLeft: 8, opacity: 0.5 }}>{time}</span>
        </div>
      </div>
    );
  }

  // Sticker message
  if (msg.type === 'sticker' && msg.stickerUrl) {
    return (
      <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block' }}>
        {renderReplyPreview()}
        <img src={msg.stickerUrl} alt="sticker" style={{ width: 140, height: 140, objectFit: 'contain' }} />
        <div style={{ fontSize: 10, color: 'var(--md-sys-color-on-surface-variant)', textAlign: isSelf ? 'right' : 'left', marginTop: 2 }}>
          {time} {isSelf && <DoubleCheckIcon size={14} color="var(--md-sys-color-primary)" />}
        </div>
      </div>
    );
  }

  // Photo message
  if (msg.type === 'photo' && msg.photoUrl) {
    return <PhotoBubble msg={msg} isSelf={isSelf} time={time} onViewOnce={onViewOnce} wrapperProps={wrapperProps} renderReplyPreview={renderReplyPreview} crpBorder={crpBorder} />;
  }

  // Voice message
  if (msg.type === 'voice' && msg.voiceUrl) {
    return <VoiceBubble msg={msg} isSelf={isSelf} time={time} wrapperProps={wrapperProps} renderReplyPreview={renderReplyPreview} />;
  }

  return (
    <div {...wrapperProps}>
      {translateX > 20 && !isSelf && (
        <div style={{ position: 'absolute', left: -36, top: '50%', transform: 'translateY(-50%)', opacity: translateX / 60 }}>
          <ReplyIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
        </div>
      )}
      <div style={{ display: 'block' }}>
        <div style={getBubbleStyle()}>
          {renderReplyPreview()}
          {msg.text}
          <span style={{ fontSize: 10, marginLeft: 10, float: 'right', marginTop: 4, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 3 }}>
            {time}
            {isSelf && <DoubleCheckIcon size={14} color={isSelf ? 'rgba(255,255,255,0.7)' : 'var(--md-sys-color-primary)'} />}
          </span>
        </div>
        {msg.crpFlag && msg.crpReason && (
          <div style={{ fontSize: 10, padding: '4px 12px', marginTop: 2, color: msg.crpFlag === 'warn' ? 'var(--crp-warn)' : 'var(--crp-annotate)', fontStyle: 'italic' }}>
            {msg.crpReason}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoBubble({ msg, isSelf, time, onViewOnce, wrapperProps, renderReplyPreview, crpBorder }: any) {
  const [opened, setOpened] = useState(msg.viewOnceOpened || false);
  const [viewing, setViewing] = useState(false);

  if (msg.viewOnce && !opened && !viewing) {
    return (
      <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block' }}>
        <div style={{ padding: '12px 18px', borderRadius: 16, background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)', color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onClick={() => { setViewing(true); onViewOnce?.(); }}>
          <ViewOnceIcon size={20} />
          <span style={{ fontSize: 13 }}>View once photo</span>
          <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 'auto' }}>{time}</span>
        </div>
      </div>
    );
  }

  if (msg.viewOnce && viewing) {
    setTimeout(() => { setViewing(false); setOpened(true); }, 5000);
  }

  if (msg.viewOnce && opened && !viewing) {
    return (
      <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block' }}>
        <div style={{ padding: '8px 14px', borderRadius: 16, background: 'transparent', border: '1px solid var(--md-sys-color-outline-variant)', fontSize: 13, fontStyle: 'italic', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6 }}>
          Photo · Opened <span style={{ fontSize: 10, marginLeft: 8 }}>{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block', maxWidth: '65%' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', padding: 4, background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)', border: crpBorder }}>
        {renderReplyPreview()}
        <img src={msg.photoUrl} alt="photo" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
        <div style={{ fontSize: 10, color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--md-sys-color-on-surface-variant)', textAlign: isSelf ? 'right' : 'left', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, justifyContent: isSelf ? 'flex-end' : 'flex-start' }}>
          {msg.viewOnce && <ViewOnceIcon size={12} />}
          {time}
          {isSelf && <DoubleCheckIcon size={14} color={isSelf ? 'rgba(255,255,255,0.7)' : 'var(--md-sys-color-primary)'} />}
        </div>
      </div>
    </div>
  );
}

function VoiceBubble({ msg, isSelf, time, wrapperProps, renderReplyPreview }: any) {
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
    <div {...wrapperProps} style={{ ...wrapperProps.style, display: 'block', maxWidth: '70%' }}>
      <div style={{ padding: '10px 14px', borderRadius: isSelf ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isSelf ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)', color: isSelf ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)', minWidth: 200, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {renderReplyPreview()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: isSelf ? 'rgba(255,255,255,0.2)' : 'var(--md-sys-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {playing ? <PauseIcon size={16} color={isSelf ? '#fff' : 'var(--md-sys-color-on-primary)'} /> : <PlayIcon size={16} color={isSelf ? '#fff' : 'var(--md-sys-color-on-primary)'} />}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} style={{ width: 3, borderRadius: 2, height: 6 + Math.sin(i * 0.8) * 12 + Math.random() * 6, background: i < (progress / 5) ? (isSelf ? '#fff' : 'var(--md-sys-color-primary)') : (isSelf ? 'rgba(255,255,255,0.3)' : 'var(--md-sys-color-outline-variant)'), transition: 'background 0.1s' }} />
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
    </div>
  );
}
