import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 20, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const display = readOnly ? value : (hover || value);

  return (
    <div
      style={{ display: 'inline-flex', gap: 2 }}
      role={readOnly ? undefined : 'radiogroup'}
      aria-label={readOnly ? `${value} out of 5 stars` : 'Rate this session out of 5 stars'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: readOnly ? 'default' : 'pointer',
            lineHeight: 0,
          }}
          aria-label={readOnly ? undefined : `${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            fill={n <= display ? '#F5B942' : 'none'}
            color={n <= display ? '#F5B942' : 'var(--color-border)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
