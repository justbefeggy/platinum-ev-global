import { Link } from 'react-router-dom';
import type { CarWithImages } from '../types/database';
import { useSiteSettings } from '../context/SiteSettingsContext';
import {
  buildWhatsAppCarUrl,
  formatMileage,
  formatPrice,
  formatSpeed,
  getCarPageUrl,
} from '../lib/formatters';
import { CarImage } from './CarImage';
import { WhatsAppIcon } from './WhatsAppIcon';

interface CarCardProps {
  car: CarWithImages;
}

export function CarCard({ car }: CarCardProps) {
  const { settings } = useSiteSettings();
  const coverImage = car.car_images?.[0]?.image_url ?? null;
  const isSold = car.status === 'sold';
  const formattedPrice = formatPrice(car.price, car.currency);
  const carUrl = getCarPageUrl(car.id);
  const whatsappUrl = buildWhatsAppCarUrl(settings?.whatsapp_number, car, carUrl);

  return (
    <article className="group bg-[#1E1F22] rounded-[28px] p-4 sm:p-5 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 border border-white/[0.06]">
      <Link
        to={`/cars/${car.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EDA966] rounded-[20px]"
      >
        {/* White-to-pale image surface matching PDF */}
        <div className="relative aspect-[16/10] w-full rounded-[20px] bg-gradient-to-b from-white to-[#F2F4F8] overflow-hidden mb-4">
          <CarImage
            src={coverImage}
            alt={`${car.year} ${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute top-3 left-3 bg-[#1E1F22]/90 text-white text-xs font-bold tabular-nums px-3 py-1 rounded-full">
            {car.year}
          </div>

          {isSold && (
            <div className="absolute top-3 right-3 bg-[#05080F] text-[#EDA966] border border-[#EDA966]/40 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Sold
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight leading-snug mb-3 group-hover:text-[#EDA966] transition-colors">
          {car.make} {car.model}
        </h3>

        {/* 3 concise specs */}
        <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/10 text-left">
          <div>
            <p className="text-[11px] font-medium text-[#C9CFD8]/75">Mileage</p>
            <p className="text-xs sm:text-sm font-bold text-white tabular-nums">
              {formatMileage(car.mileage)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#C9CFD8]/75">Top speed</p>
            <p className="text-xs sm:text-sm font-bold text-white tabular-nums">
              {formatSpeed(car.top_speed_kph)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#C9CFD8]/75">Year</p>
            <p className="text-xs sm:text-sm font-bold text-white tabular-nums">{car.year}</p>
          </div>
        </div>
      </Link>

      {/* Bottom Price + Action */}
      <div className="pt-4 flex items-center justify-between gap-3">
        <span className="text-xl font-extrabold text-white tabular-nums tracking-tight">
          {formattedPrice}
        </span>

        {isSold ? (
          <span className="inline-flex items-center justify-center min-h-[42px] px-5 rounded-full bg-[#252628] text-[#C9CFD8]/60 text-xs font-bold uppercase tracking-wider cursor-not-allowed whitespace-nowrap shrink-0">
            Sold
          </span>
        ) : whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-full bg-[#EDA966] text-[#05080F] text-xs font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap shrink-0"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Inquire</span>
          </a>
        ) : (
          <Link
            to={`/cars/${car.id}`}
            className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-full bg-[#EDA966] text-[#05080F] text-xs font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap shrink-0"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}
