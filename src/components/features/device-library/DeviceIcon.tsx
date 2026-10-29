import type { DeviceType } from '@/types/network';

interface DeviceIconProps {
  type: DeviceType;
  size?: number;
  className?: string;
}

export function DeviceIcon({ type, size = 48, className = '' }: DeviceIconProps) {
  switch (type) {
    case 'pc':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Monitor Body */}
          <rect x="10" y="8" width="44" height="32" rx="3" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
          {/* Screen Inner */}
          <rect x="13" y="11" width="38" height="26" rx="1.5" fill="#0d1117" />
          {/* Display Content Simulation */}
          <path d="M16 16H28M16 20H24M16 24H32" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="45" cy="18" r="2.5" fill="#3fb950" />
          {/* Stand */}
          <path d="M30 40H34V48H30V40Z" fill="#30363d" />
          <rect x="22" y="48" width="20" height="4" rx="2" fill="#21262d" stroke="#30363d" strokeWidth="1.5" />
          {/* Mini Power LED */}
          <circle cx="32" cy="37" r="1" fill="#3fb950" />
        </svg>
      );

    case 'laptop':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Display Lid */}
          <rect x="14" y="12" width="36" height="26" rx="2.5" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
          {/* Screen */}
          <rect x="17" y="15" width="30" height="20" rx="1" fill="#0d1117" />
          <path d="M20 20H28M20 24H36M20 28H26" stroke="#388bfd" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="41" cy="21" r="1.5" fill="#3fb950" />
          {/* Base */}
          <path d="M8 40H56L51 48H13L8 40Z" fill="#21262d" stroke="#30363d" strokeWidth="1.5" />
          {/* Trackpad */}
          <rect x="27" y="43" width="10" height="3" rx="0.5" fill="#161b22" />
        </svg>
      );

    case 'server':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* 1U Chassis 1 */}
          <rect x="8" y="12" width="48" height="11" rx="2" fill="#1c2128" stroke="#30363d" strokeWidth="1.5" />
          {/* Drive Trays */}
          <rect x="12" y="15" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="20" y="15" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="28" y="15" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          {/* Server LEDs */}
          <circle cx="46" cy="17.5" r="1.5" fill="#3fb950" />
          <circle cx="50" cy="17.5" r="1.5" fill="#58a6ff" />

          {/* 1U Chassis 2 */}
          <rect x="8" y="26" width="48" height="11" rx="2" fill="#1c2128" stroke="#30363d" strokeWidth="1.5" />
          <rect x="12" y="29" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="20" y="29" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="28" y="29" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <circle cx="46" cy="31.5" r="1.5" fill="#3fb950" />
          <circle cx="50" cy="31.5" r="1.5" fill="#d29922" />

          {/* 1U Chassis 3 */}
          <rect x="8" y="40" width="48" height="11" rx="2" fill="#1c2128" stroke="#30363d" strokeWidth="1.5" />
          <rect x="12" y="43" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="20" y="43" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <rect x="28" y="43" width="6" height="5" rx="0.5" fill="#0d1117" stroke="#21262d" />
          <circle cx="46" cy="45.5" r="1.5" fill="#3fb950" />
          <circle cx="50" cy="45.5" r="1.5" fill="#3fb950" />
        </svg>
      );

    case 'router':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Main Router Disk/Chassis */}
          <rect x="8" y="20" width="48" height="24" rx="4" fill="#161b22" stroke="#58a6ff" strokeWidth="1.8" />
          {/* Front Bezel Detail */}
          <rect x="12" y="24" width="40" height="16" rx="2" fill="#0d1117" stroke="#30363d" strokeWidth="1" />
          {/* Modular slots */}
          <rect x="15" y="28" width="10" height="8" rx="1" fill="#21262d" />
          <rect x="27" y="28" width="10" height="8" rx="1" fill="#21262d" />
          {/* WAN/LAN LEDs */}
          <circle cx="43" cy="29" r="1.5" fill="#3fb950" />
          <circle cx="48" cy="29" r="1.5" fill="#58a6ff" />
          <circle cx="43" cy="35" r="1.5" fill="#3fb950" />
          <circle cx="48" cy="35" r="1.5" fill="#3fb950" />
          {/* Cross Routing Arrows Accent */}
          <path d="M22 14L32 8L42 14" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 8V18" stroke="#58a6ff" strokeWidth="1.8" />
          <path d="M22 50L32 56L42 50" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 46V56" stroke="#58a6ff" strokeWidth="1.8" />
        </svg>
      );

    case 'switch':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* 1U Switch Rack Body */}
          <rect x="6" y="20" width="52" height="24" rx="3" fill="#1c2128" stroke="#30363d" strokeWidth="1.8" />
          {/* Port Bay */}
          <rect x="10" y="24" width="44" height="16" rx="2" fill="#0d1117" />
          {/* 8 Ports Row 1 */}
          <rect x="13" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          <rect x="18" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          <rect x="23" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          <rect x="28" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          <rect x="33" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          <rect x="38" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" stroke="#30363d" strokeWidth="0.5" />
          {/* Uplink Ports */}
          <rect x="44" y="26" width="4" height="5" rx="0.5" fill="#1f6feb" />
          <rect x="49" y="26" width="4" height="5" rx="0.5" fill="#1f6feb" />
          {/* Port Activity LEDs */}
          <circle cx="14.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="19.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="24.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="29.5" cy="34" r="1" fill="#484f58" />
          <circle cx="34.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="39.5" cy="34" r="1" fill="#d29922" />
          {/* Switching arrows symbol */}
          <path d="M12 15H52M52 15L48 11M52 15L48 19" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M52 49H12M12 49L16 45M12 49L16 53" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'switch-l3':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Layer 3 Switch Body */}
          <rect x="6" y="20" width="52" height="24" rx="3" fill="#1c2128" stroke="#bc8cff" strokeWidth="1.8" />
          <rect x="10" y="24" width="44" height="16" rx="2" fill="#0d1117" />
          <rect x="13" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="18" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="23" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="28" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="33" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="38" y="26" width="3.5" height="4" rx="0.5" fill="#21262d" />
          <rect x="44" y="26" width="4" height="5" rx="0.5" fill="#bc8cff" />
          <rect x="49" y="26" width="4" height="5" rx="0.5" fill="#bc8cff" />
          <circle cx="14.5" cy="34" r="1" fill="#bc8cff" />
          <circle cx="19.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="24.5" cy="34" r="1" fill="#3fb950" />
          <circle cx="29.5" cy="34" r="1" fill="#3fb950" />
          {/* L3 Badge */}
          <text x="32" y="15" fill="#bc8cff" fontSize="9" fontWeight="bold" textAnchor="middle">L3 ROUTING</text>
        </svg>
      );

    case 'firewall':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Chassis */}
          <rect x="8" y="20" width="48" height="24" rx="3" fill="#1c2128" stroke="#d29922" strokeWidth="1.8" />
          <rect x="12" y="24" width="40" height="16" rx="2" fill="#0d1117" />
          {/* Shield Emblem */}
          <path d="M22 10C22 10 32 6 32 6C32 6 42 10 42 10V22C42 30 32 38 32 38C32 38 22 30 22 22V10Z" fill="#da3633" stroke="#f85149" strokeWidth="1.5" />
          <path d="M32 12V32" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          {/* Ports */}
          <rect x="16" y="32" width="4" height="4" rx="0.5" fill="#30363d" />
          <rect x="22" y="32" width="4" height="4" rx="0.5" fill="#30363d" />
          <rect x="40" y="32" width="4" height="4" rx="0.5" fill="#d29922" />
          <rect x="46" y="32" width="4" height="4" rx="0.5" fill="#d29922" />
        </svg>
      );

    case 'access-point':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Dome Body */}
          <circle cx="32" cy="32" r="20" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
          <circle cx="32" cy="32" r="14" fill="#161b22" stroke="#21262d" strokeWidth="1.5" />
          {/* Center LED Halo Ring */}
          <circle cx="32" cy="32" r="6" fill="#0d1117" stroke="#39d0d8" strokeWidth="2" />
          <circle cx="32" cy="32" r="2" fill="#39d0d8" />
          {/* Wave Radiation Rings */}
          <path d="M16 16C25 7 39 7 48 16" stroke="#39d0d8" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
          <path d="M12 12C23 1 41 1 52 12" stroke="#39d0d8" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
        </svg>
      );

    case 'cloud':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path
            d="M48 44H18C12.477 44 8 39.523 8 34C8 28.846 11.892 24.597 16.923 24.062C18.665 17.158 24.966 12 32.5 12C41.365 12 48.653 18.729 49.882 27.351C53.882 28.539 56.5 32.222 56.5 36.5C56.5 40.642 53.142 44 49 44H48Z"
            fill="#161b22"
            stroke="#58a6ff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Mesh connection paths inside */}
          <circle cx="24" cy="32" r="2" fill="#58a6ff" />
          <circle cx="36" cy="24" r="2" fill="#58a6ff" />
          <circle cx="44" cy="34" r="2" fill="#58a6ff" />
          <path d="M24 32L36 24L44 34" stroke="#58a6ff" strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );

    case 'packet-generator':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="10" y="14" width="44" height="36" rx="4" fill="#1c2128" stroke="#39d0d8" strokeWidth="2" />
          <rect x="14" y="18" width="36" height="20" rx="2" fill="#0d1117" />
          {/* Waveform signal */}
          <path d="M16 28H22L25 20L29 36L33 24L36 31H46" stroke="#39d0d8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="44" r="2" fill="#3fb950" />
          <circle cx="28" cy="44" r="2" fill="#58a6ff" />
          <circle cx="36" cy="44" r="2" fill="#d29922" />
        </svg>
      );

    case 'printer':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="16" y="12" width="32" height="14" rx="2" fill="#21262d" stroke="#30363d" strokeWidth="1.5" />
          <rect x="10" y="22" width="44" height="24" rx="3" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
          <rect x="16" y="38" width="32" height="14" rx="1.5" fill="#e6edf3" />
          <line x1="20" y1="42" x2="36" y2="42" stroke="#0d1117" strokeWidth="1.2" />
          <line x1="20" y1="46" x2="44" y2="46" stroke="#0d1117" strokeWidth="1.2" />
          <circle cx="48" cy="28" r="1.5" fill="#3fb950" />
        </svg>
      );

    case 'wireless-client':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="18" y="10" width="28" height="44" rx="4" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
          <rect x="21" y="15" width="22" height="32" rx="1.5" fill="#0d1117" />
          <circle cx="32" cy="50" r="1.5" fill="#484f58" />
          <path d="M24 24C28 20 36 20 40 24" stroke="#39d0d8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="12" y="16" width="40" height="32" rx="3" fill="#1c2128" stroke="#30363d" strokeWidth="2" />
        </svg>
      );
  }
}

