import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, StopIcon, SendIcon, CloseIcon } from './Icons';

interface Props {
  onSend: (url: string, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceNote({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        startTimeRef.current = Date.now();

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          if (!cancelled) setAudioUrl(url);
          stream.getTracks().forEach(t => t.stop());
        };

        recorder.start();

        timerRef.current = window.setInterval(() => {
          if (!cancelled) setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 200);
      } catch (err) {
        // Mic permission denied — create a demo recording
        if (!cancelled) {
          setRecording(false);
          setDuration(3);
          setAudioUrl('demo');
        }
      }
    };

    startRecording();

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const handleStop = () => {
    setRecording(false);
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const handleSend = () => {
    if (audioUrl) onSend(audioUrl, duration);
  };

  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
      background: 'var(--md-sys-color-surface)',
      borderTop: '1px solid var(--md-sys-color-outline-variant)',
    }}>
      {/* Cancel */}
      <button onClick={onCancel} style={{
        width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
        background: 'var(--md-sys-color-surface-container-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CloseIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
      </button>

      {/* Waveform / timer */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        {recording && (
          <div style={{
            width: 10, height: 10, borderRadius: 5,
            background: 'var(--md-sys-color-error)',
            animation: 'pulse 1s infinite',
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 32, flex: 1 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 2,
              height: recording ? (8 + Math.random() * 20) : (8 + Math.sin(i * 0.5) * 14),
              background: i < (recording ? 30 : 0) ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
              transition: 'height 0.2s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 14, color: 'var(--md-sys-color-on-surface)', fontFamily: 'monospace', minWidth: 40 }}>
          {format(duration)}
        </span>
      </div>

      {/* Stop / Send */}
      {recording ? (
        <button onClick={handleStop} style={{
          width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
          background: 'var(--md-sys-color-error)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <StopIcon size={18} color="#fff" />
        </button>
      ) : (
        <button onClick={handleSend} className="fab" style={{
          width: 44, height: 44, borderRadius: 22,
        }}>
          <SendIcon size={18} color="#fff" />
        </button>
      )}
    </div>
  );
}
