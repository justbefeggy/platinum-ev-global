export const LOGO_IMAGE_PATH =
  '/assets/aistudio/Platinum_EV_Global_Chrome_Emblem__2___1__9ab668c2.png';

interface BrandLogoProps {
  variant?: 'emblem' | 'full';
  businessName?: string | null;
  className?: string;
}

export function BrandLogo({
  variant = 'full',
  businessName,
  className = '',
}: BrandLogoProps) {
  const displayName = businessName?.trim() || 'Platinum EV Global';

  if (variant === 'emblem') {
    return (
      <span className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
        <img
          src={LOGO_IMAGE_PATH}
          alt=""
          aria-hidden="true"
          className="h-7 w-[76px] object-cover object-top select-none shrink-0"
          referrerPolicy="no-referrer"
        />
        <span className="text-xs sm:text-sm font-bold tracking-[0.14em] uppercase text-white whitespace-nowrap shrink-0">
          {displayName}
        </span>
      </span>
    );
  }

  return (
    <img
      src={LOGO_IMAGE_PATH}
      alt={displayName}
      className={`h-auto w-full max-w-[220px] object-contain select-none ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}
