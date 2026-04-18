import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { SettingsIcon, EditIcon, SearchIcon, VerifiedIcon, ProfileIcon, ShieldIcon, LogOutIcon, BookIcon, DatabaseIcon, ClipboardIcon, TrashIcon, CloseIcon, MoreVertIcon, CheckIcon } from '../components/Icons';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ChatList() {
  const { username, profile, selectedChat, setSelectedChat, chats, logout, setShowProfile, setSettingsView, deleteChat, blockUser, clearChat } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatContextMenu, setChatContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // New Chat Dialog State
  const [newUsername, setNewUsername] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [searchUserError, setSearchUserError] = useState<string | null>(null);

  // Multi-select features
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

  // Long press feature
  const touchTimer = useRef<NodeJS.Timeout | null>(null);

  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#7B61FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const handleChatContext = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault(); e.stopPropagation();
    setChatContextMenu({ chatId, x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent, chatId: string) => {
    if (selectMode) return;
    const touch = e.touches[0];
    touchTimer.current = setTimeout(() => {
      setChatContextMenu({ chatId, x: touch.clientX, y: touch.clientY });
    }, 500); // 500ms long press
  };

  const clearTouchTimer = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  const toggleChatSelection = (chatId: string) => {
    const newSet = new Set(selectedChats);
    if (newSet.has(chatId)) newSet.delete(chatId);
    else newSet.add(chatId);
    setSelectedChats(newSet);
    if (newSet.size === 0) setSelectMode(false);
  };

  const clickChat = (chatId: string) => {
    if (selectMode) {
      toggleChatSelection(chatId);
    } else {
      const chat = chats.find(c => c.id === chatId);
      if (chat) setSelectedChat(chat);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectMode(false);
        setSelectedChats(new Set());
        setChatContextMenu(null);
        setShowSettings(false);
      }
      if (e.key === 'Shift') {
        setSelectMode(true);
      }
      if (selectMode && e.key === 'Delete' && selectedChats.size > 0) {
        setConfirmAction({
          title: `Delete ${selectedChats.size} chats?`,
          message: 'This will permanently remove the selected conversations.',
          onConfirm: () => {
            Array.from(selectedChats).forEach(id => deleteChat(id));
            setSelectMode(false);
            setSelectedChats(new Set());
          }
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMode, selectedChats, deleteChat]);

  const handleStartChat = async () => {
    if (!newUsername.trim()) return;
    setIsSearchingUser(true);
    setSearchUserError(null);
    try {
      const res = await fetch(`/api/auth/salt/${newUsername.trim()}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      
      if (!data.exists) {
        setSearchUserError('User tidak ditemukan / User not found');
      } else {
        // Automatically create a new chat context and route to it
        const newChatId = `chat-${crypto.randomUUID()}`;
        // Since we don't have the addChat function natively yet, we will just simulate opening it
        // Or we mutate local chats array directly (temporary until App.tsx rewrite)
        // Wait, for Phase 1 we will just alert 'success' or open a blank chat
        alert(`User found! Chat will be created via WebSockets in Phase 2`);
        setShowNewChat(false);
        setNewUsername('');
      }
    } catch (e) {
      setSearchUserError('Failed to ping server');
    } finally {
      setIsSearchingUser(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--md-sys-color-surface)', position: 'relative' }}
      onClick={() => { setShowSettings(false); setChatContextMenu(null); }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
          {selectMode ? `${selectedChats.size} Selected` : 'Whispr'}
        </h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {selectMode ? (
            <>
              <IconBtn onClick={() => {
                setConfirmAction({
                  title: `Delete ${selectedChats.size} chats?`,
                  message: 'This will permanently delete the selected conversations.',
                  onConfirm: () => {
                    Array.from(selectedChats).forEach(id => deleteChat(id));
                    setSelectMode(false);
                    setSelectedChats(new Set());
                  }
                });
              }}><TrashIcon size={20} color="var(--md-sys-color-error)" /></IconBtn>
              <IconBtn onClick={() => { setSelectMode(false); setSelectedChats(new Set()); }}><CloseIcon size={20} /></IconBtn>
            </>
          ) : (
            <>
              <IconBtn onClick={() => { setSelectMode(true); }}><CheckIcon size={20} color="var(--md-sys-color-on-surface-variant)" /></IconBtn>
              <IconBtn onClick={(e: any) => { e.stopPropagation(); setShowSettings(!showSettings); }}>
                <SettingsIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
              </IconBtn>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 16px 10px', position: 'relative' }}>
        <SearchIcon size={15} color="var(--md-sys-color-on-surface-variant)" style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
        <input className="input-field" style={{ padding: '10px 10px 10px 36px', fontSize: 13, borderRadius: 22, background: 'var(--md-sys-color-surface-container)' }}
          placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="card animate-fade-in" style={{ margin: '0 12px 8px', padding: 6, zIndex: 50 }} onClick={e => e.stopPropagation()}>
          <SBtn icon={<ProfileIcon size={18} />} label="Profile" onClick={() => { setShowProfile(true); setShowSettings(false); }} />
          <SBtn icon={<ShieldIcon size={18} />} label="Security & Privacy" onClick={() => { setSettingsView('security'); setShowSettings(false); }} />
          <SBtn icon={<BookIcon size={18} />} label="Constitution" onClick={() => { setSettingsView('constitution'); setShowSettings(false); }} />
          <SBtn icon={<DatabaseIcon size={18} />} label="Storage" onClick={() => { setSettingsView('storage'); setShowSettings(false); }} />
          <SBtn icon={<ClipboardIcon size={18} />} label="Audit Log" onClick={() => { setSettingsView('audit'); setShowSettings(false); }} />
          <div style={{ height: 1, background: 'var(--md-sys-color-outline-variant)', margin: '4px 0' }} />
          <SBtn icon={<LogOutIcon size={18} color="var(--md-sys-color-error)" />} label="Sign Out" onClick={logout} danger />
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {filteredChats.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 13 }}>No conversations</div>}
        {filteredChats.map((chat, index) => (
          <div key={chat.id} 
            onClick={() => clickChat(chat.id)} 
            onContextMenu={e => handleChatContext(e, chat.id)}
            onTouchStart={e => handleTouchStart(e, chat.id)}
            onTouchEnd={clearTouchTimer}
            onTouchMove={clearTouchTimer}
            className="animate-fade-in" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
              cursor: 'pointer', transition: 'background 0.15s',
              background: (selectedChat?.id === chat.id || selectedChats.has(chat.id)) ? 'var(--md-sys-color-secondary-container)' : 'transparent',
              animationDelay: `${index * 40}ms`, animationFillMode: 'backwards',
            }}
            onMouseEnter={e => { if (selectedChat?.id !== chat.id && !selectedChats.has(chat.id)) e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)'; }}
            onMouseLeave={e => { if (selectedChat?.id !== chat.id && !selectedChats.has(chat.id)) e.currentTarget.style.background = 'transparent'; }}>

            <div style={{ position: 'relative' }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, background: getAvatarColor(chat.name), opacity: selectedChats.has(chat.id) ? 0.7 : 1 }}>
                {chat.avatarUrl ? <img src={chat.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : chat.name.charAt(0).toUpperCase()}
              </div>
              {selectedChats.has(chat.id) && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--md-sys-color-primary)', borderRadius: '50%', padding: 2 }}>
                  <CheckIcon size={14} color="#fff" />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: chat.unread > 0 ? 600 : 400, color: 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chat.name}
                </span>
                {chat.verified && <VerifiedIcon size={16} />}
                <span style={{ fontSize: 11, color: chat.unread > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)', flexShrink: 0, marginLeft: 'auto' }}>
                  {formatTime(chat.timestamp)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--md-sys-color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chat.blocked ? '🚫 Blocked' : chat.lastMessage}
                </span>
                {chat.unread > 0 && <span className="badge" style={{ marginLeft: 8 }}>{chat.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat context menu */}
      {chatContextMenu && (
        <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: chatContextMenu.x, top: chatContextMenu.y, width: 220, padding: 6, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <MenuBtn onClick={() => {
            setConfirmAction({ title: 'Clear chat?', message: 'All messages in this chat will be removed.', onConfirm: () => { clearChat(chatContextMenu.chatId); setChatContextMenu(null); } });
            setChatContextMenu(null);
          }}><TrashIcon size={16} /> Clear chat</MenuBtn>
          <MenuBtn onClick={() => {
            setConfirmAction({ title: 'Delete chat?', message: 'This conversation will be permanently deleted.', onConfirm: () => { deleteChat(chatContextMenu.chatId); setChatContextMenu(null); } });
            setChatContextMenu(null);
          }} danger><TrashIcon size={16} /> Delete chat</MenuBtn>
          <MenuBtn onClick={() => {
            const chat = chats.find(c => c.id === chatContextMenu.chatId);
            if (!chat?.blocked) {
              setConfirmAction({ title: 'Block user?', message: 'They will no longer be able to send you messages.', onConfirm: () => { blockUser(chatContextMenu.chatId); setChatContextMenu(null); } });
            }
            setChatContextMenu(null);
          }} danger><ShieldIcon size={16} color="var(--md-sys-color-error)" /> Block user</MenuBtn>
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowNewChat(true)} style={{ position: 'absolute', bottom: 68, right: 14, zIndex: 10, width: 52, height: 52, borderRadius: 16 }}>
        <EditIcon size={22} color="var(--md-sys-color-on-primary-container)" />
      </button>

      {/* New Chat Dialog */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewChat(false)}>
          <div className="glass-card animate-fade-in" style={{ width: 340, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>New Conversation</h3>
            <input 
              className="input-field" 
              placeholder="Enter username to message..." 
              value={newUsername}
              onChange={e => { setNewUsername(e.target.value); setSearchUserError(null); }}
              style={{ marginBottom: searchUserError ? 4 : 16, borderColor: searchUserError ? 'var(--md-sys-color-error)' : undefined }} 
              onKeyDown={e => e.key === 'Enter' && handleStartChat()}
              autoFocus
            />
            {searchUserError && <div style={{ color: 'var(--md-sys-color-error)', fontSize: 12, marginBottom: 12 }}>{searchUserError}</div>}
            <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldIcon size={14} color="var(--md-sys-color-primary)" /> PQXDH key exchange will be initiated
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outlined" onClick={() => setShowNewChat(false)} disabled={isSearchingUser}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStartChat} disabled={isSearchingUser}>
                {isSearchingUser ? 'Searching...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom user info */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--md-sys-color-outline-variant)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setShowProfile(true)}>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: '#7B61FF', overflow: 'hidden' }}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile.displayName || username || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{profile.displayName || username}</div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />Online
          </div>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(123,97,255,0.12)', color: 'var(--md-sys-color-primary)', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>v1.2</span>
      </div>

      {/* Confirm dialog */}
      {confirmAction && <ConfirmDialog title={confirmAction.title} message={confirmAction.message} onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}

function IconBtn({ onClick, children }: { onClick: (e?: any) => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{children}</button>;
}

function SBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)', fontSize: 13, fontFamily: 'var(--font-family)', textAlign: 'left', transition: 'background 0.15s' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{icon}<span>{label}</span></button>;
}

function MenuBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)', fontSize: 13, fontFamily: 'var(--font-family)', textAlign: 'left' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{children}</button>;
}
