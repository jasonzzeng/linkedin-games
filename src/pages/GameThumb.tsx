import type { GameMeta } from '../lib/games';

/**
 * A small static illustration of each board, drawn with the same tokens the
 * real games use so the hub previews stay honest when the palette changes.
 */
export function GameThumb({ id }: { id: GameMeta['id'] }) {
  const frame = 'size-full';

  if (id === 'tango') {
    const cells = [1, 2, 0, 1, 2, 1, 2, 0, 0, 2, 1, 2, 1, 0, 2, 1];
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {cells.map((value, index) => {
          const x = (index % 4) * 16 + 1;
          const y = Math.floor(index / 4) * 16 + 1;
          return (
            <g key={index}>
              <rect x={x} y={y} width="14" height="14" rx="3" fill="var(--surface-sunken)" />
              {value === 1 && <circle cx={x + 7} cy={y + 7} r="4" fill="var(--accent-tango)" />}
              {value === 2 && (
                <path
                  d={`M${x + 10} ${y + 3.5}a4.5 4.5 0 1 0 0 7 3.4 3.4 0 1 1 0-7z`}
                  fill="var(--ink-faint)"
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  if (id === 'zip') {
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {Array.from({ length: 16 }).map((_, index) => (
          <rect
            key={index}
            x={(index % 4) * 16 + 1}
            y={Math.floor(index / 4) * 16 + 1}
            width="14"
            height="14"
            rx="3"
            fill="var(--surface-sunken)"
          />
        ))}
        <polyline
          points="8,8 24,8 24,24 8,24 8,40 24,40 40,40 40,24 40,8 56,8 56,24 56,40 56,56 40,56 24,56 8,56"
          fill="none"
          stroke="var(--accent-zip)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <circle cx="8" cy="8" r="4.5" fill="var(--surface)" stroke="var(--accent-zip)" strokeWidth="2" />
        <circle cx="8" cy="56" r="4.5" fill="var(--surface)" stroke="var(--accent-zip)" strokeWidth="2" />
      </svg>
    );
  }

  if (id === 'crossclimb') {
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {[0, 1, 2, 3, 4].map((row) => (
          <rect
            key={row}
            x={row === 0 || row === 4 ? 10 : 4}
            y={row * 13 + 1}
            width={row === 0 || row === 4 ? 44 : 56}
            height="10"
            rx="3"
            fill={row === 0 || row === 4 ? 'var(--surface-sunken)' : 'var(--accent-crossclimb)'}
            opacity={row === 0 || row === 4 ? 1 : 0.22 + row * 0.2}
          />
        ))}
        <rect x="4" y="27" width="56" height="10" rx="3" fill="var(--accent-crossclimb)" />
      </svg>
    );
  }

  if (id === 'queens') {
    const regions = [0, 0, 1, 1, 2, 3, 1, 1, 4, 3, 3, 4, 5, 5, 5, 4];
    const palette = [
      'var(--swatch-1)', 'var(--swatch-2)', 'var(--swatch-3)',
      'var(--swatch-4)', 'var(--swatch-6)', 'var(--swatch-8)',
    ];
    const crowns = [1, 7, 8, 14];
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {regions.map((region, index) => {
          const x = (index % 4) * 16;
          const y = Math.floor(index / 4) * 16;
          return (
            <g key={index}>
              <rect x={x} y={y} width="16" height="16" fill={palette[region]} />
              {crowns.includes(index) && (
                <path
                  d={`M${x + 4.5} ${y + 10.5}l-1-5 3 2 2.5-3.5 2.5 3.5 3-2-1 5z`}
                  fill="var(--swatch-ink)"
                />
              )}
            </g>
          );
        })}
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="2" fill="none"
          stroke="var(--ink)" strokeOpacity="0.7" strokeWidth="1.5" />
      </svg>
    );
  }

  if (id === 'patches') {
    const patches = [
      { x: 0, y: 0, w: 1, h: 3, fill: 'var(--swatch-3)', label: '3' },
      { x: 1, y: 0, w: 3, h: 2, fill: 'var(--swatch-6)', label: '6' },
      { x: 1, y: 2, w: 2, h: 1, fill: 'var(--swatch-7)', label: '' },
      { x: 3, y: 2, w: 1, h: 2, fill: 'var(--swatch-4)', label: '' },
      { x: 0, y: 3, w: 3, h: 1, fill: 'var(--swatch-2)', label: '3' },
    ];
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {patches.map((patch, index) => (
          <g key={index}>
            <rect
              x={patch.x * 16 + 1.5}
              y={patch.y * 16 + 1.5}
              width={patch.w * 16 - 3}
              height={patch.h * 16 - 3}
              rx="3"
              fill={patch.fill}
            />
            {patch.label && (
              <text
                x={patch.x * 16 + (patch.w * 16) / 2}
                y={patch.y * 16 + (patch.h * 16) / 2 + 3.5}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="var(--swatch-ink)"
                fontFamily="var(--font-sans)"
              >
                {patch.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  }

  if (id === 'pinpoint') {
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {[0, 1, 2, 3, 4].map((row) => (
          <rect
            key={row}
            x="2"
            y={row * 12.4 + 2}
            width="60"
            height="10.4"
            rx="2.5"
            fill="var(--accent-pinpoint)"
            opacity={0.25 + row * 0.16}
          />
        ))}
      </svg>
    );
  }

  if (id === 'wend') {
    const letters = ['W', 'E', 'N', 'D'];
    return (
      <svg viewBox="0 0 64 64" className={frame} role="presentation">
        {Array.from({ length: 16 }).map((_, index) => {
          const x = (index % 4) * 16 + 1;
          const y = Math.floor(index / 4) * 16 + 1;
          const onPath = [0, 1, 5, 9, 10, 14].includes(index);
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width="14"
              height="14"
              rx="3"
              fill={onPath ? 'var(--accent-wend)' : 'var(--surface-sunken)'}
              opacity={onPath ? 0.85 : 1}
            />
          );
        })}
        {[0, 1, 5, 9].map((index, i) => (
          <text
            key={index}
            x={(index % 4) * 16 + 8}
            y={Math.floor(index / 4) * 16 + 12.5}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="var(--swatch-ink)"
            fontFamily="var(--font-sans)"
          >
            {letters[i]}
          </text>
        ))}
      </svg>
    );
  }

  // sudoku
  const digits = [1, 4, 0, 0, 5, 3, 0, 6, 5, 2, 0, 0, 3, 0, 2, 6, 0, 4];
  return (
    <svg viewBox="0 0 64 64" className={frame} role="presentation">
      {digits.map((value, index) => {
        const x = (index % 6) * 10.6 + 0.5;
        const y = Math.floor(index / 6) * 10.6 + 16;
        return (
          <g key={index}>
            <rect x={x} y={y} width="9.6" height="9.6" rx="2" fill="var(--surface-sunken)" />
            {value > 0 && (
              <text
                x={x + 4.8}
                y={y + 7.2}
                textAnchor="middle"
                fontSize="7"
                fontWeight="700"
                fill="var(--accent-sudoku)"
                fontFamily="var(--font-sans)"
              >
                {value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
