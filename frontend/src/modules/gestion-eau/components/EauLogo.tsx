/**
 * EauLogo — AHUVI Eau module logo, rendered inline as SVG.
 * Inline (not <img src>) so it stays crisp, needs no network request and is
 * immune to Service Worker caching. The gradient id is stable and unique to
 * avoid collisions if the logo is mounted more than once.
 */
interface EauLogoProps {
  className?: string;
}

const EauLogo = ({ className }: EauLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    width="100%"
    height="100%"
    role="img"
    aria-label="AHUVI Eau"
    className={className}
  >
    <title>AHUVI Eau</title>
    <defs>
      <linearGradient id="ahuviDropGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d8fad" />
        <stop offset="1" stopColor="#0f6f8c" />
      </linearGradient>
    </defs>
    <rect x="24" y="24" width="464" height="464" rx="96" fill="#262626" />
    <path
      d="M 145 350 A 158 158 0 1 1 367 350"
      fill="none"
      stroke="#1fc3e0"
      strokeWidth="15"
      strokeLinecap="round"
    />
    <circle cx="256" cy="100" r="11" fill="#1fc3e0" />
    <path
      d="M 256 150 C 256 210 340 252 340 320 A 84 84 0 1 1 172 320 C 172 252 256 210 256 150 Z"
      fill="url(#ahuviDropGrad)"
    />
    <text
      x="256"
      y="378"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="150"
      fontWeight="700"
      fill="#ffffff"
    >
      A
    </text>
  </svg>
);

export default EauLogo;
