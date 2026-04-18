import React, { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import Login from './pages/Login';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';
import Profile from './pages/Profile';

// --- Types ---
export interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  unread: number;
  mailboxId: string;
  verified?: boolean;
  avatarUrl?: string | null;
}

export interface MessageItem {
  id: string;
  text: string;
  sender: 'self' | 'other';
  timestamp: number;
  crpFlag?: 'warn' | 'annotate' | null;
  crpReason?: string | null;
  type?: 'text' | 'photo' | 'sticker' | 'voice' | 'system';
  photoUrl?: string;
  viewOnce?: boolean;
  viewOnceOpened?: boolean;
  deleted?: boolean;
  deletedForEveryone?: boolean;
  stickerUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
}

export interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
}

// --- App State Context ---
interface AppState {
  isLoggedIn: boolean;
  userId: string | null;
  username: string | null;
  sessionId: string | null;
  profile: UserProfile;
  selectedChat: ChatItem | null;
  chats: ChatItem[];
  messages: Record<string, MessageItem[]>;
  showProfile: boolean;
  setShowProfile: (v: boolean) => void;
  setSelectedChat: (chat: ChatItem | null) => void;
  updateProfile: (p: Partial<UserProfile>) => void;
  addMessage: (chatId: string, msg: MessageItem) => void;
  deleteMessage: (chatId: string, msgId: string, forEveryone?: boolean) => void;
  clearChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ChatItem>) => void;
  login: (userId: string, username: string, sessionId: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

// Storage helpers
const LS = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k: string) => localStorage.removeItem(k),
};

const DEFAULT_CHATS: ChatItem[] = [
  {
    id: 'whispr-dev',
    name: 'Whispr Developers',
    lastMessage: 'Welcome to Whispr! 🛡️',
    timestamp: Date.now() - 60000,
    unread: 1,
    mailboxId: 'mb-official',
    verified: true,
  },
];

const INITIAL_MESSAGES: Record<string, MessageItem[]> = {
  'whispr-dev': [
    { id: 'w1', text: 'Welcome to Whispr — Constitutional Secure Messaging!', sender: 'other', timestamp: Date.now() - 3600000, type: 'text' },
    { id: 'w2', text: 'All messages are end-to-end encrypted with post-quantum cryptography (PQXDH + Triple Ratchet).', sender: 'other', timestamp: Date.now() - 3500000, type: 'text' },
    { id: 'w3', text: 'Every message passes through the Constitutional Review Pipeline before sending. Try sending something — or test the CRP by typing something harmful!', sender: 'other', timestamp: Date.now() - 3400000, type: 'text' },
  ],
};

export default function App() {
  // Restore session from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!LS.get('whispr_session'));
  const [userId, setUserId] = useState<string | null>(() => LS.get('whispr_session')?.userId || null);
  const [username, setUsername] = useState<string | null>(() => LS.get('whispr_session')?.username || null);
  const [sessionId, setSessionId] = useState<string | null>(() => LS.get('whispr_session')?.sessionId || null);
  const [profile, setProfile] = useState<UserProfile>(() => LS.get('whispr_profile') || { displayName: '', username: '', bio: '', avatarUrl: null });
  const [selectedChat, setSelectedChatRaw] = useState<ChatItem | null>(null);
  const [chats, setChats] = useState<ChatItem[]>(() => LS.get('whispr_chats') || DEFAULT_CHATS);
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>(() => LS.get('whispr_messages') || INITIAL_MESSAGES);
  const [isMobileShowChat, setIsMobileShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Persist on change
  useEffect(() => { if (chats) LS.set('whispr_chats', chats); }, [chats]);
  useEffect(() => { if (messages) LS.set('whispr_messages', messages); }, [messages]);
  useEffect(() => { if (profile) LS.set('whispr_profile', profile); }, [profile]);

  const login = useCallback((uid: string, uname: string, sid: string) => {
    setUserId(uid);
    setUsername(uname);
    setSessionId(sid);
    setIsLoggedIn(true);
    LS.set('whispr_session', { userId: uid, username: uname, sessionId: sid });
    // Sync profile name if first login
    setProfile(prev => {
      const updated = { ...prev, displayName: prev.displayName || uname, username: prev.username || uname };
      LS.set('whispr_profile', updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUserId(null);
    setUsername(null);
    setSessionId(null);
    setSelectedChatRaw(null);
    LS.del('whispr_session');
  }, []);

  const handleSelectChat = useCallback((chat: ChatItem | null) => {
    setSelectedChatRaw(chat);
    if (chat) {
      setIsMobileShowChat(true);
      // Clear unread
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setIsMobileShowChat(false);
    setSelectedChatRaw(null);
  }, []);

  const updateProfile = useCallback((p: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...p };
      LS.set('whispr_profile', updated);
      return updated;
    });
  }, []);

  const addMessage = useCallback((chatId: string, msg: MessageItem) => {
    setMessages(prev => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), msg] };
      return updated;
    });
    // Update last message in chat list
    if (msg.type === 'text' || !msg.type) {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: msg.text, timestamp: msg.timestamp } : c));
    } else if (msg.type === 'photo') {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: '📷 Photo', timestamp: msg.timestamp } : c));
    } else if (msg.type === 'voice') {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: '🎙️ Voice message', timestamp: msg.timestamp } : c));
    } else if (msg.type === 'sticker') {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: 'Sticker', timestamp: msg.timestamp } : c));
    }
  }, []);

  const deleteMessage = useCallback((chatId: string, msgId: string, forEveryone?: boolean) => {
    setMessages(prev => {
      const chatMsgs = prev[chatId] || [];
      if (forEveryone) {
        return { ...prev, [chatId]: chatMsgs.map(m => m.id === msgId ? { ...m, deletedForEveryone: true, text: 'This message was deleted' } : m) };
      } else {
        return { ...prev, [chatId]: chatMsgs.filter(m => m.id !== msgId) };
      }
    });
  }, []);

  const clearChat = useCallback((chatId: string) => {
    setMessages(prev => ({ ...prev, [chatId]: [] }));
  }, []);

  const updateChat = useCallback((chatId: string, updates: Partial<ChatItem>) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
  }, []);

  const ctx: AppState = {
    isLoggedIn, userId, username, sessionId, profile, selectedChat, chats, messages, showProfile,
    setShowProfile, setSelectedChat: handleSelectChat, updateProfile, addMessage, deleteMessage, clearChat, updateChat, login, logout,
  };

  if (!isLoggedIn) {
    return (
      <AppContext.Provider value={ctx}>
        <Login />
      </AppContext.Provider>
    );
  }

  if (showProfile) {
    return (
      <AppContext.Provider value={ctx}>
        <Profile />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
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
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="var(--md-sys-color-primary)" fillOpacity="0.1" />
        <path d="M9 12l2 2 4-4" strokeWidth="2" />
      </svg>
      <h2 style={{ fontSize: 24, fontWeight: 400 }}>Whispr</h2>
      <p style={{ fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        Constitutional secure messaging. Select a conversation or start a new one.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['E2EE', 'Post-Quantum', 'Constitutional AI'].map(label => (
          <span key={label} style={{
            padding: '4px 12px',
            borderRadius: 20,
            background: 'var(--md-sys-color-surface-container)',
            color: 'var(--md-sys-color-on-surface-variant)',
            fontSize: 12,
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
