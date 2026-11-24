import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { CarWithImages } from '../types/database';
import { fetchPublishedCars } from '../lib/carsApi';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { HERO_POSTER_URL, HERO_VIDEO_URL } from '../config/media';
import {
  buildTikTokUrl,
  buildWhatsAppGeneralUrl,
  formatTikTokHandle,
  isSafeHttpUrl,
} from '../lib/formatters';
import { BrandLogo } from '../components/BrandLogo';
import { CarCard } from '../components/CarCard';
import { OwnerAvatar } from '../components/OwnerAvatar';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

export function HomePage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const location = useLocation();

  const [cars, setCars] = useState<CarWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const loadCars = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublishedCars();
      setCars(data);
    } catch {
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      }
    }
  }, [location.hash]);

  const featuredCars = useMemo(() => cars.slice(0, 3), [cars]);

  const tagline = settings?.tagline?.trim() || 'Electric Mobility.';
  const businessName = settings?.business_name?.trim() || 'Platinum EV Global';
  const generalWhatsappUrl = buildWhatsAppGeneralUrl(
    settings?.whatsapp_number,
    businessName
  );
  const tiktokUrl = buildTikTokUrl(settings?.tiktok_handle);
  const tiktokDisplay = formatTikTokHandle(settings?.tiktok_handle);

  const aboutParagraphs = useMemo(() => {
    if (!settings?.about) return [];
    return settings.about
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [settings?.about]);

  const videoSrc = HERO_VIDEO_URL.trim();
  const posterSrc = HERO_POSTER_URL.trim();
  const canShowVideo =
    Boolean(videoSrc) && isSafeHttpUrl(videoSrc) && !prefersReducedMotion && !videoError;
  const canShowPoster =
    Boolean(posterSrc) && isSafeHttpUrl(posterSrc) && !posterError;

  const scrollToContent = () => {
    const el = document.getElementById('why-platinum-ev');
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="pb-16">
      {/* FULL-SCREEN VIDEO HERO (100svh) */}
      <section className="relative min-h-[100svh] w-full flex flex-col justify-between overflow-hidden bg-[#05080F]">
        {/* Full-bleed Background Media or Executive Chrome Placeholder */}
        {canShowVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={canShowPoster ? posterSrc : undefined}
            onError={() => setVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={videoSrc} />
          </video>
        ) : canShowPoster ? (
          <img
            src={posterSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setPosterError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-[#05080F] via-[#0D1424] to-[#05080F]"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 65% 48% at 50% 40%, rgba(201, 207, 216, 0.16) 0%, rgba(201, 207, 216, 0.04) 45%, transparent 72%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 78% 24%, rgba(237, 169, 102, 0.10) 0%, transparent 48%)',
              }}
            />
          </div>
        )}

        {/* Dark Gradient Readability Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#05080F] via-[#05080F]/65 to-[#05080F]/45 pointer-events-none"
        />

        {/* Centered Hero Content */}
        <div className="relative z-10 flex-1 max-w-[1424px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-28 pb-10 flex flex-col items-center justify-center text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            {!canShowVideo && !canShowPoster && (
              <div className="mb-7 sm:mb-9 relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-full bg-[#C9CFD8]/10 blur-2xl pointer-events-none"
                />
                <BrandLogo
                  variant="full"
                  businessName={businessName}
                  className="relative max-w-[180px] sm:max-w-[240px]"
                />
              </div>
            )}

            <h1 className="font-ev-display text-3xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-4 sm:mb-5">
              {tagline}
            </h1>

            <p className="text-sm sm:text-lg text-[#C9CFD8] leading-relaxed max-w-xl mb-8">
              Curated electric vehicles, direct WhatsApp inquiries, and personal guidance from
              first message to handover.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto">
              <Link
                to="/cars"
                className="inline-flex items-center justify-center gap-2 min-h-[50px] px-7 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap"
              >
                <span>Browse Cars</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {generalWhatsappUrl ? (
                <a
                  href={generalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-7 rounded-full bg-white text-[#05080F] text-sm font-bold hover:bg-[#C9CFD8] transition-colors whitespace-nowrap"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Contact on WhatsApp</span>
                </a>
              ) : (
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-7 rounded-full bg-white text-[#05080F] text-sm font-bold hover:bg-[#C9CFD8] transition-colors whitespace-nowrap"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Contact on WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="relative z-10 pb-6 sm:pb-8 flex justify-center">
          <button
            type="button"
            onClick={scrollToContent}
            aria-label="Scroll to page content"
            className="inline-flex flex-col items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9CFD8]/80 hover:text-white transition-colors min-h-[44px] px-4"
          >
            <span>Scroll</span>
            <ChevronDown
              className={`w-4 h-4 text-[#EDA966] ${
                prefersReducedMotion ? '' : 'animate-bounce'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      {/* 1. WHY PLATINUM EV INTRO STRIP */}
      <section
        id="why-platinum-ev"
        className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 sm:pt-20 scroll-mt-24"
      >
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5">
            Why {businessName}
          </p>
          <h2 className="font-ev-display text-2xl sm:text-3xl text-white">
            Built Around Trust
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Zap,
              title: 'Curated Electric Vehicles',
              body: 'Every vehicle in our lineup is selected for everyday electric performance, range, and build quality.',
            },
            {
              icon: MessageCircle,
              title: 'Direct WhatsApp Contact',
              body: 'Message us straight from any listing with vehicle details pre-filled for clear, fast answers.',
            },
            {
              icon: ShieldCheck,
              title: 'Personal Service',
              body: 'Dedicated support from your first question through vehicle inspection and delivery.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-[#1E1F22] rounded-[26px] p-6 border border-white/[0.06]"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#EDA966] text-[#05080F] mb-4">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-sm text-[#C9CFD8] leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. FEATURED CARS (Latest 3 published from Supabase) */}
      <section className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 sm:pt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5">
              Latest in stock
            </p>
            <h2 className="font-ev-display text-2xl sm:text-3xl text-white">
              Featured Cars
            </h2>
          </div>
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white text-[#05080F] text-xs font-bold hover:bg-[#C9CFD8] transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            <span>View all cars</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!isSupabaseConfigured ? (
          <div className="bg-[#1E1F22] rounded-[28px] p-8 sm:p-10 text-center border border-white/[0.06] space-y-3">
            <p className="text-sm sm:text-base text-[#C9CFD8] max-w-xl mx-auto">
              Add <code className="text-[#EDA966]">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-[#EDA966]">VITE_SUPABASE_ANON_KEY</code> to load published
              electric vehicles.
            </p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-[#1E1F22] rounded-[28px] p-5 border border-white/[0.06] animate-pulse space-y-4"
              >
                <div className="aspect-[16/10] rounded-[20px] bg-white/10" />
                <div className="h-5 w-2/3 rounded bg-white/10" />
                <div className="h-10 w-full rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-[#1E1F22] rounded-[28px] p-8 text-center border border-red-500/30 space-y-4">
            <p className="text-sm font-semibold text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadCars()}
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
            >
              Retry loading vehicles
            </button>
          </div>
        ) : featuredCars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {featuredCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        ) : (
          <div className="bg-[#1E1F22] rounded-[28px] p-8 text-center border border-white/[0.06]">
            <p className="text-sm text-[#C9CFD8]">
              Published electric vehicles will appear here as soon as they are added.
            </p>
          </div>
        )}
      </section>

      {/* 3 & 4. ABOUT THE OWNER & CONTACT SECTION (Pulled from site_settings) */}
      <section
        id="about"
        className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 sm:pt-20 scroll-mt-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 3. About the Owner Card */}
          <div className="lg:col-span-6 bg-[#1E1F22] rounded-[28px] p-6 sm:p-9 border border-white/[0.06] flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-5 mb-6">
                <OwnerAvatar
                  src={settings?.owner_photo_url}
                  ownerName={settings?.owner_name || businessName}
                  shape="rounded"
                  className="w-20 h-20 sm:w-24 sm:h-24"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5">
                    About the owner
                  </p>
                  {settingsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-7 w-44 bg-white/10 rounded" />
                      <div className="h-4 w-52 bg-white/10 rounded" />
                    </div>
                  ) : (
                    <>
                      <h2 className="font-ev-display text-xl sm:text-2xl text-white leading-tight">
                        {settings?.owner_name || businessName}
                      </h2>
                      {(settings?.owner_title || settings?.location) && (
                        <p className="text-sm font-semibold text-[#EDA966] mt-1">
                          {[settings.owner_title, settings.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {settingsLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-11/12 bg-white/10 rounded" />
                  <div className="h-4 w-4/5 bg-white/10 rounded" />
                </div>
              ) : aboutParagraphs.length > 0 ? (
                <div className="space-y-4 text-sm sm:text-base text-[#C9CFD8] leading-relaxed">
                  {aboutParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#C9CFD8]/75">
                  Owner biography can be added from Site Settings in the admin dashboard.
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
              <BrandLogo variant="full" businessName={businessName} className="max-w-[160px]" />
              <span className="text-xs font-semibold text-[#C9CFD8]/80">{tagline}</span>
            </div>
          </div>

          {/* 4. Contact Section */}
          <div
            id="contact"
            className="lg:col-span-6 flex flex-col justify-between gap-5 scroll-mt-24"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5">
                Contact us
              </p>
              <h2 className="font-ev-display text-2xl sm:text-3xl text-white leading-tight mb-5">
                Let&apos;s Talk About Your Next EV
              </h2>

              {settingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-[22px] bg-[#1E1F22]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* WhatsApp / Phone */}
                  <div className="bg-[#1E1F22] rounded-[22px] p-5 border border-white/[0.06] flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9CFD8]/70">
                        WhatsApp / Call
                      </p>
                      {settings?.phone ? (
                        <a
                          href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                          className="text-sm font-bold text-white hover:text-[#EDA966] transition-colors truncate block"
                        >
                          {settings.phone}
                        </a>
                      ) : (
                        <p className="text-sm text-[#C9CFD8]/60">Not configured</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="bg-[#1E1F22] rounded-[22px] p-5 border border-white/[0.06] flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9CFD8]/70">
                        Email
                      </p>
                      {settings?.email ? (
                        <a
                          href={`mailto:${settings.email}`}
                          className="text-sm font-bold text-white hover:text-[#EDA966] transition-colors truncate block"
                        >
                          {settings.email}
                        </a>
                      ) : (
                        <p className="text-sm text-[#C9CFD8]/60">Not configured</p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-[#1E1F22] rounded-[22px] p-5 border border-white/[0.06] flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9CFD8]/70">
                        Location
                      </p>
                      <p className="text-sm font-bold text-white truncate">
                        {settings?.location || 'Not configured'}
                      </p>
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="bg-[#1E1F22] rounded-[22px] p-5 border border-white/[0.06] flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#EDA966] text-[#05080F] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9CFD8]/70">
                        TikTok
                      </p>
                      {tiktokUrl ? (
                        <a
                          href={tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-white hover:text-[#EDA966] transition-colors truncate block"
                        >
                          {tiktokDisplay}
                        </a>
                      ) : (
                        <p className="text-sm text-[#C9CFD8]/60">Not configured</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct WhatsApp CTA Bar */}
            <div className="bg-[#1E1F22] rounded-[24px] p-5 sm:p-6 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9CFD8]/70">
                  {businessName}
                </p>
                <p className="text-base font-bold text-white mt-0.5">{tagline}</p>
              </div>
              {generalWhatsappUrl ? (
                <a
                  href={generalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              ) : (
                <Link
                  to="/cars"
                  className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap"
                >
                  Browse Inventory
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
