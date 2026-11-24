import type { Car } from '../types/database';

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
};

export function getCurrencySymbol(currency?: string | null): string {
  const code = (currency || 'NGN').toUpperCase().trim();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function formatPrice(price: number | null | undefined, currency?: string | null): string {
  const numeric = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numeric);
  return `${getCurrencySymbol(currency)}${formatted}`;
}

export function formatMileage(mileage: number | null | undefined): string {
  const numeric = typeof mileage === 'number' && Number.isFinite(mileage) ? mileage : 0;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)} km`;
}

export function formatSpeed(topSpeedKph: number | null | undefined): string {
  const numeric = typeof topSpeedKph === 'number' && Number.isFinite(topSpeedKph) ? topSpeedKph : 0;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)} km/h`;
}

export function sanitizePhoneDigits(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

export function buildWhatsAppCarMessage(
  car: Pick<Car, 'year' | 'make' | 'model' | 'price' | 'currency'>,
  carUrl: string
): string {
  const priceText = formatPrice(car.price, car.currency);
  return `Hello Platinum EV Global, I'm interested in the ${car.year} ${car.make} ${car.model} listed at ${priceText}. Is it still available?\n${carUrl}`;
}

export function buildWhatsAppCarUrl(
  whatsappNumber: string | null | undefined,
  car: Pick<Car, 'year' | 'make' | 'model' | 'price' | 'currency'>,
  carUrl: string
): string | null {
  const digits = sanitizePhoneDigits(whatsappNumber);
  if (!digits) return null;
  const message = buildWhatsAppCarMessage(car, carUrl);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppGeneralUrl(
  whatsappNumber: string | null | undefined,
  businessName?: string | null
): string | null {
  const digits = sanitizePhoneDigits(whatsappNumber);
  if (!digits) return null;
  const brand = businessName?.trim() || 'Platinum EV Global';
  const message = `Hello ${brand}, I would like to inquire about your electric vehicles.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildTikTokUrl(handle?: string | null): string | null {
  if (!handle) return null;
  const cleaned = handle.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleaned) return null;
  return `https://www.tiktok.com/@${cleaned}`;
}

export function formatTikTokHandle(handle?: string | null): string {
  if (!handle) return '';
  const cleaned = handle.trim().replace(/^@+/, '');
  return cleaned ? `@${cleaned}` : '';
}

export function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getCarPageUrl(carId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/cars/${carId}`;
  }
  return `/cars/${carId}`;
}
