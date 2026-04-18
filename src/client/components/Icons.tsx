import React from 'react';

/** Whispr — SVG Icon System
 * Clean, minimal SVG icons inspired by WhatsApp / Material Design.
 * No emoji. All icons are 24x24 by default with currentColor fill.
 */

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const I = ({ size = 24, color = 'currentColor', style, className, onClick, children }: IconProps & { children: React.ReactNode }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} className={className} onClick={onClick}>
    {children}
  </svg>
);

export const ShieldIcon = ({ size, color, style, className }: IconProps) => (
  <I size={size} color={color} style={style} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color || 'currentColor'} stroke="none" />
    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" />
  </I>
);

export const SettingsIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </I>
);

export const SearchIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </I>
);

export const AttachIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </I>
);

export const SendIcon = (p: IconProps) => (
  <I {...p}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill={p.color || 'currentColor'} stroke="none" />
  </I>
);

export const MoreVertIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="5" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
    <circle cx="12" cy="19" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
  </I>
);

export const LockIcon = (p: IconProps) => (
  <I {...p} size={p.size || 14}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </I>
);

export const VerifiedIcon = ({ size = 16, color, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }}>
    <circle cx="12" cy="12" r="10" fill={color || '#4FC3F7'} />
    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MicIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </I>
);

export const CameraIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </I>
);

export const ImageIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
    <polyline points="21 15 16 10 5 21" />
  </I>
);

export const EmojiIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </I>
);

export const StickerIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z" />
    <polyline points="14 3 14 8 21 8" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="10" x2="9.01" y2="10" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="15" y1="10" x2="15.01" y2="10" strokeWidth="2.5" strokeLinecap="round" />
  </I>
);

export const PhoneIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </I>
);

export const BackIcon = (p: IconProps) => (
  <I {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </I>
);

export const CloseIcon = (p: IconProps) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);

export const TrashIcon = (p: IconProps) => (
  <I {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </I>
);

export const EditIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </I>
);

export const ProfileIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </I>
);

export const CheckIcon = (p: IconProps) => (
  <I {...p} size={p.size || 16}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);

export const DoubleCheckIcon = ({ size = 16, color = 'currentColor', style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <polyline points="18 6 9 17 4 12" />
    <polyline points="22 6 13 17" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <I {...p}>
    <polygon points="5 3 19 12 5 21 5 3" fill={p.color || 'currentColor'} stroke="none" />
  </I>
);

export const PauseIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="6" y="4" width="4" height="16" fill={p.color || 'currentColor'} stroke="none" />
    <rect x="14" y="4" width="4" height="16" fill={p.color || 'currentColor'} stroke="none" />
  </I>
);

export const StopIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" fill={p.color || 'currentColor'} stroke="none" />
  </I>
);

export const ViewOnceIcon = (p: IconProps) => (
  <I {...p} size={p.size || 18}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7z" />
    <line x1="1" y1="1" x2="23" y2="23" strokeWidth="1.5" />
  </I>
);

export const EndCallIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </I>
);

export const ReplyIcon = (p: IconProps) => (
  <I {...p}>
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 00-4-4H4" />
  </I>
);

export const CopyIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </I>
);

export const LogOutIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </I>
);

export const BookIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </I>
);

export const DatabaseIcon = (p: IconProps) => (
  <I {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </I>
);

export const ClipboardIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </I>
);
