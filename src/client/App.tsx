import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import Login from './pages/Login';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';
import Profile from './pages/Profile';
import ContactInfo from './pages/ContactInfo';
import SettingsPage from './pages/SettingsPage';

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
  blocked?: boolean;
  muted?: boolean;
  about?: string;
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
  deletedForEveryone?: boolean;
  stickerUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  replyTo?: { id: string; text: string; sender: string } | null;
  starred?: boolean;
}

export interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
}

export type SettingsView = null | 'security' | 'constitution' | 'storage' | 'audit';

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
  showContactInfo: boolean;
  settingsView: SettingsView;
  blockedUsers: string[];
  setShowProfile: (v: boolean) => void;
  setShowContactInfo: (v: boolean) => void;
  setSettingsView: (v: SettingsView) => void;
  setSelectedChat: (chat: ChatItem | null) => void;
  updateProfile: (p: Partial<UserProfile>) => void;
  addMessage: (chatId: string, msg: MessageItem) => void;
  deleteMessage: (chatId: string, msgId: string, forEveryone?: boolean) => void;
  deleteMessages: (chatId: string, msgIds: string[], forEveryone?: boolean) => void;
  clearChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ChatItem>) => void;
  blockUser: (chatId: string) => void;
  unblockUser: (chatId: string) => void;
  starMessage: (chatId: string, msgId: string) => void;
  login: (userId: string, username: string, sessionId: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

const LS = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k: string) => localStorage.removeItem(k),
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: '', username: '', bio: '', avatarUrl: null,
  lastSeen: 'everyone', readReceipts: true, profilePhoto: 'everyone',
};

const DEFAULT_CHATS: ChatItem[] = [];

