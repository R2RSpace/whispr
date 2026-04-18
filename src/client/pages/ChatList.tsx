import React, { useState } from 'react';
import { useApp, ChatItem } from '../App';

const DEMO_CHATS: ChatItem[] = [
  { id: '1', name: 'Alice', lastMessage: 'Hey, did you see the new update?', timestamp: Date.now() - 300000, unread: 2, mailboxId: 'mb-1' },
  { id: '2', name: 'Bob', lastMessage: 'The encryption looks solid 🔐', timestamp: Date.now() - 3600000, unread: 0, mailboxId: 'mb-2' },
  { id: '3', name: 'Carol', lastMessage: 'Can we discuss the constitution?', timestamp: Date.now() - 86400000, unread: 1, mailboxId: 'mb-3' },
  { id: '4', name: 'Dave', lastMessage: 'Post-quantum keys rotated ✅', timestamp: Date.now() - 172800000, unread: 0, mailboxId: 'mb-4' },
];

export default function ChatList() {
  const { username, selectedChat, setSelectedChat, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const filteredChats = DEMO_CHATS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
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
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--md-sys-color-on-surface-variant)',
              fontSize: 18,
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 16px 12px' }}>
        <input
          className="input-field"
          style={{ padding: 12, fontSize: 14, borderRadius: 24, background: 'var(--md-sys-color-surface-container)' }}
          placeholder="🔍 Search conversations..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="card animate-fade-in" style={{ margin: '0 16px 12px', padding: 8 }}>
          <SettingsButton icon="🔐" label="Security" onClick={() => {}} />
          <SettingsButton icon="📜" label="Constitution Editor" onClick={() => {}} />
          <SettingsButton icon="💾" label="Storage" onClick={() => {}} />
          <SettingsButton icon="📋" label="Audit Log" onClick={() => {}} />
          <div style={{ height: 1, background: 'var(--md-sys-color-outline-variant)', margin: '4px 0' }} />
          <SettingsButton icon="🚪" label="Sign Out" onClick={logout} danger />
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
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
            <div className="avatar" style={{ background: getAvatarColor(chat.name) }}>
              {getInitial(chat.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: chat.unread > 0 ? 600 : 400,
                  color: 'var(--md-sys-color-on-surface)',
                }}>
                  {chat.name}
                </span>
                <span style={{
                  fontSize: 11,
                  color: chat.unread > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  flexShrink: 0,
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
        <span style={{ fontSize: 24 }}>✏️</span>
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
            <p style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 16 }}>
              🔐 PQXDH key exchange will be initiated automatically
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outlined" onClick={() => setShowNewChat(false)}>Cancel</button>
              <button className="btn btn-primary">Start Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom user info */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--md-sys-color-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: 14, background: '#7B61FF' }}>
          {username?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{username}</div>
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />
            Online · E2EE Active
          </div>
        </div>
        <span style={{
          padding: '2px 8px',
          borderRadius: 10,
          background: 'rgba(123, 97, 255, 0.12)',
          color: 'var(--md-sys-color-primary)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.3px',
          flexShrink: 0,
        }}>
          v1.1
        </span>
      </div>
    </div>
  );
}

function SettingsButton({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
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
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
