import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildTikTokUrl, formatTikTokHandle } from '../lib/formatters';

export function Footer() {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const businessName = settings?.business_name?.trim() || 'Platinum EV Global';
  const tagline = settings?.tagline?.trim() || 'Electric Mobility.';
  const tiktokUrl = buildTikTokUrl(settings?.tiktok_handle);
  const tiktokDisplay = formatTikTokHandle(settings?.tiktok_handle);

  const handleSectionLink = (sectionId: 'about' | 'contact') => {
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  return (
    <footer className="border-t border-white/10 bg-[#05080F]">
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Logo & Tagline */}
          <div className="md:col-span-4 space-y-3">
            <BrandLogo variant="full" businessName={businessName} className="max-w-[190px]" />
            <p className="text-sm text-[#C9CFD8] font-medium">{tagline}</p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#EDA966]">
              Explore
            </h3>
            <ul className="space-y-2 text-sm text-[#C9CFD8]">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/cars" className="hover:text-white transition-colors">
                  Inventory
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionLink('about')}
                  className="hover:text-white transition-colors"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionLink('contact')}
                  className="hover:text-white transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details from site_settings */}
          <div className="md:col-span-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#EDA966]">
              Contact
            </h3>
            {settings ? (
              <div className="space-y-1.5 text-sm text-[#C9CFD8]">
                {settings.phone && (
                  <p>
                    Phone / WhatsApp:{' '}
                    <span className="text-white font-medium">{settings.phone}</span>
                  </p>
                )}
                {settings.email && (
                  <p>
                    Email:{' '}
                    <a
                      href={`mailto:${settings.email}`}
                      className="text-white font-medium hover:text-[#EDA966] transition-colors"
                    >
                      {settings.email}
                    </a>
                  </p>
                )}
                {(settings.location || tiktokUrl) && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {settings.location && <span>{settings.location}</span>}
                    {settings.location && tiktokUrl && <span aria-hidden="true">·</span>}
                    {tiktokUrl && (
                      <a
                        href={tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-medium hover:text-[#EDA966] transition-colors"
                      >
                        TikTok {tiktokDisplay}
                      </a>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#C9CFD8]/70">
                Contact details managed in site settings.
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#C9CFD8]/75">
          <p>
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </p>
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
