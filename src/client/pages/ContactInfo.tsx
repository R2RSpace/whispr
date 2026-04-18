import React, { useState } from 'react';
import { useApp } from '../App';
import { BackIcon, LockIcon, ShieldIcon, TrashIcon, CloseIcon } from '../components/Icons';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ContactInfo() {
  const { selectedChat, setShowContactInfo, blockUser, unblockUser, clearChat, deleteChat } = useApp();
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  if (!selectedChat) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--md-sys-color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: 16, borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
        <button onClick={() => setShowContactInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <BackIcon size={24} color="var(--md-sys-color-on-surface)" />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Contact Info</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container)' }}>
          <div className="avatar" style={{ width: 120, height: 120, fontSize: 48, background: '#7B61FF', marginBottom: 16 }}>
            {selectedChat.avatarUrl ? <img src={selectedChat.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : selectedChat.name.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>{selectedChat.name}</h2>
          <p style={{ fontSize: 15, color: 'var(--md-sys-color-on-surface-variant)' }}>{selectedChat.about || 'Available on Whispr'}</p>
        </div>

        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <LockIcon size={24} color="var(--md-sys-color-on-surface-variant)" />
            <div>
              <div style={{ fontSize: 16 }}>Encryption</div>
              <div style={{ fontSize: 14, color: 'var(--md-sys-color-on-surface-variant)' }}>Messages and calls are end-to-end encrypted with PQXDH.</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 0' }}>
          {selectedChat.blocked ? (
            <MenuItem icon={<ShieldIcon size={24} color="var(--md-sys-color-on-surface)" />} label="Unblock user" onClick={() => unblockUser(selectedChat.id)} />
          ) : (
            <MenuItem icon={<ShieldIcon size={24} color="var(--md-sys-color-error)" />} label="Block user" color="var(--md-sys-color-error)" onClick={() => {
              setConfirmAction({
                title: `Block ${selectedChat.name}?`,
                message: 'Blocked contacts will no longer be able to call you or send you messages.',
                onConfirm: () => blockUser(selectedChat.id)
              });
            }} />
          )}

          <MenuItem icon={<CloseIcon size={24} color="var(--md-sys-color-error)" />} label="Clear chat" color="var(--md-sys-color-error)" onClick={() => {
            setConfirmAction({
              title: 'Clear chat?',
              message: 'This will delete all messages for you in this chat.',
              onConfirm: () => clearChat(selectedChat.id)
            });
          }} />

          <MenuItem icon={<TrashIcon size={24} color="var(--md-sys-color-error)" />} label="Delete chat" color="var(--md-sys-color-error)" onClick={() => {
            setConfirmAction({
              title: 'Delete chat?',
              message: 'This conversation will be permanently deleted.',
              onConfirm: () => {
                deleteChat(selectedChat.id);
                setShowContactInfo(false);
              }
            });
          }} />
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function MenuItem({ icon, label, color = 'var(--md-sys-color-on-surface)', onClick }: { icon: React.ReactNode, label: string, color?: string, onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
      cursor: 'pointer', transition: 'background 0.15s', color
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon}
      <span style={{ fontSize: 16 }}>{label}</span>
    </div>
  );
}
