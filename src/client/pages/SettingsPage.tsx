import React from 'react';
import { useApp } from '../App';
import { BackIcon, ShieldIcon, BookIcon, DatabaseIcon, ClipboardIcon } from '../components/Icons';
import SecuritySettings from '../components/SecuritySettings';
import ConstitutionEditor from '../components/ConstitutionEditor';
import StorageManager from '../components/StorageManager';
import AuditLogViewer from '../components/AuditLogViewer';

export default function SettingsPage() {
  const { settingsView, setSettingsView } = useApp();

  const renderContent = () => {
    switch (settingsView) {
      case 'security': return <SecuritySettings />;
      case 'constitution': return <ConstitutionEditor />;
      case 'storage': return <StorageManager />;
      case 'audit': return <AuditLogViewer />;
      default: return null;
    }
  };

  const getTitle = () => {
    switch (settingsView) {
      case 'security': return 'Security & Privacy';
      case 'constitution': return 'Constitutional AI';
      case 'storage': return 'Storage & Data';
      case 'audit': return 'Audit Logs';
      default: return 'Settings';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px', gap: 16,
        background: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)'
      }}>
        <button onClick={() => setSettingsView(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <BackIcon size={24} color="var(--md-sys-color-on-surface)" />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>
          {getTitle()}
        </h2>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
}
