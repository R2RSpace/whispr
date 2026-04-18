import React, { useState, useEffect, useRef } from 'react';
import { PhoneIcon, EndCallIcon, MicIcon } from './Icons';

interface Props {
  contactName: string;
  onEnd: () => void;
}

export default function VoiceCall({ contactName, onEnd }: Props) {
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<number>(0);

  // Simulate call connection
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setStatus('connected');
    }, 3000);
    return () => clearTimeout(connectTimer);
  }, []);

  // Call duration timer
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const handleEnd = () => {
    setStatus('ended');
    clearInterval(timerRef.current);
    setTimeout(onEnd, 500);
  };

  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: '#fff', position: 'relative',
    }}>
      {/* Ripple animation for ringing */}
      {status === 'ringing' && (
        <>
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            border: '2px solid rgba(123, 97, 255, 0.3)',
            animation: 'ripple 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            border: '2px solid rgba(123, 97, 255, 0.3)',
            animation: 'ripple 2s ease-out infinite 0.5s',
          }} />
        </>
      )}

      {/* Avatar */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'linear-gradient(135deg, #7B61FF, #C9BFFF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 42, fontWeight: 500, marginBottom: 24,
        boxShadow: '0 8px 32px rgba(123, 97, 255, 0.4)',
      }}>
        {contactName.charAt(0)}
      </div>

      {/* Name */}
      <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>{contactName}</h2>

      {/* Status */}
      <p style={{
        fontSize: 14, opacity: 0.7,
        color: status === 'connected' ? '#4CAF50' : '#fff',
        marginBottom: 48,
      }}>
        {status === 'ringing' && 'Ringing...'}
        {status === 'connected' && format(duration)}
        {status === 'ended' && 'Call ended'}
      </p>

      {/* Call controls */}
      <div style={{ display: 'flex', gap: 32 }}>
        {status !== 'ended' && (
          <CallButton
            icon={<MicIcon size={24} color={isMuted ? 'var(--md-sys-color-error)' : '#fff'} />}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={() => setIsMuted(!isMuted)}
            bg="rgba(255,255,255,0.1)"
          />
        )}
        <CallButton
          icon={<EndCallIcon size={28} color="#fff" />}
          label="End"
          onClick={handleEnd}
          bg="#F44336"
          large
        />
      </div>

      {/* Security badge */}
      <div style={{
        position: 'absolute', bottom: 32,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, opacity: 0.5,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        End-to-end encrypted
      </div>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function CallButton({ icon, label, onClick, bg, large }: {
  icon: React.ReactNode; label: string; onClick: () => void; bg: string; large?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button onClick={onClick} style={{
        width: large ? 64 : 52, height: large ? 64 : 52,
        borderRadius: large ? 32 : 26,
        border: 'none', cursor: 'pointer',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {icon}
      </button>
      <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
    </div>
  );
}
