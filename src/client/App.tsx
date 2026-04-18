import React, { useState, useCallback, createContext, useContext } from 'react';
import Login from './pages/Login';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';

// --- App State Context ---
interface AppState {
  isLoggedIn: boolean;
  userId: string | null;
  username: string | null;
  sessionId: string | null;
  selectedChat: ChatItem | null;
  setSelectedChat: (chat: ChatItem | null) => void;
  login: (userId: string, username: string, sessionId: string) => void;
  logout: () => void;
}

export interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  unread: number;
  mailboxId: string;
}

const AppContext = createContext<AppState>({
  isLoggedIn: false,
  userId: null,
  username: null,
  sessionId: null,
  selectedChat: null,
  setSelectedChat: () => {},
  login: () => {},
  logout: () => {},
});

export const useApp = () => useContext(AppContext);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [isMobileShowChat, setIsMobileShowChat] = useState(false);

  const login = useCallback((uid: string, uname: string, sid: string) => {
    setUserId(uid);
    setUsername(uname);
    setSessionId(sid);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUserId(null);
    setUsername(null);
    setSessionId(null);
    setSelectedChat(null);
  }, []);

  const handleSelectChat = useCallback((chat: ChatItem | null) => {
    setSelectedChat(chat);
    if (chat) setIsMobileShowChat(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setIsMobileShowChat(false);
    setSelectedChat(null);
  }, []);

  if (!isLoggedIn) {
    return (
      <AppContext.Provider value={{ isLoggedIn, userId, username, sessionId, selectedChat, setSelectedChat: handleSelectChat, login, logout }}>
        <Login />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ isLoggedIn, userId, username, sessionId, selectedChat, setSelectedChat: handleSelectChat, login, logout }}>
      <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
        {/* Desktop: always show sidebar */}
        <div className="desktop-only" style={{ width: 360, borderRight: '1px solid var(--md-sys-color-outline-variant)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatList />
        </div>

        {/* Mobile: show either list or chat */}
        <div className="mobile-only" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {isMobileShowChat && selectedChat ? (
            <ChatWindow onBack={handleBackToList} />
          ) : (
            <ChatList />
          )}
        </div>

        {/* Desktop: right pane */}
        <div className="desktop-only" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <ChatWindow />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}

function EmptyState() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      color: 'var(--md-sys-color-on-surface-variant)',
      opacity: 0.6,
    }}>
      <div style={{ fontSize: 64 }}>🛡️</div>
      <h2 style={{ fontSize: 24, fontWeight: 400 }}>Whipsr</h2>
      <p style={{ fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        Constitutional secure messaging. Select a conversation or start a new one.
        Every message is reviewed by the Constitutional AI layer.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: 'var(--md-sys-color-primary-container)',
          color: 'var(--md-sys-color-on-primary-container)',
          fontSize: 12,
        }}>E2EE</span>
        <span style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: 'var(--md-sys-color-secondary-container)',
          color: 'var(--md-sys-color-on-secondary-container)',
          fontSize: 12,
        }}>Post-Quantum</span>
        <span style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: 'var(--md-sys-color-tertiary)',
          color: 'var(--md-sys-color-on-secondary)',
          fontSize: 12,
        }}>Constitutional AI</span>
      </div>
    </div>
  );
}
