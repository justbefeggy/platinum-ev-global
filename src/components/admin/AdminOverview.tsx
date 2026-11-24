import { CarFront, CheckCircle2, EyeOff, Pencil, Plus, Tag } from 'lucide-react';
import type { CarWithImages } from '../../types/database';
import { formatMileage, formatPrice } from '../../lib/formatters';
import { CarImage } from '../CarImage';

interface AdminOverviewProps {
  cars: CarWithImages[];
  loading: boolean;
  onAddCar: () => void;
  onEditCar: (car: CarWithImages) => void;
  onViewAllCars: () => void;
}

export function AdminOverview({
  cars,
  loading,
  onAddCar,
  onEditCar,
  onViewAllCars,
}: AdminOverviewProps) {
  const totalCount = cars.length;
  const availableCount = cars.filter((c) => c.status === 'available').length;
  const soldCount = cars.filter((c) => c.status === 'sold').length;
  const unpublishedCount = cars.filter((c) => !c.is_published).length;
  const latestCars = cars.slice(0, 5);

  const stats = [
    { label: 'Total Cars', value: totalCount, icon: CarFront, accent: 'text-white' },
    { label: 'Available', value: availableCount, icon: CheckCircle2, accent: 'text-[#EDA966]' },
    { label: 'Sold', value: soldCount, icon: Tag, accent: 'text-emerald-400' },
    { label: 'Unpublished', value: unpublishedCount, icon: EyeOff, accent: 'text-[#C9CFD8]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1">
            Dashboard
          </p>
          <h1 className="font-ev-display text-2xl sm:text-3xl text-white">Overview</h1>
        </div>
        <button
          type="button"
          onClick={onAddCar}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Car</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-[#1E1F22] rounded-[24px] p-5 border border-white/[0.06] flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#C9CFD8]/75">{item.label}</span>
                <Icon className={`w-4 h-4 ${item.accent}`} aria-hidden="true" />
              </div>
              {loading ? (
                <div className="h-9 w-16 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className={`text-3xl font-extrabold tabular-nums ${item.accent}`}>
                  {item.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Latest Added Cars */}
      <div className="bg-[#1E1F22] rounded-[28px] p-5 sm:p-7 border border-white/[0.06]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-base sm:text-lg font-bold text-white">Latest Added Vehicles</h2>
          {cars.length > 0 && (
            <button
              type="button"
              onClick={onViewAllCars}
              className="text-xs font-bold text-[#EDA966] hover:text-[#f2b87e] transition-colors whitespace-nowrap"
            >
              Manage all cars →
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : latestCars.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-[#C9CFD8]">No vehicles in your inventory yet.</p>
            <button
              type="button"
              onClick={onAddCar}
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-xs font-bold hover:bg-[#f2b87e] transition-colors"
            >
              Add your first vehicle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {latestCars.map((car) => (
              <div
                key={car.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-11 rounded-xl bg-white overflow-hidden shrink-0">
                    <CarImage
                      src={car.car_images?.[0]?.image_url}
                      alt={`${car.year} ${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {car.year} {car.make} {car.model}
                    </p>
                    <p className="text-xs text-[#C9CFD8]/75 tabular-nums">
                      {formatPrice(car.price, car.currency)} · {formatMileage(car.mileage)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      car.status === 'sold'
                        ? 'bg-[#252628] text-[#C9CFD8]'
                        : 'bg-[#EDA966]/15 text-[#EDA966]'
                    }`}
                  >
                    {car.status === 'sold' ? 'Sold' : 'Available'}
                  </span>
                  <span className="text-xs font-medium text-[#C9CFD8]/75">
                    {car.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditCar(car)}
                    aria-label={`Edit ${car.make} ${car.model}`}
                    className="w-9 h-9 rounded-full bg-[#252628] text-white hover:bg-[#EDA966] hover:text-[#05080F] flex items-center justify-center transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
