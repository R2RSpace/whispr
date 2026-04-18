import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, MessageItem } from '../App';
import MessageBubble from '../components/MessageBubble';
import EmojiPicker from '../components/EmojiPicker';
import StickerPanel from '../components/StickerPanel';
import VoiceNote from '../components/VoiceNote';
import VoiceCall from '../components/VoiceCall';
import constitution from '../../../constitution.json';
import {
  BackIcon, MoreVertIcon, LockIcon, PhoneIcon, SendIcon, MicIcon,
  AttachIcon, EmojiIcon, StickerIcon, CameraIcon, ImageIcon, TrashIcon,
  VerifiedIcon, CloseIcon, ViewOnceIcon
} from '../components/Icons';

// CRP evaluation — runs BEFORE encryption, server never sees plaintext
interface CRPResult {
  action: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  reason: string | null;
}

function evaluateCRP(text: string): CRPResult {
  const normalized = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  for (const p of (constitution.principles as any[]).sort((a: any, b: any) => b.weight - a.weight)) {
    let matchedKeywords: string[] = [];
    let matchedPatterns: string[] = [];
    for (const kw of (p.keywords || [])) {
      if (normalized.includes(kw.toLowerCase())) matchedKeywords.push(kw);
    }
    for (const pattern of (p.patterns || [])) {
      try { if (new RegExp(pattern, 'gi').test(normalized)) matchedPatterns.push(pattern); } catch {}
    }
    let score = 0;
    if (matchedPatterns.length > 0) score += 0.7;
    if (matchedKeywords.length > 0) score += Math.min(0.6, matchedKeywords.length * 0.15);
    score = Math.min(1.0, score * (p.weight || 1));
    if (score > (p.violation_threshold || 0.5)) {
      if (p.enforcement_mode === 'BLOCK') return { action: 'BLOCK', reason: `Blocked by ${p.name}: message violates constitutional principle [${p.id}]` };
      if (p.enforcement_mode === 'WARN') return { action: 'WARN', reason: `Warning from ${p.name}: ${p.description}` };
      if (p.enforcement_mode === 'ANNOTATE') return { action: 'ANNOTATE', reason: `${p.name}: ${p.description}` };
    }
  }
  return { action: 'PASS', reason: null };
}

