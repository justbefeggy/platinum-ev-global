import { useCallback, useEffect, useState, type TouchEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { CarWithImages } from '../types/database';
import { fetchPublishedCarById } from '../lib/carsApi';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSiteSettings } from '../context/SiteSettingsContext';
import {
  buildWhatsAppCarMessage,
  buildWhatsAppCarUrl,
  formatMileage,
  formatPrice,
  formatSpeed,
  getCarPageUrl,
} from '../lib/formatters';
import { CarImage } from '../components/CarImage';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

export function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSiteSettings();

  const [car, setCar] = useState<CarWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const loadCar = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublishedCarById(id);
      setCar(data);
      setActiveImageIndex(0);
    } catch {
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCar();
  }, [loadCar]);

  const images = car?.car_images ?? [];
  const activeImageUrl = images[activeImageIndex]?.image_url ?? null;

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.changedTouches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || images.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    if (delta > 40) {
      handlePrevImage();
    } else if (delta < -40) {
      handleNextImage();
    }
    setTouchStartX(null);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="bg-[#1E1F22] rounded-[28px] p-10 text-center border border-white/[0.06] space-y-3">
          <h1 className="text-xl font-bold text-white">Supabase Not Configured</h1>
          <p className="text-sm text-[#C9CFD8]">
            Configure <code className="text-[#EDA966]">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-[#EDA966]">VITE_SUPABASE_ANON_KEY</code> to view vehicle listings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-10 animate-pulse">
        <div className="h-4 w-48 bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 aspect-[16/10] rounded-[24px] bg-white/10" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-10 w-3/4 bg-white/10 rounded" />
            <div className="h-8 w-40 bg-white/10 rounded" />
            <div className="h-44 w-full bg-white/10 rounded-[24px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="bg-[#1E1F22] rounded-[28px] p-10 text-center border border-red-500/30 space-y-4">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadCar()}
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="bg-[#1E1F22] rounded-[28px] p-12 text-center border border-white/[0.06] space-y-4">
          <h1 className="font-ev-display text-2xl text-white">Vehicle Not Found</h1>
          <p className="text-sm text-[#C9CFD8]">
            This electric vehicle may have been removed or unpublished.
          </p>
          <Link
            to="/cars"
            className="inline-flex items-center justify-center min-h-[46px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const isSold = car.status === 'sold';
  const formattedPrice = formatPrice(car.price, car.currency);
  const carUrl = getCarPageUrl(car.id);
  const whatsappMessage = buildWhatsAppCarMessage(car, carUrl);
  const whatsappUrl = buildWhatsAppCarUrl(settings?.whatsapp_number, car, carUrl);

  return (
    <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 pb-28 md:pb-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-[#C9CFD8]/75">
        <Link to="/cars" className="hover:text-white transition-colors">
          Inventory
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-white font-medium truncate">
          {car.year} {car.make} {car.model}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Swipeable Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative aspect-[16/10] w-full rounded-[24px] bg-gradient-to-b from-white to-[#F2F4F8] overflow-hidden select-none"
          >
            <CarImage
              src={activeImageUrl}
              alt={`${car.year} ${car.make} ${car.model}`}
              eager
              className="w-full h-full object-cover"
            />

            <span
              className={`absolute top-4 left-4 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
                isSold
                  ? 'bg-[#05080F] text-[#EDA966] border border-[#EDA966]/40'
                  : 'bg-[#EDA966] text-[#05080F]'
              }`}
            >
              {isSold ? 'Sold' : 'Available'}
            </span>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous photo"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shadow-lg hover:bg-[#f2b87e] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next photo"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shadow-lg hover:bg-[#f2b87e] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {images.map((img, index) => {
                const isActive = index === activeImageIndex;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                    className={`aspect-[16/10] rounded-[14px] overflow-hidden bg-gradient-to-b from-white to-[#F2F4F8] border-2 transition-all ${
                      isActive
                        ? 'border-[#EDA966] ring-2 ring-[#EDA966]/40'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <CarImage
                      src={img.image_url}
                      alt={`${car.year} ${car.make} ${car.model} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Specs + Description + WhatsApp Inquiry */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <h1 className="font-ev-display text-2xl sm:text-3xl text-white leading-tight mb-2">
              {car.make} {car.model}
            </h1>
            <p className="font-ev-display text-2xl sm:text-3xl text-[#EDA966] tabular-nums">
              {formattedPrice}
            </p>
          </div>

          {/* Specs Table Card */}
          <div className="bg-[#1E1F22] rounded-[24px] p-5 sm:p-6 border border-white/[0.06]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Make</span>
                <span className="text-sm font-bold text-white">{car.make}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Model</span>
                <span className="text-sm font-bold text-white text-right">{car.model}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Year</span>
                <span className="text-sm font-bold text-white tabular-nums">{car.year}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Mileage</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatMileage(car.mileage)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Top speed</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatSpeed(car.top_speed_kph)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#C9CFD8]/75">Price</span>
                <span className="text-sm font-bold text-white tabular-nums">{formattedPrice}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {car.description && (
            <div className="bg-[#1E1F22] rounded-[24px] p-5 sm:p-6 border border-white/[0.06]">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#EDA966] mb-2">
                Overview
              </h2>
              <p className="text-sm text-[#C9CFD8] leading-relaxed whitespace-pre-line">
                {car.description}
              </p>
            </div>
          )}

          {/* Inquiry CTA or Sold State */}
          {isSold ? (
            <div className="bg-[#1E1F22] rounded-[24px] p-6 border border-[#EDA966]/30 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#EDA966] shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-white">This Vehicle Has Been Sold</h2>
                  <p className="text-xs text-[#C9CFD8]">
                    Explore other available electric vehicles in our inventory.
                  </p>
                </div>
              </div>
              <Link
                to="/cars"
                className="w-full inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-white text-[#05080F] text-sm font-bold hover:bg-[#C9CFD8] transition-colors"
              >
                Browse Available EVs
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-3 min-h-[54px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-base font-bold hover:bg-[#f2b87e] transition-colors"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>Inquire on WhatsApp</span>
                </a>
              ) : (
                <div className="rounded-[20px] bg-[#1E1F22] border border-white/10 p-4 text-sm text-[#C9CFD8]">
                  WhatsApp contact number is not configured yet. Check back soon or update it in
                  Site Settings.
                </div>
              )}

              {/* Message Preview Bubble matching PDF */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9CFD8]/75">
                  Message that will be sent
                </p>
                <div className="rounded-[20px] bg-[#0B2219] border border-[#25D366]/25 p-4 text-xs sm:text-sm text-[#E5F7EE] leading-relaxed whitespace-pre-line break-all">
                  {whatsappMessage}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom WhatsApp Bar (<= 15% mobile viewport height) */}
      {!isSold && whatsappUrl && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#05080F]/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 min-h-[48px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold shadow-lg"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Inquire on WhatsApp · {formattedPrice}</span>
          </a>
        </div>
      )}
    </div>
  );
}
