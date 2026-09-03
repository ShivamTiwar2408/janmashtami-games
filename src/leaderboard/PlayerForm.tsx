import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PlayerForm.css';
import {
  Player,
  displayName,
  getRecentPlayers,
  normalizeName,
  normalizePhone,
  setCurrentPlayer,
} from './scoreStore';

/** Groups a 10-digit number as "98765 43210" while typing. */
export const formatPhone = (raw: string): string => {
  const d = normalizePhone(raw);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
};

const initials = (name: string): string =>
  normalizeName(name)
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '♥';

interface PlayerFormProps {
  /** `modal` floats over a game before it starts; `inline` sits in the result panel. */
  variant?: 'modal' | 'inline';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  submitLabel?: string;
  /** Called with a valid player. The form has already remembered them. */
  onSubmit: (player: Player) => void;
  /** Renders a dismiss affordance on the modal when provided. */
  onCancel?: () => void;
  greeting?: string;
}

const PlayerForm: React.FC<PlayerFormProps> = ({
  variant = 'inline',
  title,
  subtitle,
  submitLabel = 'Start Playing',
  onSubmit,
  onCancel,
  greeting = '🪈',
}) => {
  const uid = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<'name' | 'phone' | null>(null);
  const [recent, setRecent] = useState<Player[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  const digits = normalizePhone(phone);
  const nameOk = normalizeName(name).length > 0;
  const phoneOk = digits.length === 10;
  const canSubmit = nameOk && phoneOk;

  useEffect(() => {
    getRecentPlayers(4)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    // A kiosk gets a new person every turn; put the caret where they'll type.
    const t = setTimeout(() => nameRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, []);

  const commit = (player: Player) => {
    setCurrentPlayer(player);
    onSubmit(player);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk) {
      setError('name');
      nameRef.current?.focus();
      return;
    }
    if (!phoneOk) {
      setError('phone');
      return;
    }
    setError(null);
    commit({ name: name.trim(), phone: digits });
  };

  const body = (
    <div className={`pf-card pf-card-${variant}`}>
      {onCancel && (
        <button type="button" className="pf-close" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      )}

      <div className="pf-hero" aria-hidden="true">
        <span className="pf-hero-emoji">{greeting}</span>
        <span className="pf-hero-ring" />
      </div>

      <h2 className="pf-title" id={`${uid}-title`}>
        {title}
      </h2>
      {subtitle && <p className="pf-subtitle">{subtitle}</p>}

      {recent.length > 0 && (
        <div className="pf-recent">
          <span className="pf-recent-label">Played before? Tap your name</span>
          <div className="pf-chips">
            {recent.map((p) => (
              <button
                type="button"
                key={`${p.phone}-${p.name}`}
                className="pf-chip"
                onClick={() => commit(p)}
              >
                <span className="pf-chip-avatar">{initials(p.name)}</span>
                <span className="pf-chip-name">{displayName(p.name)}</span>
              </button>
            ))}
          </div>
          <div className="pf-or">
            <span />
            <em>or enter your details</em>
            <span />
          </div>
        </div>
      )}

      <form className="pf-form" onSubmit={handleSubmit} noValidate>
        <div className={`pf-field${error === 'name' ? ' pf-field-bad' : ''}`}>
          <input
            ref={nameRef}
            id={`${uid}-name`}
            className="pf-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error === 'name') setError(null);
            }}
            placeholder=" "
            autoComplete="name"
            aria-invalid={error === 'name'}
            aria-describedby={error === 'name' ? `${uid}-err` : undefined}
          />
          <label className="pf-label" htmlFor={`${uid}-name`}>
            Your name
          </label>
          {nameOk && (
            <span className="pf-tick" aria-hidden="true">
              ✓
            </span>
          )}
        </div>

        <div className={`pf-field${error === 'phone' ? ' pf-field-bad' : ''}`}>
          <input
            id={`${uid}-phone`}
            className="pf-input pf-input-phone"
            type="tel"
            value={formatPhone(phone)}
            onChange={(e) => {
              setPhone(e.target.value);
              if (error === 'phone') setError(null);
            }}
            placeholder=" "
            inputMode="numeric"
            autoComplete="tel"
            aria-invalid={error === 'phone'}
            aria-describedby={error === 'phone' ? `${uid}-err` : undefined}
          />
          <label className="pf-label" htmlFor={`${uid}-phone`}>
            Phone number
          </label>
          {phoneOk && (
            <span className="pf-tick" aria-hidden="true">
              ✓
            </span>
          )}
          {/* Only once they've started — "0/10" on an untouched field is noise. */}
          {!phoneOk && digits.length > 0 && (
            <span className="pf-count" aria-hidden="true">
              {digits.length}/10
            </span>
          )}
        </div>

        <p className="pf-error" id={`${uid}-err`} role="alert">
          {error === 'name' && 'Just your first name is fine 🙂'}
          {error === 'phone' && 'A 10-digit number, so we can tell players apart'}
        </p>

        <button type="submit" className="pf-submit" disabled={!canSubmit}>
          <span>{canSubmit ? submitLabel : 'Fill both to continue'}</span>
          {canSubmit && <span className="pf-submit-arrow">→</span>}
        </button>
      </form>

      <p className="pf-privacy">🔒 Stays on this device — nothing is ever uploaded</p>
    </div>
  );

  if (variant === 'inline') return body;

  /* Portalled for the same reason the result panel is: several games wrap their
     screens in `.wrapper * { padding: 0 }`, which flattens anything inside. */
  return createPortal(
    <div className="pf-overlay" role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
      {body}
    </div>,
    document.body
  );
};

export default PlayerForm;
