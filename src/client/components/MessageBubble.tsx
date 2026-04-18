import React, { useRef, useEffect, useState } from 'react';

interface MessageBubbleProps {
  text: string;
  sender: 'self' | 'other';
  timestamp: number;
  crpFlag?: 'warn' | 'annotate' | null;
  crpReason?: string | null;
  index: number;
}

/**
 * MessageBubble — renders a chat message with CRP annotation support.
 * PATCH 18: Shadow DOM for Constitutional UI elements.
 * Constitutional annotations cannot be spoofed by message text injection.
 */
export default function MessageBubble({ text, sender, timestamp, crpFlag, crpReason, index }: MessageBubbleProps) {
  const shadowRef = useRef<HTMLDivElement>(null);
  const [showAnnotation, setShowAnnotation] = useState(false);

  // PATCH 18: Render CRP annotations in Shadow DOM
  useEffect(() => {
    if (!crpFlag || !crpReason || !shadowRef.current) return;
    
    // Only create shadow root once
    if (!shadowRef.current.shadowRoot) {
      const shadow = shadowRef.current.attachShadow({ mode: 'closed' });
      const badge = document.createElement('div');
      badge.style.cssText = `
        background: ${crpFlag === 'warn' ? '#4A3800' : '#1A3F6F'};
        color: ${crpFlag === 'warn' ? '#FFE08D' : '#C0E0FF'};
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-family: 'Roboto Flex', 'Inter', system-ui, sans-serif;
        line-height: 1.4;
        margin-top: 6px;
        display: flex;
        align-items: flex-start;
        gap: 6px;
      `;
      
      const icon = document.createElement('span');
      icon.textContent = crpFlag === 'warn' ? '⚠️' : 'ⓘ';
      icon.style.cssText = 'flex-shrink: 0; font-size: 12px;';
      
      const reasonText = document.createElement('span');
      reasonText.textContent = crpReason;
      
      badge.appendChild(icon);
      badge.appendChild(reasonText);
      shadow.appendChild(badge);
    }
  }, [crpFlag, crpReason]);

  const isSelf = sender === 'self';
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: 2,
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <div style={{
        maxWidth: '75%',
        minWidth: 80,
        position: 'relative',
      }}>
        {/* Main bubble */}
        <div style={{
          padding: '8px 12px',
          borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isSelf
            ? 'var(--md-sys-color-primary-container)'
            : 'var(--md-sys-color-surface-container-high)',
          color: isSelf
            ? 'var(--md-sys-color-on-primary-container)'
            : 'var(--md-sys-color-on-surface)',
          // CRP flag styling
          borderLeft: crpFlag === 'warn' ? '3px solid #FFC107' : undefined,
          position: 'relative',
        }}>
          {/* CRP annotation icon */}
          {crpFlag === 'annotate' && (
            <button
              onClick={() => setShowAnnotation(!showAnnotation)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                padding: 2,
                borderRadius: '50%',
                lineHeight: 1,
                opacity: 0.7,
              }}
              title="Constitutional AI annotation"
            >
              ⓘ
            </button>
          )}

          {/* Message text */}
          <p style={{
            fontSize: 14,
            lineHeight: 1.45,
            wordBreak: 'break-word',
            margin: 0,
            paddingRight: crpFlag === 'annotate' ? 20 : 0,
          }}>
            {text}
          </p>

          {/* Timestamp */}
          <div style={{
            fontSize: 10,
            color: isSelf
              ? 'rgba(229, 222, 255, 0.6)'
              : 'var(--md-sys-color-on-surface-variant)',
            textAlign: 'right',
            marginTop: 4,
          }}>
            {formatTime(timestamp)}
            {isSelf && <span style={{ marginLeft: 4 }}>✓✓</span>}
          </div>
        </div>

        {/* WARN banner for warned messages */}
        {crpFlag === 'warn' && (
          <div style={{
            marginTop: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'var(--md-sys-color-warn-container)',
            color: 'var(--md-sys-color-on-warn-container)',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            ⚠️ Constitutional review flagged this message
          </div>
        )}

        {/* PATCH 18: Shadow DOM annotation container */}
        {crpFlag && showAnnotation && (
          <div ref={shadowRef} style={{ marginTop: 4 }} />
        )}

        {/* ANNOTATE tooltip (non-Shadow fallback for hover) */}
        {crpFlag === 'annotate' && !showAnnotation && (
          <div ref={shadowRef} style={{ display: 'none' }} />
        )}
      </div>
    </div>
  );
}
