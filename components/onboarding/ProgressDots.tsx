interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 h-2 bg-[#00FF85]"
              : i < current
              ? "w-2 h-2 bg-[#00FF85]/40"
              : "w-2 h-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}
