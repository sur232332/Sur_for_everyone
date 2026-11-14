import React from 'react';

interface BrandLogo3DProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 3D Visual Isometric Prism & Cube Brand Logo for the website header and 3D Showroom
 */
export const BrandLogo3D: React.FC<BrandLogo3DProps> = ({ onClick, size = 'md' }) => {
  const iconDim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 text-left shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] cursor-pointer select-none"
      aria-label="SUR 3D Flagship Showroom Home"
    >
      {/* 3D Layered Isometric Metallic & Gold Hyper-Cube Emblem */}
      <div
        className={`relative ${iconDim} rounded-xl bg-gradient-to-br from-[#1b191f] via-[#0e0d12] to-[#262018] border border-[#E5A952]/45 shadow-[0_6px_20px_rgba(229,169,82,0.22),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:border-[#E5A952]`}
      >
        {/* Subtle ambient glow behind 3D cube */}
        <div className="absolute -inset-1 bg-[radial-gradient(circle_at_30%_25%,rgba(229,169,82,0.35),transparent_65%)] pointer-events-none" />

        <svg
          viewBox="0 0 64 64"
          className="w-7 h-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:rotate-[8deg]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoTopFace" x1="12" y1="8" x2="52" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF3D1" />
              <stop offset="50%" stopColor="#E5A952" />
              <stop offset="100%" stopColor="#B87B28" />
            </linearGradient>
            <linearGradient id="logoLeftFace" x1="10" y1="20" x2="32" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D49A45" />
              <stop offset="100%" stopColor="#6E4715" />
            </linearGradient>
            <linearGradient id="logoRightFace" x1="32" y1="22" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B3F4C" />
              <stop offset="50%" stopColor="#1E222B" />
              <stop offset="100%" stopColor="#0E1015" />
            </linearGradient>
            <linearGradient id="logoInnerCore" x1="22" y1="18" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#E5A952" />
            </linearGradient>
          </defs>

          {/* Outer 3D Isometric Hexagonal Frame */}
          <polygon
            points="32,6 55,19 55,45 32,58 9,45 9,19"
            fill="rgba(229,169,82,0.06)"
            stroke="url(#logoTopFace)"
            strokeWidth="1.6"
          />

          {/* Top Diamond Face of 3D Cube */}
          <polygon
            points="32,11 50,21.5 32,32 14,21.5"
            fill="url(#logoTopFace)"
          />

          {/* Left Lit Face of 3D Cube */}
          <polygon
            points="14,21.5 32,32 32,52.5 14,42"
            fill="url(#logoLeftFace)"
          />

          {/* Right Dark Titanium Face of 3D Cube */}
          <polygon
            points="32,32 50,21.5 50,42 32,52.5"
            fill="url(#logoRightFace)"
          />

          {/* Floating Inner 3D Silicon Prism Core */}
          <polygon
            points="32,17 42,22.8 32,28.5 22,22.8"
            fill="#0B0C10"
            stroke="url(#logoInnerCore)"
            strokeWidth="1.2"
          />

          {/* Specular Edge Highlights */}
          <polyline
            points="14,21.5 32,32 50,21.5"
            stroke="#FFFDF9"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <line
            x1="32"
            y1="32"
            x2="32"
            y2="52.5"
            stroke="#FFE6B8"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Center Glowing Vertex Dot */}
          <circle cx="32" cy="32" r="2.2" fill="#FFF7E0" />
        </svg>
      </div>

      {/* 3D Studio Typography Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-[0.14em] text-sm sm:text-base uppercase bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-primary)] to-[#E5A952] bg-clip-text">
            SUR
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-[#E5A952]/15 border border-[#E5A952]/40 text-[#E5A952] font-mono-tech text-[10px] font-bold tracking-wider">
            3D
          </span>
          <span className="font-bold tracking-[0.12em] text-xs sm:text-sm uppercase text-[var(--accent)]">
            PULSE
          </span>
        </div>
        <span className="text-[9px] font-mono-tech uppercase tracking-[0.2em] text-[var(--text-secondary)] mt-0.5 hidden sm:block">
          Flagship 3D Store
        </span>
      </div>
    </button>
  );
};
