import { useEffect, useState } from 'react';
import { CarFront } from 'lucide-react';
import { isSafeHttpUrl } from '../lib/formatters';

interface CarImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function CarImage({ src, alt, className = '', eager = false }: CarImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const validSrc = isSafeHttpUrl(src) ? src!.trim() : null;

  if (!validSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F4F6F9] to-[#E3E7EE] text-[#1E1F22]/70 p-6 text-center select-none ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#1E1F22]/10 flex items-center justify-center mb-3">
          <CarFront className="w-7 h-7 text-[#1E1F22]/60" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-[#1E1F22]/65 max-w-[200px] truncate">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={validSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
