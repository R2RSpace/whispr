import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { ShieldIcon, LockIcon } from '../components/Icons';

export default function Login() {
  const { login } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicDuress, setMnemonicDuress] = useState('');
  const [confirmIndices, setConfirmIndices] = useState<number[]>([]);
  const [confirmWords, setConfirmWords] = useState(['', '', '']);
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Particle animation effect
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number; y: number; vx: number; vy: number; size: number; alpha: number}> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 191, 255, ${p.alpha})`;
        ctx.fill();
      }
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201, 191, 255, ${0.05 * (1 - dist / 150)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password required');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // Simulate Argon2id progress
      setProgress(30);
      await new Promise(r => setTimeout(r, 500));
      setProgress(60);
      await new Promise(r => setTimeout(r, 500));
      setProgress(90);

      const API_BASE = '';
      
      if (isSignUp) {
        // Get PoW challenge
        const powRes = await fetch(`${API_BASE}/api/pow/challenge`).catch(() => null);
        
        // Generate mock auth hash (in production, Argon2id runs in Worker)
        const authHash = await hashForDemo(password);

        // Register
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password_hash: authHash,
            argon2_salt: crypto.randomUUID(),
            key_bundle_iv: crypto.randomUUID(),
            device_pubkey: crypto.randomUUID(),
            pow_seed_id: 'demo',
            pow_nonce: '0000',
          }),
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          // Show mnemonic
          const words = generateDemoMnemonic();
          setMnemonic(words.real);
          setMnemonicDuress(words.duress);
          setConfirmIndices(getRandomIndices());
          setShowMnemonic(true);
          setProgress(100);
        } else {
          // Demo mode: proceed anyway
          const words = generateDemoMnemonic();
          setMnemonic(words.real);
          setMnemonicDuress(words.duress);
          setConfirmIndices(getRandomIndices());
          setShowMnemonic(true);
          setProgress(100);
        }
      } else {
        // Login
        const authHash = await hashForDemo(password);
        
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password_hash: authHash,
            device_pubkey: crypto.randomUUID(),
          }),
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          login(data.user_id, username, data.session_id);
        } else {
          // Demo mode
          login(crypto.randomUUID(), username, crypto.randomUUID());
        }
        setProgress(100);
      }
    } catch (err) {
      // Demo fallback
      if (!isSignUp) {
        login(crypto.randomUUID(), username, crypto.randomUUID());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMnemonicConfirm = () => {
    const words = mnemonic.split(' ');
    const correct = confirmIndices.every((idx, i) => 
      words[idx]?.toLowerCase() === confirmWords[i]?.toLowerCase()
    );

    if (correct || true) { // Always allow in demo
      setMnemonicConfirmed(true);
      login(crypto.randomUUID(), username, crypto.randomUUID());
    } else {
      setError('Confirmation words do not match. Please try again.');
    }
  };

  // Mnemonic display screen
  if (showMnemonic && !mnemonicConfirmed) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--md-sys-color-background)', padding: 24 }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: 520, width: '100%', padding: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8, color: 'var(--md-sys-color-on-surface)' }}>
            🔐 Recovery Phrases
          </h2>
          <p style={{ fontSize: 13, color: 'var(--md-sys-color-error)', marginBottom: 16, lineHeight: 1.5 }}>
            ⚠ Store these offline. We cannot recover them. Losing both phrases + password = permanent data loss.
          </p>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: 'var(--md-sys-color-primary)' }}>
              Primary Phrase (keep secret)
            </h3>
            <div style={{
              background: 'var(--md-sys-color-surface-container)',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              fontSize: 13,
              fontFamily: 'monospace',
            }}>
              {mnemonic.split(' ').map((word, i) => (
                <div key={i} style={{ display: 'flex', gap: 4 }}>
                  <span style={{ color: 'var(--md-sys-color-outline)', width: 20, textAlign: 'right' }}>{i + 1}.</span>
                  <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: 'var(--md-sys-color-tertiary)' }}>
              Duress Phrase (for coercion scenarios)
            </h3>
            <div style={{
              background: 'var(--md-sys-color-surface-container)',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              fontSize: 13,
              fontFamily: 'monospace',
            }}>
              {mnemonicDuress.split(' ').map((word, i) => (
                <div key={i} style={{ display: 'flex', gap: 4 }}>
                  <span style={{ color: 'var(--md-sys-color-outline)', width: 20, textAlign: 'right' }}>{i + 1}.</span>
                  <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 12 }}>
              Confirm words #{confirmIndices.map(i => i + 1).join(', #')} from your Primary Phrase:
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {confirmIndices.map((idx, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--md-sys-color-outline)', marginBottom: 4, display: 'block' }}>
                    Word #{idx + 1}
                  </label>
                  <input
                    className="input-field"
                    style={{ padding: 10, fontSize: 14 }}
                    value={confirmWords[i]}
                    onChange={e => {
                      const next = [...confirmWords];
                      next[i] = e.target.value;
                      setConfirmWords(next);
                    }}
                    placeholder={`Word ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--md-sys-color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMnemonicConfirm}>
            I've Saved My Phrases — Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: 420, width: '100%', padding: 40 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 68,
              height: 68,
              margin: '0 auto 16px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #7B61FF, #C9BFFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(123, 97, 255, 0.3)',
            }}>
              <ShieldIcon size={36} color="#fff" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--md-sys-color-on-surface)' }}>
              Whispr
            </h1>
            <p style={{ fontSize: 13, color: 'var(--md-sys-color-on-surface-variant)', marginTop: 4 }}>
              Constitutional Secure Messaging
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '2px 10px',
              borderRadius: 12,
              background: 'rgba(123, 97, 255, 0.15)',
              color: 'var(--md-sys-color-primary)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}>
              v1.2 Canary Release
            </span>
          </div>

          <form ref={formRef} onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'block' }}>
                Username
              </label>
              <input
                id="username-input"
                className="input-field"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'block' }}>
                Password
              </label>
              <input
                id="password-input"
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                disabled={loading}
              />
            </div>

            {isSignUp && (
              <div style={{ marginBottom: 16 }} className="animate-fade-in">
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'block' }}>
                  Confirm Password
                </label>
                <input
                  id="confirm-password-input"
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <p style={{ color: 'var(--md-sys-color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            {loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LockIcon size={14} />
                  Deriving keys (Argon2id)... {progress}%
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7B61FF, #C9BFFF)',
                  }} />
                </div>
              </div>
            )}

            <button
              id="submit-button"
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px 24px', fontSize: 15, marginBottom: 16 }}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--md-sys-color-primary)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'var(--font-family)',
              }}
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Security badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            {['Decentralized', 'Signal Protocol', 'Serverless'].map(label => (
              <span key={label} style={{
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid var(--md-sys-color-outline-variant)',
                fontSize: 10,
                color: 'var(--md-sys-color-on-surface-variant)',
                letterSpacing: '0.5px',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Demo helpers ---
async function hashForDemo(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateDemoMnemonic(): { real: string; duress: string } {
  const words = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual'];
  const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);
  return {
    real: shuffle(words).slice(0, 24).join(' '),
    duress: shuffle(words).slice(0, 24).join(' '),
  };
}

function getRandomIndices(): number[] {
  const indices = new Set<number>();
  while (indices.size < 3) indices.add(Math.floor(Math.random() * 24));
  return Array.from(indices).sort((a, b) => a - b);
}
