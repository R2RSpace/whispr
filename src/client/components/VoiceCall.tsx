import React, { useState, useEffect, useRef } from 'react';
import { PhoneIcon, EndCallIcon, MicIcon } from './Icons';

interface Props {
  contactName: string;
  onEnd: () => void;
  isInitiator?: boolean;
}

export default function VoiceCall({ contactName, onEnd, isInitiator = true }: Props) {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const authHeader = `Bearer ${JSON.parse(localStorage.getItem('whispr_session') || '{}')?.sessionId}`;
  const channelId = `call_${contactName.replace(/\s/g, '_')}`;

  const sendSignal = async (payload: any) => {
    fetch(`/api/webrtc/${channelId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(payload)
    }).catch(e => console.error("Signaling POST failed", e));
  };

  useEffect(() => {
    // 1. Initialize Audio
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;

    // 2. Initialize KV Polling Signaling
    let lastPoll = Date.now();
    let pollInterval: any = null;

    const initCall = async () => {
      try {
        // Request Microphone Access
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // Setup RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnectionRef.current = pc;

        // Add Local Tracks
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });

        // Handle incoming streams
        pc.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
          setStatus('connected');
        };

        // ICE Candidate handling
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
          }
        };

        // If Caller, Create Offer
        if (isInitiator) {
          setStatus('ringing');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: 'offer', sdp: offer.sdp });
        }

        // Start long-polling for signals
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(`/api/webrtc/poll/${channelId}?since=${lastPoll}`, {
              headers: { 'Authorization': authHeader }
            });
            if (res.ok) {
              lastPoll = Date.now();
              const { signals } = await res.json();
              for (const data of signals) {
                if (data.type === 'offer' && !isInitiator) {
                  await pc.setRemoteDescription(new RTCSessionDescription(data));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  sendSignal({ type: 'answer', sdp: answer.sdp });
                  setStatus('connected');
                } else if (data.type === 'answer' && isInitiator) {
                  await pc.setRemoteDescription(new RTCSessionDescription(data));
                  setStatus('connected');
                } else if (data.type === 'candidate') {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else if (data.type === 'end') {
                  handleEnd();
                }
              }
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 1500); // 1.5 second loop for signaling
        
      } catch (e) {
        console.error("Microphone access denied or WebRTC error", e);
        setStatus('ended');
        setTimeout(onEnd, 2000);
      }
    };
    
    initCall();

    return () => {
      clearInterval(pollInterval);


      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      clearInterval(timerRef.current);
    };
  }, [isInitiator]);

  // Call duration timer
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const handleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle
      });
      setIsMuted(!isMuted);
    }
  };

  const handleEnd = () => {
    setStatus('ended');
    clearInterval(timerRef.current);
    sendSignal({ type: 'end' });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    setTimeout(onEnd, 1000);
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
        {status === 'connecting' && 'Connecting to network...'}
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
            onClick={handleMute}
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
