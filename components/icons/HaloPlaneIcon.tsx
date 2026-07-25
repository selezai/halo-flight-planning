import { cn } from '@/lib/utils';

export default function HaloPlaneIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      <circle
        cx="22"
        cy="22"
        r="18.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeDasharray="18 8"
        opacity="0.48"
      />
      <path
        d="M22 5 30.1 37.2 22 31.6 13.9 37.2 22 5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
      <path
        d="M22 9.6 25.4 29.2 22 27 18.6 29.2 22 9.6Z"
        fill="#67e8f9"
        opacity="0.9"
      />
    </svg>
  );
}