const INITIAL_MESSAGES: Record<string, MessageItem[]> = {};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!LS.get('whispr_session'));
  const [userId, setUserId] = useState<string | null>(() => LS.get('whispr_session')?.userId || null);
  const [username, setUsername] = useState<string | null>(() => LS.get('whispr_session')?.username || null);
  const [sessionId, setSessionId] = useState<string | null>(() => LS.get('whispr_session')?.sessionId || null);
  const [profile, setProfile] = useState<UserProfile>(() => LS.get('whispr_profile') || DEFAULT_PROFILE);
  const [selectedChat, setSelectedChatRaw] = useState<ChatItem | null>(null);
  const [chats, setChats] = useState<ChatItem[]>(() => LS.get('whispr_chats') || DEFAULT_CHATS);
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>(() => LS.get('whispr_messages') || INITIAL_MESSAGES);
  const [isMobileShowChat, setIsMobileShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => LS.get('whispr_blocked') || []);

  useEffect(() => { LS.set('whispr_chats', chats); }, [chats]);
  useEffect(() => { LS.set('whispr_messages', messages); }, [messages]);
  useEffect(() => { LS.set('whispr_profile', profile); }, [profile]);
  useEffect(() => { LS.set('whispr_blocked', blockedUsers); }, [blockedUsers]);

  useEffect(() => {
    const handleAddChat = (e: any) => {
      const newChat = e.detail;
      setChats(prev => {
        if (prev.find(c => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
    };
    window.addEventListener('whispr_add_chat', handleAddChat);
    return () => window.removeEventListener('whispr_add_chat', handleAddChat);
  }, []);

  // Phase 2: Free Tier Polling engine
  useEffect(() => {
    if (!isLoggedIn || !username) return;
    
    // Polling index tracker to avoid processing same messages over and over
    let lastProcessedIds = new Set<string>();

    const interval = setInterval(async () => {
      try {
        const auth = LS.get('whispr_session');
        const res = await fetch(`/api/messages/inbox-${username}?page=0`, {
           headers: { 'Authorization': `Bearer ${auth?.sessionId}` }
        });
        if (res.ok) {
           const data = await res.json();
           if (data.messages && data.messages.length > 0) {
             const incomingMsgs = data.messages;
             const newMsgsToState: Record<string, MessageItem[]> = {};
             let createdNewChats = false;

             setChats(prevChats => {
               let mutChats = [...prevChats];

               setMessages(prevMessages => {
                 let mutMessages = { ...prevMessages };
                 
                 for (const encryptedItem of incomingMsgs) {
                   if (lastProcessedIds.has(encryptedItem.id)) continue;
                   lastProcessedIds.add(encryptedItem.id);

                   try {
                     const jsonStr = atob(encryptedItem.payload);
                     const msg: MessageItem = JSON.parse(jsonStr);

                     // Assume message was structured as { senderId, text, ... }
                     // For our mockup E2EE blind layer, `senderId` acts as the chatId
                     const senderId = msg.sender || 'unknown';
                     
                     // Ensure sender side is other since we received it in our inbox
                     msg.sender = 'other';
                     
                     if (!mutMessages[senderId]) mutMessages[senderId] = [];
                     // check for duplicates locally
                     if (!mutMessages[senderId].find(m => m.id === msg.id)) {
                       mutMessages[senderId].push(msg);
                     }

                     // find chat locally to update
                     const chatIdx = mutChats.findIndex(c => c.id === senderId);
                     const summary = msg.type === 'photo' ? '📷 Photo' : msg.text || '';
                     if (chatIdx >= 0) {
                       mutChats[chatIdx] = { ...mutChats[chatIdx], lastMessage: summary.slice(0, 50), timestamp: msg.timestamp || Date.now(), unread: (mutChats[chatIdx].unread || 0) + 1 };
                     } else {
                       mutChats.push({
                         id: senderId,
                         name: senderId, // display username
                         lastMessage: summary.slice(0, 50),
                         timestamp: msg.timestamp || Date.now(),
                         unread: 1,
                         mailboxId: `inbox-${senderId}`
                       });
                       createdNewChats = true;
                     }
                   } catch (parseErr) {
                     // Could not decode or parse standard format
                   }
                 }
                 return mutMessages;
               });

               return mutChats;
             });
           }
        }
      } catch (e) { }
    }, 3000); // Poll every 3 seconds to preserve 100k free tier limit
    
    return () => clearInterval(interval);
  }, [isLoggedIn, username]);

  const login = useCallback((uid: string, uname: string, sid: string) => {
    setUserId(uid); setUsername(uname); setSessionId(sid); setIsLoggedIn(true);
    LS.set('whispr_session', { userId: uid, username: uname, sessionId: sid });
    setProfile(prev => {
      const u = { ...prev, displayName: prev.displayName || uname, username: prev.username || uname };
      LS.set('whispr_profile', u); return u;
    });
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false); setUserId(null); setUsername(null); setSessionId(null);
    setSelectedChatRaw(null); LS.del('whispr_session');
  }, []);

  const handleSelectChat = useCallback((chat: ChatItem | null) => {
    setSelectedChatRaw(chat);
    if (chat) { setIsMobileShowChat(true); setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c)); }
  }, []);

  const handleBackToList = useCallback(() => { setIsMobileShowChat(false); setSelectedChatRaw(null); }, []);
  const updateProfile = useCallback((p: Partial<UserProfile>) => setProfile(prev => ({ ...prev, ...p })), []);

  const addMessage = useCallback((chatId: string, msg: MessageItem) => {
    setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
    const label = msg.type === 'photo' ? '📷 Photo' : msg.type === 'voice' ? '🎙 Voice' : msg.type === 'sticker' ? 'Sticker' : msg.text;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: label.slice(0, 50), timestamp: msg.timestamp } : c));

    // Network Sync phase (Optimistic)
    if (msg.sender === 'self' && username) {
      setTimeout(async () => {
        try {
          const auth = LS.get('whispr_session');
          // Add sender identification so recipient knows who is writing
          const payloadObj = { ...msg, sender: username }; 
          
          // Blind-server constraint wrapper: encode content into base64
          const payload = btoa(JSON.stringify(payloadObj)); 
          // Network execution against recipient's inbox
          await fetch(`/api/mailbox/inbox-${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth?.sessionId}` },
            body: JSON.stringify({ payload, message_iv: 'webrtc-iv', type: 'encrypted_message' })
          });
        } catch (e) {
          console.error('Failed to sync to network', e);
        }
      }, 0);
    }
  }, [username]);

  const deleteMessage = useCallback((chatId: string, msgId: string, forEveryone?: boolean) => {
    setMessages(prev => {
      const msgs = prev[chatId] || [];
      return { ...prev, [chatId]: forEveryone ? msgs.map(m => m.id === msgId ? { ...m, deletedForEveryone: true, text: 'This message was deleted' } : m) : msgs.filter(m => m.id !== msgId) };
    });
  }, []);

  const deleteMessages = useCallback((chatId: string, msgIds: string[], forEveryone?: boolean) => {
    setMessages(prev => {
      const msgs = prev[chatId] || [];
      return { ...prev, [chatId]: forEveryone ? msgs.map(m => msgIds.includes(m.id) ? { ...m, deletedForEveryone: true, text: 'This message was deleted' } : m) : msgs.filter(m => !msgIds.includes(m.id)) };
    });
  }, []);

  const clearChat = useCallback((chatId: string) => setMessages(prev => ({ ...prev, [chatId]: [] })), []);
  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    setMessages(prev => { const n = { ...prev }; delete n[chatId]; return n; });
    setSelectedChatRaw(null);
  }, []);

  const updateChat = useCallback((chatId: string, updates: Partial<ChatItem>) => setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c)), []);
  const blockUser = useCallback((chatId: string) => { setBlockedUsers(prev => [...prev, chatId]); setChats(prev => prev.map(c => c.id === chatId ? { ...c, blocked: true } : c)); }, []);
  const unblockUser = useCallback((chatId: string) => { setBlockedUsers(prev => prev.filter(id => id !== chatId)); setChats(prev => prev.map(c => c.id === chatId ? { ...c, blocked: false } : c)); }, []);
  const starMessage = useCallback((chatId: string, msgId: string) => { setMessages(prev => ({ ...prev, [chatId]: (prev[chatId] || []).map(m => m.id === msgId ? { ...m, starred: !m.starred } : m) })); }, []);

  const ctx: AppState = {
    isLoggedIn, userId, username, sessionId, profile, selectedChat, chats, messages, showProfile, showContactInfo, settingsView, blockedUsers,
    setShowProfile, setShowContactInfo, setSettingsView, setSelectedChat: handleSelectChat, updateProfile, addMessage, deleteMessage, deleteMessages, clearChat, deleteChat, updateChat, blockUser, unblockUser, starMessage, login, logout,
  };

  if (!isLoggedIn) return <AppContext.Provider value={ctx}><Login /></AppContext.Provider>;
  if (showProfile) return <AppContext.Provider value={ctx}><Profile /></AppContext.Provider>;
  if (settingsView) return <AppContext.Provider value={ctx}><SettingsPage /></AppContext.Provider>;
  if (showContactInfo && selectedChat) return <AppContext.Provider value={ctx}><ContactInfo /></AppContext.Provider>;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-viewport" style={{ display: 'flex', width: '100%' }}>
        <div className="desktop-only" style={{ width: 360, borderRight: '1px solid var(--md-sys-color-outline-variant)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatList />
        </div>
        <div className="mobile-only" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {isMobileShowChat && selectedChat ? <ChatWindow onBack={handleBackToList} /> : <ChatList />}
        </div>
        <div className="desktop-only" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? <ChatWindow /> : <EmptyState />}
        </div>
      </div>
    </AppContext.Provider>
  );
}

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.5 }}>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="var(--md-sys-color-primary)" fillOpacity="0.08" />
        <path d="M9 12l2 2 4-4" strokeWidth="2" />
      </svg>
      <h2 style={{ fontSize: 22, fontWeight: 400 }}>Whispr</h2>
      <p style={{ fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
        Select a conversation or start a new one.
        <br />Every message is reviewed by the Constitutional AI layer.
      </p>
    </div>
  );
}
