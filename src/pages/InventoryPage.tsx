import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CarWithImages } from '../types/database';
import { fetchPublishedCars } from '../lib/carsApi';
import { isSupabaseConfigured } from '../lib/supabase';
import { CarCard } from '../components/CarCard';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

export function InventoryPage() {
  const [cars, setCars] = useState<CarWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMake, setSelectedMake] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const loadCars = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
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

  const makes = useMemo(() => {
    const unique = Array.from(new Set(cars.map((c) => c.make.trim()).filter(Boolean))).sort();
    return ['All', ...unique];
  }, [cars]);

  const years = useMemo(() => {
    const unique = Array.from(new Set(cars.map((c) => c.year))).sort((a, b) => b - a);
    return unique;
  }, [cars]);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    const list = cars.filter((car) => {
      if (selectedMake !== 'All' && car.make.trim().toLowerCase() !== selectedMake.toLowerCase()) {
        return false;
      }
      if (selectedYear !== 'All' && String(car.year) !== selectedYear) {
        return false;
      }
      if (min !== null && Number.isFinite(min) && car.price < min) {
        return false;
      }
      if (max !== null && Number.isFinite(max) && car.price > max) {
        return false;
      }
      if (q) {
        const hay = `${car.make} ${car.model} ${car.year} ${car.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [cars, searchQuery, selectedMake, selectedYear, minPrice, maxPrice, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMake !== 'All' ||
    selectedYear !== 'All' ||
    minPrice.trim() !== '' ||
    maxPrice.trim() !== '' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMake('All');
    setSelectedYear('All');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  };

  const availableCount = useMemo(
    () => cars.filter((c) => c.status === 'available').length,
    [cars]
  );

  return (
    <div className="max-w-[1424px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1.5 tabular-nums">
            {loading
              ? 'Loading electric vehicles...'
              : `${availableCount} electric ${availableCount === 1 ? 'vehicle' : 'vehicles'} available`}
          </p>
          <h1 className="font-ev-display text-3xl sm:text-4xl text-white">Inventory</h1>
        </div>

        {/* Search, Year, Price Range, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-[#C9CFD8]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search make or model"
              aria-label="Search make or model"
              className="w-full min-h-[44px] pl-10 pr-4 rounded-full bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/60 focus:outline-none focus:border-[#EDA966]"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            aria-label="Filter by year"
            className="min-h-[44px] px-4 rounded-full bg-[#252628] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-[#EDA966]"
          >
            <option value="All">All Years</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-[#252628] border border-white/10 rounded-full px-3 min-h-[44px]">
            <SlidersHorizontal aria-hidden="true" className="w-3.5 h-3.5 text-[#EDA966] shrink-0" />
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min price"
              aria-label="Minimum price"
              className="w-24 bg-transparent text-sm text-white placeholder:text-[#C9CFD8]/55 focus:outline-none tabular-nums"
            />
            <span className="text-[#C9CFD8]/40 text-xs">–</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max price"
              aria-label="Maximum price"
              className="w-24 bg-transparent text-sm text-white placeholder:text-[#C9CFD8]/55 focus:outline-none tabular-nums"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort vehicles"
            className="min-h-[44px] px-4 rounded-full bg-[#252628] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-[#EDA966]"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Make Filter Pills */}
      {makes.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-6">
          {makes.map((make) => {
            const active = selectedMake === make;
            return (
              <button
                key={make}
                type="button"
                onClick={() => setSelectedMake(make)}
                className={`min-h-[44px] px-5 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#EDA966] text-[#05080F]'
                    : 'bg-white text-[#05080F] hover:bg-[#C9CFD8]'
                }`}
              >
                {make}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-[#252628] text-[#C9CFD8] hover:text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}

      {/* States */}
      {!isSupabaseConfigured ? (
        <div className="bg-[#1E1F22] rounded-[28px] p-10 text-center border border-white/[0.06] space-y-3">
          <h2 className="text-lg font-bold text-white">Supabase Not Configured</h2>
          <p className="text-sm text-[#C9CFD8] max-w-md mx-auto">
            Set <code className="text-[#EDA966]">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-[#EDA966]">VITE_SUPABASE_ANON_KEY</code> to load your published
            vehicles.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
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
        <div className="bg-[#1E1F22] rounded-[28px] p-10 text-center border border-red-500/30 space-y-4">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadCars()}
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : filteredCars.length === 0 ? (
        <div className="bg-[#1E1F22] rounded-[28px] p-12 text-center border border-white/[0.06] space-y-4">
          <h2 className="font-ev-display text-xl text-white">
            {cars.length === 0 ? 'No Vehicles Published Yet' : 'No Matching Vehicles'}
          </h2>
          <p className="text-sm text-[#C9CFD8] max-w-md mx-auto">
            {cars.length === 0
              ? 'New electric vehicles will be listed here as soon as they are published in the showroom.'
              : 'Try adjusting your search query, make, year, or price range.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
