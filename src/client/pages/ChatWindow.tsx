import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, MessageItem } from '../App';
import MessageBubble from '../components/MessageBubble';
import EmojiPicker from '../components/EmojiPicker';
import StickerPanel from '../components/StickerPanel';
import VoiceNote from '../components/VoiceNote';
import VoiceCall from '../components/VoiceCall';
import ConfirmDialog from '../components/ConfirmDialog';
import constitution from '../../../constitution.json';
import {
  BackIcon, MoreVertIcon, LockIcon, PhoneIcon, SendIcon, MicIcon,
  AttachIcon, EmojiIcon, StickerIcon, CameraIcon, ImageIcon, TrashIcon,
  VerifiedIcon, CloseIcon, ViewOnceIcon
} from '../components/Icons';

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
  const { selectedChat, messages, addMessage, deleteMessage, clearChat, setShowContactInfo } = useApp();
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
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lamportRef = useRef(0);

  const chatMessages = selectedChat ? (messages[selectedChat.id] || []) : [];

  useEffect(() => { lamportRef.current = chatMessages.length; }, [selectedChat?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { setShowMenu(false); setShowAttach(false); setContextMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false); setShowAttach(false); setShowEmoji(false); setShowSticker(false); setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.type === 'text' ? replyingTo.text : (replyingTo.type === 'photo' ? '📷 Photo' : 'Sticker'), sender: replyingTo.sender } : null
    };
    addMessage(selectedChat.id, msg);
    setInputText('');
    setShowEmoji(false);
    setShowSticker(false);
    setReplyingTo(null);
  }, [inputText, selectedChat, addMessage, replyingTo]);

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
        replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || 'Media', sender: replyingTo.sender } : null
      });
      setViewOnceMode(false);
      setShowAttach(false);
      setReplyingTo(null);
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
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || '🎙 Voice', sender: replyingTo.sender } : null
    });
    setIsRecording(false);
    setReplyingTo(null);
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
      replyTo: replyingTo ? { id: replyingTo.id, text: 'Sticker', sender: replyingTo.sender } : null
    });
    setShowSticker(false);
    setReplyingTo(null);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: MessageItem) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, sender: msg.sender });
  };

  if (!selectedChat) return null;
  if (showVoiceCall) return <VoiceCall contactName={selectedChat.name} onEnd={() => setShowVoiceCall(false)} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--md-sys-color-surface)', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <BackIcon size={22} color="var(--md-sys-color-on-surface)" />
          </button>
        )}
        <div className="avatar" style={{ width: 38, height: 38, background: ['#7B61FF','#FF6B6B','#4ECDC4','#45B7D1'][selectedChat.name.charCodeAt(0) % 4], cursor: 'pointer' }} onClick={() => setShowContactInfo(true)}>
          {selectedChat.avatarUrl ? <img src={selectedChat.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : selectedChat.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setShowContactInfo(true)}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--md-sys-color-on-surface)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {selectedChat.name} {selectedChat.verified && <VerifiedIcon size={16} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} /> Online · E2EE <LockIcon size={12} color="var(--md-sys-color-on-surface-variant)" />
          </div>
        </div>
        <HeaderBtn onClick={() => setShowVoiceCall(true)}><PhoneIcon size={20} color="var(--md-sys-color-on-surface-variant)" /></HeaderBtn>
        <div style={{ position: 'relative' }}>
          <HeaderBtn onClick={(e: any) => { e.stopPropagation(); setShowMenu(!showMenu); }}><MoreVertIcon size={20} color="var(--md-sys-color-on-surface-variant)" /></HeaderBtn>
          {showMenu && (
            <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 40, width: 180, padding: 6, zIndex: 50 }}>
              <MenuBtn onClick={() => { setShowContactInfo(true); setShowMenu(false); }}>Contact info</MenuBtn>
              <MenuBtn onClick={() => { if (selectedChat) {
                setConfirmAction({ title: 'Clear chat?', message: 'Delete all messages for you locally?', onConfirm: () => clearChat(selectedChat.id) });
              }; setShowMenu(false); }}>Clear chat</MenuBtn>
            </div>
          )}
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="animate-fade-in" style={{ padding: 16, background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)', fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LockIcon size={10} /> PQXDH + Triple Ratchet
            </span>
            <span style={{ padding: '3px 8px', borderRadius: 12, background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', fontSize: 10 }}>Mailbox: {selectedChat.mailboxId}</span>
          </div>
          <p>Safety Number: <code style={{ color: 'var(--md-sys-color-primary)' }}>A7F3 B2C1 D9E5 F6A8 B3C4 D7E2</code></p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ textAlign: 'center', padding: '8px 16px', margin: '0 auto 12px', background: 'var(--md-sys-color-surface-container)', borderRadius: 20, fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <LockIcon size={12} /> Messages are end-to-end encrypted with post-quantum cryptography
        </div>
        {chatMessages.map((msg) => (
          <div key={msg.id} onContextMenu={(e) => handleContextMenu(e, msg)} style={{ display: 'flex', flexDirection: 'column' }}>
            <MessageBubble msg={msg} onReply={(m) => setReplyingTo(m)} onViewOnce={() => { if (msg.viewOnce && !msg.viewOnceOpened && selectedChat) {} }} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context menu (right-click on message) */}
      {contextMenu && (
        <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 220, padding: 6, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <MenuBtn onClick={() => {
            setConfirmAction({
              title: 'Delete message?',
              message: 'This will delete the message for you.',
              onConfirm: () => { if (selectedChat) deleteMessage(selectedChat.id, contextMenu.msgId); }
            });
            setContextMenu(null);
          }}>Delete for me</MenuBtn>
          {contextMenu.sender === 'self' && (
            <MenuBtn onClick={() => {
              setConfirmAction({
                title: 'Delete for everyone?',
                message: 'This will remove the message for all participants in the chat.',
                onConfirm: () => { if (selectedChat) deleteMessage(selectedChat.id, contextMenu.msgId, true); }
              });
              setContextMenu(null);
            }} danger>Delete for everyone</MenuBtn>
          )}
        </div>
      )}

      {isBlocked && (
        <div className="animate-fade-in" style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--md-sys-color-error)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 13, zIndex: 100, maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{blockReason}</div>
      )}

      {showEmoji && <EmojiPicker onSelect={(emoji) => { setInputText(prev => prev + emoji); }} onClose={() => setShowEmoji(false)} />}
      {showSticker && <StickerPanel onSelect={handleStickerSend} onClose={() => setShowSticker(false)} />}
      {isRecording && <VoiceNote onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />}

      {showAttach && (
        <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 70, left: 16, width: 200, padding: 8, zIndex: 50 }}>
          <MenuBtn onClick={() => { fileInputRef.current?.click(); setViewOnceMode(false); }}><ImageIcon size={18} /> Photo</MenuBtn>
          <MenuBtn onClick={() => { fileInputRef.current?.click(); setViewOnceMode(true); }}><ViewOnceIcon size={18} /> View once photo</MenuBtn>
          <MenuBtn onClick={() => { setShowAttach(false); setIsRecording(true); }}><MicIcon size={18} /> Voice note</MenuBtn>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSend} />

      {/* Input section wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--md-sys-color-surface)', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
        
        {/* Reply Preview */}
        {replyingTo && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--md-sys-color-surface-container-high)', borderLeft: '4px solid var(--md-sys-color-primary)', margin: '8px 12px 0', borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{replyingTo.sender === 'self' ? 'You' : selectedChat.name}</div>
              <div style={{ fontSize: 13, color: 'var(--md-sys-color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyingTo.text || (replyingTo.type === 'photo' ? '📷 Photo' : 'Message')}
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <CloseIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
          <InputBtn onClick={(e: any) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmoji(false); setShowSticker(false); }}><AttachIcon size={20} color="var(--md-sys-color-on-surface-variant)" /></InputBtn>
          <input ref={inputRef} className="input-field" style={{ flex: 1, padding: '10px 16px', borderRadius: 24, background: 'var(--md-sys-color-surface-container)', fontSize: 14 }} placeholder="Type a message..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => { setShowAttach(false); }} />
          <InputBtn onClick={() => { setShowEmoji(!showEmoji); setShowSticker(false); setShowAttach(false); }}><EmojiIcon size={20} color={showEmoji ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'} /></InputBtn>
          <InputBtn onClick={() => { setShowSticker(!showSticker); setShowEmoji(false); setShowAttach(false); }}><StickerIcon size={20} color={showSticker ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'} /></InputBtn>
          {inputText.trim() ? (
            <button className="fab" style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0 }} onClick={handleSend}><SendIcon size={18} color="#fff" /></button>
          ) : (
            <InputBtn onClick={() => setIsRecording(true)}><MicIcon size={22} color="var(--md-sys-color-on-surface-variant)" /></InputBtn>
          )}
        </div>
      </div>

      {confirmAction && <ConfirmDialog title={confirmAction.title} message={confirmAction.message} onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}

function HeaderBtn({ onClick, children }: { onClick: (e?: any) => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{children}</button>;
}

function InputBtn({ onClick, children }: { onClick: (e?: any) => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{children}</button>;
}

function MenuBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)', fontSize: 13, fontFamily: 'var(--font-family)', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{children}</button>;
}
