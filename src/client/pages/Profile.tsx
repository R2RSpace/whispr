import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { BackIcon, CameraIcon } from '../components/Icons';

export default function Profile() {
  const { profile, updateProfile, setShowProfile, username } = useApp();
  const [name, setName] = useState(profile.displayName || username || '');
  const [uname, setUname] = useState(profile.username || username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateProfile({ avatarUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfile({ displayName: name, username: uname, bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-viewport" style={{ background: 'var(--md-sys-color-background)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
      }}>
        <button onClick={() => setShowProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <BackIcon size={22} color="var(--md-sys-color-on-surface)" />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>Profile</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 120, height: 120, borderRadius: '50%',
              background: profile.avatarUrl ? 'none' : 'linear-gradient(135deg, #7B61FF, #C9BFFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              fontSize: 48, color: '#fff', fontWeight: 500,
            }}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              name.charAt(0).toUpperCase()
            )}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <CameraIcon size={32} color="#fff" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Fields */}
        <Field label="Display Name" value={name} onChange={setName} placeholder="Your name" />
        <Field label="Username" value={uname} onChange={setUname} placeholder="@username" />
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'block' }}>Bio</label>
          <textarea
            className="input-field"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 150))}
            placeholder="Write something about yourself..."
            maxLength={150}
            rows={3}
            style={{ resize: 'none', fontFamily: 'var(--font-family)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'right', marginTop: 4 }}>
            {bio.length}/150
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'block' }}>{label}</label>
      <input className="input-field" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
