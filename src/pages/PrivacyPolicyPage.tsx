import { Link } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingsContext';

export function PrivacyPolicyPage() {
  const { settings } = useSiteSettings();
  const businessName = settings?.business_name?.trim() || 'Platinum EV Global';

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5">
          {businessName}
        </p>
        <h1 className="font-ev-display text-2xl sm:text-4xl text-white">Privacy Policy</h1>
      </div>

      <div className="bg-[#1E1F22] rounded-[28px] p-6 sm:p-10 border border-white/[0.06] space-y-6 text-sm sm:text-base text-[#C9CFD8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-white">No Visitor Data Collection</h2>
          <p>
            This website does not collect, store, or sell personal visitor data. There are no
            public user accounts, tracking profiles, or contact forms collecting your information
            on this site.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-white">WhatsApp Inquiries</h2>
          <p>
            When you click an inquiry or contact button, your browser opens WhatsApp directly so
            you can message {businessName}. Any conversation, phone number, or information you
            choose to share takes place on WhatsApp and is governed by WhatsApp&apos;s own privacy
            policy and terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-white">Contact</h2>
          <p>
            If you have any questions about this policy, please reach out using our contact
            details on the{' '}
            <Link to="/#contact" className="text-[#EDA966] font-semibold hover:underline">
              Contact section
            </Link>
            {settings?.email ? ` or by email at ${settings.email}.` : '.'}
          </p>
        </section>
      </div>
    </div>
  );
}
