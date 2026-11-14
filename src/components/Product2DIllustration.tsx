import React, { useState } from 'react';
import { ApplianceCategoryId } from '../data/homeGuideData';
import { DeviceCategory } from '../types/hardware';

export interface Product2DIllustrationProps {
  kind: 'tech' | 'appliance';
  deviceCategory?: DeviceCategory;
  applianceCategory?: ApplianceCategoryId;
  brand: string;
  name: string;
  primaryHex?: string;
  accentHex?: string;
  screenBadge?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Resolves a real high-resolution product photograph URL for each device & home appliance
 */
function resolveRealProductPhotoUrl(
  kind: 'tech' | 'appliance',
  name: string,
  brand: string,
  deviceCategory?: DeviceCategory,
  applianceCategory?: ApplianceCategoryId
): string {
  const n = name.toLowerCase();
  const b = brand.toLowerCase();

  if (kind === 'appliance') {
    switch (applianceCategory) {
      case 'refrigerator':
        if (b.includes('lg')) {
          return 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=800&q=85';
        }
        if (b.includes('bosch')) {
          return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=85';
        }
        return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=85';
      case 'gas_stove':
        return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=85';
      case 'microwave':
        return 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=800&q=85';
      case 'washing_machine':
        return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=85';
      case 'dryer':
        return 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=800&q=85';
      case 'laptop':
        return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=85';
    }
  }

  // Tech devices: Phones, Foldables, Laptops, Tablets, Chips
  if (deviceCategory === 'chip' || n.includes('m4')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=85';
  }
  if (deviceCategory === 'laptop' || n.includes('macbook') || n.includes('book') || n.includes('proart')) {
    if (b.includes('apple') || n.includes('macbook')) {
      return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=85';
    }
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=85';
  }
  if (n.includes('tab') || n.includes('matepad') || n.includes('ipad')) {
    return 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=85';
  }
  if (deviceCategory === 'foldable' || n.includes('fold') || n.includes('xt')) {
    return 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=85';
  }
  if (b.includes('apple') || n.includes('iphone')) {
    return 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=85';
  }
  if (b.includes('samsung') || n.includes('galaxy')) {
    return 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=85';
  }
  if (b.includes('huawei') || n.includes('pura') || n.includes('mate')) {
    return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=85';
  }
  return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=85';
}

export const Product2DIllustration: React.FC<Product2DIllustrationProps> = ({
  kind,
  deviceCategory,
  applianceCategory,
  brand,
  name,
  primaryHex = '#2A2D35',
  accentHex = '#E5A952',
  screenBadge,
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl = resolveRealProductPhotoUrl(
    kind,
    name,
    brand,
    deviceCategory,
    applianceCategory
  );
  const heightClass =
    size === 'sm' ? 'h-24 w-24' : size === 'lg' ? 'h-56 w-full' : 'h-32 w-32';

  const renderVectorDevice = () => {
    if (kind === 'appliance') {
      switch (applianceCategory) {
        case 'refrigerator':
          return (
            <svg viewBox="0 0 160 200" className="w-full h-full max-h-48">
              <defs>
                <linearGradient id="fridgeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3f4450" />
                  <stop offset="50%" stopColor="#232730" />
                  <stop offset="100%" stopColor="#14171d" />
                </linearGradient>
              </defs>
              {/* Shadow */}
              <ellipse cx="80" cy="186" rx="46" ry="6" fill="rgba(0,0,0,0.45)" />
              {/* Main Cabinet */}
              <rect
                x="38"
                y="16"
                width="84"
                height="166"
                rx="8"
                fill="url(#fridgeGrad)"
                stroke={accentHex}
                strokeWidth="1.8"
              />
              {/* French Door Split */}
              <line x1="80" y1="18" x2="80" y2="112" stroke="#0d0f13" strokeWidth="2.2" />
              {/* Freezer Drawer Split */}
              <line x1="40" y1="112" x2="120" y2="112" stroke="#0d0f13" strokeWidth="2.5" />
              <line x1="40" y1="146" x2="120" y2="146" stroke="#0d0f13" strokeWidth="2" />
              {/* InstaView / LED Dispenser Window */}
              <rect
                x="86"
                y="32"
                width="26"
                height="52"
                rx="4"
                fill="#0b1320"
                stroke={accentHex}
                strokeWidth="1.2"
              />
              <text
                x="99"
                y="54"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                -18°C
              </text>
              <text
                x="99"
                y="67"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="8"
                fontFamily="monospace"
              >
                3°C
              </text>
              {/* Handles */}
              <rect x="73" y="36" width="3" height="58" rx="1.5" fill={accentHex} />
              <rect x="84" y="36" width="3" height="58" rx="1.5" fill={accentHex} />
              <rect x="52" y="120" width="56" height="3" rx="1.5" fill={accentHex} />
              <rect x="52" y="154" width="56" height="3" rx="1.5" fill={accentHex} />
            </svg>
          );

        case 'gas_stove':
          return (
            <svg viewBox="0 0 160 180" className="w-full h-full max-h-44">
              <ellipse cx="80" cy="166" rx="50" ry="6" fill="rgba(0,0,0,0.45)" />
              {/* Blue Burner Flames on Top */}
              <circle cx="56" cy="32" r="9" fill="rgba(56,189,248,0.35)" />
              <circle cx="104" cy="32" r="9" fill="rgba(249,115,22,0.4)" />
              {/* Cast Iron Grate */}
              <rect x="38" y="34" width="84" height="6" rx="2" fill="#18181b" />
              {/* Stove Body */}
              <rect
                x="34"
                y="40"
                width="92"
                height="122"
                rx="7"
                fill="#272a32"
                stroke={accentHex}
                strokeWidth="1.8"
              />
              {/* Control Knob Fascia */}
              <rect x="36" y="42" width="88" height="22" rx="4" fill="#14161b" />
              {[48, 64, 96, 112].map((cx) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy="53"
                  r="4.5"
                  fill="#27272a"
                  stroke={accentHex}
                  strokeWidth="1.4"
                />
              ))}
              <rect x="73" y="48" width="14" height="10" rx="2" fill="#090d14" />
              {/* Oven Door Window */}
              <rect
                x="44"
                y="72"
                width="72"
                height="68"
                rx="6"
                fill="#120d0a"
                stroke={accentHex}
                strokeWidth="1.4"
              />
              <rect
                x="52"
                y="82"
                width="56"
                height="46"
                rx="4"
                fill="rgba(251,146,60,0.22)"
              />
              {/* Oven Handle */}
              <rect x="48" y="68" width="64" height="3.5" rx="1.5" fill={accentHex} />
            </svg>
          );

        case 'microwave':
          return (
            <svg viewBox="0 0 180 140" className="w-full h-full max-h-40">
              <ellipse cx="90" cy="124" rx="64" ry="6" fill="rgba(0,0,0,0.42)" />
              <rect
                x="22"
                y="26"
                width="136"
                height="92"
                rx="9"
                fill="#242730"
                stroke={accentHex}
                strokeWidth="1.8"
              />
              {/* Cavity Window */}
              <rect
                x="32"
                y="36"
                width="86"
                height="72"
                rx="6"
                fill="#141210"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.2"
              />
              <ellipse
                cx="75"
                cy="92"
                rx="28"
                ry="6"
                fill="rgba(251,191,36,0.28)"
                stroke={accentHex}
                strokeWidth="1"
              />
              {/* Handle */}
              <rect x="112" y="42" width="3.5" height="60" rx="1.5" fill={accentHex} />
              {/* Right Digital Panel */}
              <rect x="124" y="36" width="26" height="72" rx="4" fill="#12141a" />
              <rect x="128" y="42" width="18" height="12" rx="2" fill="#062019" />
              <text
                x="137"
                y="51"
                textAnchor="middle"
                fill="#10b981"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
              >
                1000W
              </text>
              <circle
                cx="137"
                cy="88"
                r="7"
                fill="#1f242d"
                stroke={accentHex}
                strokeWidth="1.5"
              />
            </svg>
          );

        case 'washing_machine':
        case 'dryer':
          return (
            <svg viewBox="0 0 160 180" className="w-full h-full max-h-44">
              <ellipse cx="80" cy="166" rx="48" ry="6" fill="rgba(0,0,0,0.42)" />
              <rect
                x="34"
                y="20"
                width="92"
                height="142"
                rx="9"
                fill={applianceCategory === 'washing_machine' ? '#e2e8f0' : '#d6d3d1'}
                stroke={accentHex}
                strokeWidth="1.8"
              />
              {/* Top Fascia */}
              <rect x="36" y="22" width="88" height="24" rx="6" fill="#181b22" />
              <line x1="62" y1="24" x2="62" y2="44" stroke="#334155" strokeWidth="1.2" />
              <circle
                cx="80"
                cy="34"
                r="6.5"
                fill="#0f172a"
                stroke={accentHex}
                strokeWidth="1.6"
              />
              <rect x="94" y="28" width="24" height="12" rx="2" fill="#041e2b" />
              {/* Porthole Drum Door */}
              <circle
                cx="80"
                cy="102"
                r="34"
                fill="#111827"
                stroke="#1e293b"
                strokeWidth="6"
              />
              <circle
                cx="80"
                cy="102"
                r="26"
                fill="#0b1324"
                stroke={accentHex}
                strokeWidth="1.5"
              />
              <path
                d="M 60 102 Q 72 90 80 102 T 100 102"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />
            </svg>
          );

        default:
          break;
      }
    }

    // Tech Devices: Phone, Foldable, Laptop/Tablet, Chip
    if (deviceCategory === 'laptop') {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full max-h-40">
          <ellipse cx="100" cy="124" rx="76" ry="6" fill="rgba(0,0,0,0.45)" />
          {/* Display Lid */}
          <rect
            x="38"
            y="20"
            width="124"
            height="82"
            rx="6"
            fill="#0d111a"
            stroke={primaryHex}
            strokeWidth="3"
          />
          <rect
            x="43"
            y="25"
            width="114"
            height="72"
            rx="3"
            fill="#131c2e"
            stroke={accentHex}
            strokeWidth="0.9"
          />
          <circle cx="100" cy="61" r="22" fill={accentHex} fillOpacity="0.18" />
          {/* Base Deck */}
          <path
            d="M 20 104 L 180 104 L 168 114 L 32 114 Z"
            fill={primaryHex}
            stroke={accentHex}
            strokeWidth="1.4"
          />
        </svg>
      );
    }

    if (deviceCategory === 'chip') {
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full max-h-40">
          <rect
            x="32"
            y="32"
            width="96"
            height="96"
            rx="10"
            fill="#14261c"
            stroke="#10b981"
            strokeWidth="2"
          />
          {/* Gold Contact Pins */}
          {[46, 62, 78, 94, 110].map((p) => (
            <React.Fragment key={p}>
              <rect x={p} y="24" width="4" height="6" fill="#fbbf24" />
              <rect x={p} y="130" width="4" height="6" fill="#fbbf24" />
              <rect x="24" y={p} width="6" height="4" fill="#fbbf24" />
              <rect x="130" y={p} width="6" height="4" fill="#fbbf24" />
            </React.Fragment>
          ))}
          {/* Heatspreader & Die */}
          <rect
            x="46"
            y="46"
            width="68"
            height="68"
            rx="6"
            fill="#18181b"
            stroke={accentHex}
            strokeWidth="1.8"
          />
          <text
            x="80"
            y="78"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="13"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            M4 MAX
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            fill={accentHex}
            fontSize="8"
            fontFamily="monospace"
          >
            3NM SILICON
          </text>
        </svg>
      );
    }

