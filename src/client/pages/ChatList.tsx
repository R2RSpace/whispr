import React, { useState } from 'react';
import { useApp } from '../App';
import { SettingsIcon, EditIcon, SearchIcon, VerifiedIcon, ProfileIcon, BookIcon, DatabaseIcon, ClipboardIcon, LogOutIcon, ShieldIcon } from '../components/Icons';

export default function ChatList() {
  const { username, profile, selectedChat, setSelectedChat, chats, logout, setShowProfile } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  const getAvatarColor = (name: string) => {
    const colors = ['#7B61FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--md-sys-color-surface)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
          Whispr
        </h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton onClick={() => setShowSettings(!showSettings)}>
            <SettingsIcon size={20} color="var(--md-sys-color-on-surface-variant)" />
          </IconButton>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 16px 12px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <SearchIcon size={16} color="var(--md-sys-color-on-surface-variant)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input-field"
            style={{ padding: '12px 12px 12px 38px', fontSize: 14, borderRadius: 24, background: 'var(--md-sys-color-surface-container)' }}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="card animate-fade-in" style={{ margin: '0 16px 12px', padding: 8 }}>
          <SettingsButton icon={<ProfileIcon size={18} />} label="Profile" onClick={() => { setShowProfile(true); setShowSettings(false); }} />
          <SettingsButton icon={<ShieldIcon size={18} />} label="Security" onClick={() => setShowSettings(false)} />
          <SettingsButton icon={<BookIcon size={18} />} label="Constitution" onClick={() => setShowSettings(false)} />
          <SettingsButton icon={<DatabaseIcon size={18} />} label="Storage" onClick={() => setShowSettings(false)} />
          <SettingsButton icon={<ClipboardIcon size={18} />} label="Audit Log" onClick={() => setShowSettings(false)} />
          <div style={{ height: 1, background: 'var(--md-sys-color-outline-variant)', margin: '4px 0' }} />
          <SettingsButton icon={<LogOutIcon size={18} color="var(--md-sys-color-error)" />} label="Sign Out" onClick={logout} danger />
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {filteredChats.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 13 }}>
            No conversations found
          </div>
        )}
        {filteredChats.map((chat, index) => (
          <div
            key={chat.id}
            onClick={() => setSelectedChat(chat)}
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
              background: selectedChat?.id === chat.id
                ? 'var(--md-sys-color-secondary-container)'
                : 'transparent',
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards',
            }}
            onMouseEnter={e => {
              if (selectedChat?.id !== chat.id)
                e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)';
            }}
            onMouseLeave={e => {
              if (selectedChat?.id !== chat.id)
                e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Avatar */}
            <div className="avatar" style={{ background: getAvatarColor(chat.name), position: 'relative' }}>
              {chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                getInitial(chat.name)
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: chat.unread > 0 ? 600 : 400,
                  color: 'var(--md-sys-color-on-surface)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {chat.name}
                </span>
                {chat.verified && <VerifiedIcon size={16} />}
                <span style={{
                  fontSize: 11,
                  color: chat.unread > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  flexShrink: 0,
                  marginLeft: 'auto',
                }}>
                  {formatTime(chat.timestamp)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{
                  fontSize: 13,
                  color: 'var(--md-sys-color-on-surface-variant)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {chat.lastMessage}
                </span>
                {chat.unread > 0 && (
                  <span className="badge" style={{ marginLeft: 8 }}>
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB - New Chat */}
      <button
        className="fab"
        onClick={() => setShowNewChat(true)}
        style={{ position: 'absolute', bottom: 72, right: 16, zIndex: 10 }}
      >
        <EditIcon size={22} color="var(--md-sys-color-on-primary-container)" />
      </button>

      {/* New Chat Dialog */}
      {showNewChat && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setShowNewChat(false)}>
          <div className="glass-card animate-fade-in" style={{ width: 340, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>New Conversation</h3>
            <input
              className="input-field"
              placeholder="Enter username to message..."
              style={{ marginBottom: 16 }}
            />
            <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldIcon size={14} color="var(--md-sys-color-primary)" />
              PQXDH key exchange will be initiated automatically
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outlined" onClick={() => setShowNewChat(false)}>Cancel</button>
              <button className="btn btn-primary">Start Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom user info */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
        onClick={() => setShowProfile(true)}
      >
        <div className="avatar" style={{ width: 32, height: 32, fontSize: 14, background: '#7B61FF', overflow: 'hidden' }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (profile.displayName || username || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
            {profile.displayName || username}
          </div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />
            Online
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 10,
          background: 'rgba(123, 97, 255, 0.12)', color: 'var(--md-sys-color-primary)',
          fontSize: 9, fontWeight: 600, letterSpacing: '0.3px', flexShrink: 0,
        }}>v1.2</span>
      </div>
    </div>
  );
}

function IconButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        width: 36, height: 36, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

function SettingsButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px', border: 'none',
        background: 'none', cursor: 'pointer', borderRadius: 8,
        color: danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)',
        fontSize: 14, fontFamily: 'var(--font-family)', textAlign: 'left',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
