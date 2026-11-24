import { isSupabaseConfigured, supabase } from './supabase';
import type { CarImage, CarWithImages, SiteSettings } from '../types/database';

const GENERIC_ERROR_MESSAGE = 'Something went wrong, please try again.';

function sortImages(images: CarImage[] | null | undefined): CarImage[] {
  if (!Array.isArray(images)) return [];
  return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export async function fetchPublishedCars(): Promise<CarWithImages[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  const { data, error } = await supabase
    .from('cars')
    .select('*, car_images(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  return ((data as CarWithImages[] | null) ?? []).map((car) => ({
    ...car,
    car_images: sortImages(car.car_images),
  }));
}

export async function fetchPublishedCarById(id: string): Promise<CarWithImages | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  const { data, error } = await supabase
    .from('cars')
    .select('*, car_images(*)')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  if (!data) return null;

  const car = data as CarWithImages;
  return {
    ...car,
    car_images: sortImages(car.car_images),
  };
}

export async function fetchAllCarsForAdmin(): Promise<CarWithImages[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  const { data, error } = await supabase
    .from('cars')
    .select('*, car_images(*)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  return ((data as CarWithImages[] | null) ?? []).map((car) => ({
    ...car,
    car_images: sortImages(car.car_images),
  }));
}

export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  return (data as SiteSettings | null) ?? null;
}
