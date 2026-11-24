import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppGeneralUrl } from '../lib/formatters';

export function Navbar() {
  const { settings } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappUrl = buildWhatsAppGeneralUrl(
    settings?.whatsapp_number,
    settings?.business_name
  );

  const handleSectionLink = (sectionId: 'about' | 'contact') => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  const isHomeActive = location.pathname === '/' && !location.hash;
  const isCarsActive = location.pathname.startsWith('/cars');
  const isAboutActive = location.pathname === '/' && location.hash === '#about';
  const isContactActive = location.pathname === '/' && location.hash === '#contact';

  const navLinkClass = (active: boolean) =>
    `relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
      active
        ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-[#EDA966] after:rounded-full'
        : 'text-[#C9CFD8] hover:text-white'
    }`;

  const headerClass = isHome
    ? `fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled || mobileMenuOpen
          ? 'bg-[#05080F]/90 backdrop-blur-md border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`
    : 'sticky top-0 z-40 bg-[#05080F]/95 backdrop-blur-md border-b border-white/10';

  return (
    <header className={headerClass}>
      <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EDA966] rounded-lg py-1"
        >
          <BrandLogo variant="emblem" businessName={settings?.business_name} />
        </Link>

        {/* Zone 2: Navigation Links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7"
        >
          <Link to="/" className={navLinkClass(isHomeActive)}>
            Home
          </Link>
          <Link to="/cars" className={navLinkClass(isCarsActive)}>
            Cars
          </Link>
          <button
            type="button"
            onClick={() => handleSectionLink('about')}
            className={navLinkClass(isAboutActive)}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('contact')}
            className={navLinkClass(isContactActive)}
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2.5 px-5 py-2.5 min-h-[44px] rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Contact on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => handleSectionLink('contact')}
              className="hidden sm:inline-flex items-center gap-2.5 px-5 py-2.5 min-h-[44px] rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Contact on WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-11 h-11 rounded-full bg-white text-[#05080F] flex items-center justify-center hover:bg-[#C9CFD8] transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1E1F22] border-b border-white/10 px-4 py-5 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-4 rounded-2xl text-base font-semibold text-white hover:bg-[#252628]"
          >
            Home
          </Link>
          <Link
            to="/cars"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-4 rounded-2xl text-base font-semibold text-white hover:bg-[#252628]"
          >
            Cars
          </Link>
          <button
            type="button"
            onClick={() => handleSectionLink('about')}
            className="w-full text-left flex items-center min-h-[48px] px-4 rounded-2xl text-base font-semibold text-white hover:bg-[#252628]"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('contact')}
            className="w-full text-left flex items-center min-h-[48px] px-4 rounded-2xl text-base font-semibold text-white hover:bg-[#252628]"
          >
            Contact
          </button>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2.5 min-h-[48px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Contact on WhatsApp</span>
            </a>
          ) : null}
        </div>
      )}
    </header>
  );
}
