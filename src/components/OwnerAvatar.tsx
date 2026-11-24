import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { isSafeHttpUrl } from '../lib/formatters';

interface OwnerAvatarProps {
  src?: string | null;
  ownerName?: string | null;
  shape?: 'rounded' | 'round';
  className?: string;
  iconClassName?: string;
}

export function OwnerAvatar({
  src,
  ownerName,
  shape = 'rounded',
  className = 'w-20 h-20 sm:w-24 sm:h-24',
  iconClassName = 'w-10 h-10',
}: OwnerAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const validSrc = isSafeHttpUrl(src) ? src!.trim() : null;
  const radiusClass = shape === 'round' ? 'rounded-full' : 'rounded-[20px]';
  const altText = ownerName?.trim()
    ? `${ownerName.trim()} — Owner`
    : 'Owner portrait';

  if (!validSrc || failed) {
    return (
      <div
        role="img"
        aria-label={altText}
        className={`${className} ${radiusClass} bg-gradient-to-b from-[#C9CFD8] to-[#8C96A6] flex items-center justify-center shrink-0 overflow-hidden`}
      >
        <User className={`${iconClassName} text-[#05080F]/75`} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={`${className} ${radiusClass} bg-[#252628] border border-white/10 shrink-0 overflow-hidden`}
    >
      <img
        src={validSrc}
        alt={altText}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}
