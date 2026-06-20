interface T6XLogoProps {
  size?: number;
  className?: string;
}

export function T6XLogo({ size = 48, className = "" }: T6XLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* T */}
      <text
        x="4"
        y="72"
        fontSize="72"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        fill="white"
        letterSpacing="-2"
      >
        T
      </text>
      {/* Custom 6 that looks like S */}
      <path
        d="M46 18 C46 18 68 18 72 28 C76 38 66 44 56 44 C46 44 38 50 38 60 C38 72 50 80 62 78 C74 76 78 68 78 60"
        stroke="#00FF85"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* X */}
      <text
        x="76"
        y="72"
        fontSize="52"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        fill="white"
        letterSpacing="-2"
      >
        X
      </text>
    </svg>
  );
}

export function T6XLogoText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <span className="text-white font-black text-2xl tracking-tight">T</span>
      <svg
        width="18"
        height="28"
        viewBox="0 0 36 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 6 C8 6 28 6 30 16 C32 26 22 30 14 30 C6 30 2 36 4 44 C6 52 16 56 24 54 C32 52 34 44 34 40"
          stroke="#00FF85"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-white font-black text-2xl tracking-tight">X</span>
    </div>
  );
}
