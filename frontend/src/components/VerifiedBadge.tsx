interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export function VerifiedBadge({ size = 14, className }: VerifiedBadgeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-label="Verified Space"
      role="img"
    >
      <path
        d="M12 2l2.4 2.1 3.1-.6 1 3 2.9 1.4-.6 3.1L22 14l-2.2 2.4.6 3.1-2.9 1.4-1 3-3.1-.6L12 26l-2.4-2.3-3.1.6-1-3-2.9-1.4.6-3.1L1 14l2.2-2.4-.6-3.1 2.9-1.4 1-3 3.1.6z"
        fill="#FF6B4A"
        transform="translate(0 -2) scale(0.92)"
      />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" stroke="#15130F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
