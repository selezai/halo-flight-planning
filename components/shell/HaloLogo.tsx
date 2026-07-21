import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export default function HaloLogo({
  size = 'md',
  showWordmark = true,
  className,
}: {
  size?: keyof typeof SIZE_CLASSES;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 96 96"
        role="img"
        aria-label="Halo"
        className={cn('shrink-0 drop-shadow-[0_10px_24px_rgba(8,47,73,0.16)]', SIZE_CLASSES[size])}
      >
        <defs>
          <linearGradient id="halo-ring-gradient" x1="18" y1="14" x2="82" y2="84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5D58A" />
            <stop offset="0.48" stopColor="#E6B95D" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id="halo-arrow-gradient" x1="27" y1="65" x2="72" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F2742" />
            <stop offset="0.66" stopColor="#0369A1" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
          <filter id="halo-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.22 0 0 0 0 0.74 0 0 0 0 0.97 0 0 0 0.35 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="48" cy="48" r="43" fill="#FFF9EC" />
        <circle
          cx="48"
          cy="48"
          r="34"
          fill="none"
          stroke="url(#halo-ring-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="172 42"
          transform="rotate(-31 48 48)"
          filter="url(#halo-soft-glow)"
        />
        <path
          d="M24 62C35.5 42.5 48.5 34 68.5 31"
          fill="none"
          stroke="url(#halo-arrow-gradient)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M67 22.5 80.5 29.5 70.5 41"
          fill="none"
          stroke="#0F2742"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="62" r="4.5" fill="#0F2742" />
        <circle cx="48" cy="41" r="3.25" fill="#38BDF8" />
        <path
          d="M21 24 17 18M75 77l5 6M14 47H7M89 47h-7"
          stroke="#D6A84D"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.78"
        />
      </svg>
      {showWordmark && (
        <span className="leading-none">
          <span className="block text-base font-semibold tracking-[-0.03em] text-slate-950">Halo</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">
            Flight planning
          </span>
        </span>
      )}
    </div>
  );
}