    if (deviceCategory === 'foldable') {
      return (
        <svg viewBox="0 0 180 160" className="w-full h-full max-h-44">
          <ellipse cx="90" cy="146" rx="54" ry="6" fill="rgba(0,0,0,0.45)" />
          {/* Left Panel */}
          <rect
            x="34"
            y="18"
            width="54"
            height="120"
            rx="8"
            fill={primaryHex}
            stroke={accentHex}
            strokeWidth="1.8"
          />
          {/* Right Panel */}
          <rect
            x="90"
            y="18"
            width="54"
            height="120"
            rx="8"
            fill="#111827"
            stroke={accentHex}
            strokeWidth="1.8"
          />
          {/* Hinge Spine */}
          <rect x="86" y="18" width="6" height="120" rx="2" fill={accentHex} />
          {/* Camera Island */}
          <rect
            x="42"
            y="26"
            width="22"
            height="42"
            rx="6"
            fill="#090b10"
            stroke={accentHex}
            strokeWidth="1.2"
          />
          <circle cx="53" cy="36" r="5" fill="#1e293b" stroke={accentHex} strokeWidth="1" />
          <circle cx="53" cy="50" r="5" fill="#1e293b" stroke={accentHex} strokeWidth="1" />
        </svg>
      );
    }

    // Standard Flagship Smartphone (Front + Back Duo View)
    return (
      <svg viewBox="0 0 160 170" className="w-full h-full max-h-44">
        <ellipse cx="80" cy="158" rx="46" ry="6" fill="rgba(0,0,0,0.45)" />
        {/* Back Body */}
        <rect
          x="34"
          y="22"
          width="58"
          height="122"
          rx="11"
          fill={primaryHex}
          stroke={accentHex}
          strokeWidth="1.8"
        />
        {/* Camera Bump */}
        <rect
          x="40"
          y="28"
          width="26"
          height="34"
          rx="6"
          fill="#111318"
          stroke={accentHex}
          strokeWidth="1.2"
        />
        <circle cx="48" cy="37" r="4.5" fill="#090d16" stroke={accentHex} strokeWidth="1" />
        <circle cx="48" cy="50" r="4.5" fill="#090d16" stroke={accentHex} strokeWidth="1" />
        <circle cx="59" cy="43" r="4" fill="#090d16" stroke={accentHex} strokeWidth="1" />

        {/* Front OLED Screen */}
        <rect
          x="68"
          y="16"
          width="58"
          height="122"
          rx="11"
          fill="#0b101b"
          stroke={accentHex}
          strokeWidth="1.8"
        />
        <rect
          x="72"
          y="20"
          width="50"
          height="114"
          rx="8"
          fill="#131c31"
        />
        <circle cx="97" cy="68" r="18" fill={accentHex} fillOpacity="0.22" />
        <rect x="89" y="24" width="16" height="4" rx="2" fill="#05070b" />
      </svg>
    );
  };

  return (
    <div
      className={`relative rounded-2xl border border-[var(--border-hairline)] bg-gradient-to-br from-[#14151c] via-[#0d0e12] to-[#17151a] flex flex-col items-center justify-center overflow-hidden shrink-0 ${heightClass}`}
      aria-label={`${brand} ${name}`}
    >
      {!imgFailed && photoUrl ? (
        <img
          src={photoUrl}
          alt={`${brand} ${name}`}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <div className="p-2.5 w-full h-full flex items-center justify-center">
          {renderVectorDevice()}
        </div>
      )}
      {screenBadge && size !== 'sm' && (
        <span className="absolute bottom-1.5 inset-x-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-[9px] font-mono-tech text-[#E5A952] uppercase tracking-wider truncate text-center">
          {screenBadge}
        </span>
      )}
    </div>
  );
};
