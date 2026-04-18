import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import MessageBubble from '../components/MessageBubble';
import constitution from '../../../constitution.json';

// Inline CRP evaluation for client-side enforcement
// This runs BEFORE encryption per Section 3 — server never sees plaintext
interface CRPResult {
  action: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  reason: string | null;
}

function evaluateCRP(text: string): CRPResult {
  const normalized = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  for (const p of (constitution.principles as any[]).sort((a: any, b: any) => b.weight - a.weight)) {
    let matchedKeywords: string[] = [];
    let matchedPatterns: string[] = [];
    
    // Keyword matching
    for (const kw of (p.keywords || [])) {
      if (normalized.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    }
    
    // Pattern matching (high-confidence signals)
    for (const pattern of (p.patterns || [])) {
      try {
        if (new RegExp(pattern, 'gi').test(normalized)) {
          matchedPatterns.push(pattern);
        }
      } catch {}
    }
    
    // Scoring: Patterns are STRONG signals (regex catches intent, not just words)
    // Pattern match = 0.7 base score (above most thresholds alone)
    // Keyword match = 0.15 each (up to 0.6)
    // Both = guaranteed trigger
    let score = 0;
    
    if (matchedPatterns.length > 0) {
      score += 0.7; // Pattern match is a strong, high-confidence signal
    }
    
    if (matchedKeywords.length > 0) {
      // Each keyword adds ~0.15, capped at 0.6
      score += Math.min(0.6, matchedKeywords.length * 0.15);
    }
    
    score = Math.min(1.0, score * (p.weight || 1));
    
    if (score > (p.violation_threshold || 0.5)) {
      if (p.enforcement_mode === 'BLOCK') {
        return { action: 'BLOCK', reason: `Blocked by ${p.name}: message violates constitutional principle [${p.id}]` };
      }
      if (p.enforcement_mode === 'WARN') {
        return { action: 'WARN', reason: `Warning from ${p.name}: ${p.description}` };
      }
      if (p.enforcement_mode === 'ANNOTATE') {
        return { action: 'ANNOTATE', reason: `${p.name}: ${p.description}` };
      }
    }
  }
  
  return { action: 'PASS', reason: null };
}

interface Message {
  id: string;
  text: string;
  sender: 'self' | 'other';
  timestamp: number;
  crpFlag?: 'warn' | 'annotate' | null;
  crpReason?: string | null;
  lamportSeq: number;
}

export default function ChatWindow({ onBack }: { onBack?: () => void }) {
  const { selectedChat, username } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lamportRef = useRef(0);

  // Initialize demo messages
  useEffect(() => {
    if (selectedChat) {
      setMessages([
        { id: '1', text: 'Hey! How are you?', sender: 'other', timestamp: Date.now() - 600000, lamportSeq: 1 },
        { id: '2', text: 'Good! Just testing the constitutional review system 🛡️', sender: 'self', timestamp: Date.now() - 540000, lamportSeq: 2 },
        { id: '3', text: 'Nice! The E2EE looks solid with the triple ratchet', sender: 'other', timestamp: Date.now() - 480000, lamportSeq: 3 },
      ]);
      lamportRef.current = 3;
    }
  }, [selectedChat?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    // Run CRP pipeline before sending (client-side, PATCH 05)
    const crpResult = evaluateCRP(inputText);

    if (crpResult.action === 'BLOCK') {
      // Message blocked — show error animation
      setIsBlocked(true);
      setBlockReason(crpResult.reason || 'Message blocked by Constitutional AI');
      setTimeout(() => setIsBlocked(false), 3000);
      // Input shakes
      inputRef.current?.classList.add('animate-shake');
      setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 500);
      return;
    }

    lamportRef.current++;
    const newMessage: Message = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'self',
      timestamp: Date.now(),
      crpFlag: crpResult.action === 'WARN' ? 'warn' : crpResult.action === 'ANNOTATE' ? 'annotate' : null,
      crpReason: crpResult.reason,
      lamportSeq: lamportRef.current,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate response
    setTimeout(() => {
      lamportRef.current++;
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: getAutoReply(inputText),
        sender: 'other',
        timestamp: Date.now(),
        lamportSeq: lamportRef.current,
      }]);
    }, 1000 + Math.random() * 2000);
  }, [inputText, selectedChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedChat) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--md-sys-color-on-surface)', fontSize: 20, padding: 4,
            }}
          >
            ←
          </button>
        )}
        <div className="avatar" style={{
          background: ['#7B61FF','#FF6B6B','#4ECDC4','#45B7D1'][selectedChat.name.charCodeAt(0) % 4]
        }}>
          {selectedChat.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
            {selectedChat.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} />
            Online · E2EE 🔒
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--md-sys-color-on-surface-variant)', fontSize: 18,
          }}
        >
          ℹ️
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="animate-fade-in" style={{
          padding: 16,
          background: 'var(--md-sys-color-surface-container)',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          fontSize: 12,
          color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontSize: 10 }}>
              🔐 PQXDH + Triple Ratchet
            </span>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', fontSize: 10 }}>
              📬 Mailbox: {selectedChat.mailboxId}
            </span>
          </div>
          <p>Safety Number: <code style={{ color: 'var(--md-sys-color-primary)' }}>A7F3 B2C1 D9E5 F6A8 B3C4 D7E2</code></p>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {/* E2EE notice */}
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          margin: '0 auto 12px',
          background: 'var(--md-sys-color-surface-container)',
          borderRadius: 20,
          fontSize: 11,
          color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          🔒 Messages are end-to-end encrypted with post-quantum cryptography
        </div>

        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            sender={msg.sender}
            timestamp={msg.timestamp}
            crpFlag={msg.crpFlag}
            crpReason={msg.crpReason}
            index={index}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Block snackbar */}
      <div className={`snackbar error ${isBlocked ? 'visible' : ''}`}>
        🚫 {blockReason}
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'var(--md-sys-color-surface)',
        borderTop: '1px solid var(--md-sys-color-outline-variant)',
      }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20, padding: 4,
        }}>
          📎
        </button>
        <input
          ref={inputRef}
          className="input-field"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 24,
            background: 'var(--md-sys-color-surface-container)',
          }}
          placeholder="Type a message..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="fab"
          style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0 }}
          onClick={handleSend}
          disabled={!inputText.trim()}
        >
          <span style={{ fontSize: 18 }}>➤</span>
        </button>
      </div>
    </div>
  );
}

function getAutoReply(input: string): string {
  const replies = [
    'That makes sense! The constitutional review seems to work well.',
    'Great point. The blind server architecture keeps everything private.',
    'I agree. Post-quantum crypto is essential for future-proofing.',
    'Good to hear! The triple ratchet provides perfect forward secrecy.',
    'Absolutely. Privacy and safety should always work together.',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