export default function ChatWindow({ onBack }: { onBack?: () => void }) {
  const { selectedChat, messages, addMessage, deleteMessage, clearChat } = useApp();
  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string; sender: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lamportRef = useRef(0);

  const chatMessages = selectedChat ? (messages[selectedChat.id] || []) : [];

  useEffect(() => {
    lamportRef.current = chatMessages.length;
  }, [selectedChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Close all popups when clicking outside
  useEffect(() => {
    const handler = () => { setShowMenu(false); setShowAttach(false); setContextMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !selectedChat) return;
    const crpResult = evaluateCRP(inputText);
    if (crpResult.action === 'BLOCK') {
      setIsBlocked(true);
      setBlockReason(crpResult.reason || 'Message blocked by Constitutional AI');
      setTimeout(() => setIsBlocked(false), 3000);
      inputRef.current?.classList.add('animate-shake');
      setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 500);
      return;
    }
    lamportRef.current++;
    const msg: MessageItem = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'self',
      timestamp: Date.now(),
      type: 'text',
      crpFlag: crpResult.action === 'WARN' ? 'warn' : crpResult.action === 'ANNOTATE' ? 'annotate' : null,
      crpReason: crpResult.reason,
    };
    addMessage(selectedChat.id, msg);
    setInputText('');
    setShowEmoji(false);
    setShowSticker(false);

    // Auto-reply (demo)
    setTimeout(() => {
      lamportRef.current++;
      addMessage(selectedChat.id, {
        id: crypto.randomUUID(),
        text: getAutoReply(inputText),
        sender: 'other',
        timestamp: Date.now(),
        type: 'text',
      });
    }, 1000 + Math.random() * 2000);
  }, [inputText, selectedChat, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePhotoSend = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      lamportRef.current++;
      addMessage(selectedChat.id, {
        id: crypto.randomUUID(),
        text: '',
        sender: 'self',
        timestamp: Date.now(),
        type: 'photo',
        photoUrl: ev.target?.result as string,
        viewOnce: viewOnceMode,
      });
      setViewOnceMode(false);
      setShowAttach(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVoiceSend = (url: string, dur: number) => {
    if (!selectedChat) return;
    lamportRef.current++;
    addMessage(selectedChat.id, {
      id: crypto.randomUUID(),
      text: '',
      sender: 'self',
      timestamp: Date.now(),
      type: 'voice',
      voiceUrl: url,
      voiceDuration: dur,
    });
    setIsRecording(false);
  };

  const handleStickerSend = (stickerUrl: string) => {
    if (!selectedChat) return;
    lamportRef.current++;
    addMessage(selectedChat.id, {
      id: crypto.randomUUID(),
      text: '',
      sender: 'self',
      timestamp: Date.now(),
      type: 'sticker',
      stickerUrl,
    });
    setShowSticker(false);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: MessageItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, sender: msg.sender });
  };

  if (!selectedChat) return null;

  if (showVoiceCall) {
    return <VoiceCall contactName={selectedChat.name} onEnd={() => setShowVoiceCall(false)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
      }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <BackIcon size={22} color="var(--md-sys-color-on-surface)" />
          </button>
        )}
        <div className="avatar" style={{ width: 38, height: 38, background: ['#7B61FF','#FF6B6B','#4ECDC4','#45B7D1'][selectedChat.name.charCodeAt(0) % 4] }}>
          {selectedChat.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--md-sys-color-on-surface)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {selectedChat.name}
            {selectedChat.verified && <VerifiedIcon size={16} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} />
            Online · E2EE
            <LockIcon size={12} color="var(--md-sys-color-on-surface-variant)" />
          </div>
        </div>
        <HeaderBtn onClick={() => setShowVoiceCall(true)}>
          <PhoneIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
        </HeaderBtn>
        <div style={{ position: 'relative' }}>
          <HeaderBtn onClick={(e: any) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
            <MoreVertIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
          </HeaderBtn>
          {showMenu && (
            <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{
              position: 'absolute', right: 0, top: 40, width: 180, padding: 6, zIndex: 50,
            }}>
              <MenuBtn onClick={() => { setShowInfo(!showInfo); setShowMenu(false); }}>Chat info</MenuBtn>
              <MenuBtn onClick={() => { if (selectedChat) clearChat(selectedChat.id); setShowMenu(false); }}>Clear chat</MenuBtn>
            </div>
          )}
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="animate-fade-in" style={{
          padding: 16, background: 'var(--md-sys-color-surface-container)',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)', fontSize: 12,
          color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LockIcon size={10} /> PQXDH + Triple Ratchet
            </span>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', fontSize: 10 }}>
              Mailbox: {selectedChat.mailboxId}
            </span>
          </div>
          <p>Safety Number: <code style={{ color: 'var(--md-sys-color-primary)' }}>A7F3 B2C1 D9E5 F6A8 B3C4 D7E2</code></p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* E2EE notice */}
        <div style={{
          textAlign: 'center', padding: '8px 16px', margin: '0 auto 12px',
          background: 'var(--md-sys-color-surface-container)', borderRadius: 20,
          fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)',
          display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        }}>
          <LockIcon size={12} /> Messages are end-to-end encrypted with post-quantum cryptography
        </div>

        {chatMessages.map((msg) => (
          <div key={msg.id} onContextMenu={(e) => handleContextMenu(e, msg)}>
            <MessageBubble
              msg={msg}
              onViewOnce={() => {
                if (msg.viewOnce && !msg.viewOnceOpened && selectedChat) {
                  // Mark as opened — in real app this would update server-side
                }
              }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context menu (right-click on message) */}
      {contextMenu && (
        <div className="card" onClick={e => e.stopPropagation()} style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          width: 200, padding: 6, zIndex: 200,
        }}>
          <MenuBtn onClick={() => { if (selectedChat) deleteMessage(selectedChat.id, contextMenu.msgId); setContextMenu(null); }}>
            Delete for me
          </MenuBtn>
          {contextMenu.sender === 'self' && (
            <MenuBtn onClick={() => { if (selectedChat) deleteMessage(selectedChat.id, contextMenu.msgId, true); setContextMenu(null); }} danger>
              Delete for everyone
            </MenuBtn>
          )}
        </div>
      )}

      {/* Block snackbar */}
      {isBlocked && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--md-sys-color-error)', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontSize: 13, zIndex: 100,
          maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {blockReason}
        </div>
      )}

      {/* Emoji / Sticker panels */}
      {showEmoji && (
        <EmojiPicker
          onSelect={(emoji) => { setInputText(prev => prev + emoji); }}
          onClose={() => setShowEmoji(false)}
        />
      )}
      {showSticker && (
        <StickerPanel
          onSelect={handleStickerSend}
          onClose={() => setShowSticker(false)}
        />
      )}

      {/* Voice recording overlay */}
      {isRecording && (
        <VoiceNote onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />
      )}

      {/* Attach popup */}
      {showAttach && (
        <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{
          position: 'absolute', bottom: 70, left: 16, width: 200, padding: 8, zIndex: 50,
        }}>
          <MenuBtn onClick={() => { fileInputRef.current?.click(); setViewOnceMode(false); }}>
            <ImageIcon size={18} /> Photo
          </MenuBtn>
          <MenuBtn onClick={() => { fileInputRef.current?.click(); setViewOnceMode(true); }}>
            <ViewOnceIcon size={18} /> View once photo
          </MenuBtn>
          <MenuBtn onClick={() => { setShowAttach(false); setIsRecording(true); }}>
            <MicIcon size={18} /> Voice note
          </MenuBtn>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSend} />

      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 12px',
        background: 'var(--md-sys-color-surface)',
        borderTop: '1px solid var(--md-sys-color-outline-variant)',
      }}>
        <InputBtn onClick={(e: any) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmoji(false); setShowSticker(false); }}>
          <AttachIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
        </InputBtn>
        <input
          ref={inputRef}
          className="input-field"
          style={{ flex: 1, padding: '10px 16px', borderRadius: 24, background: 'var(--md-sys-color-surface-container)', fontSize: 14 }}
          placeholder="Type a message..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowAttach(false); }}
        />
        <InputBtn onClick={() => { setShowEmoji(!showEmoji); setShowSticker(false); setShowAttach(false); }}>
          <EmojiIcon size={20} color={showEmoji ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'} />
        </InputBtn>
        <InputBtn onClick={() => { setShowSticker(!showSticker); setShowEmoji(false); setShowAttach(false); }}>
          <StickerIcon size={20} color={showSticker ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'} />
        </InputBtn>
        {inputText.trim() ? (
          <button className="fab" style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0 }} onClick={handleSend}>
            <SendIcon size={18} color="#fff" />
          </button>
        ) : (
          <InputBtn onClick={() => setIsRecording(true)}>
            <MicIcon size={22} color="var(--md-sys-color-on-surface-variant)" />
          </InputBtn>
        )}
      </div>
    </div>
  );
}

function HeaderBtn({ onClick, children }: { onClick: (e?: any) => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 8,
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >{children}</button>
  );
}

function InputBtn({ onClick, children }: { onClick: (e?: any) => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 6,
      display: 'flex', alignItems: 'center', flexShrink: 0,
    }}>{children}</button>
  );
}

function MenuBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
      border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8,
      color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)',
      fontSize: 13, fontFamily: 'var(--font-family)', textAlign: 'left',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >{children}</button>
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
