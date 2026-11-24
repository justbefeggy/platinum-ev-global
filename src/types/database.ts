export type CarStatus = 'available' | 'sold';

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage: number;
  top_speed_kph: number;
  description: string | null;
  status: CarStatus;
  is_published: boolean;
  created_at: string;
}

export interface CarImage {
  id: string;
  car_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface CarWithImages extends Car {
  car_images: CarImage[];
}

export interface SiteSettings {
  id: string;
  business_name: string | null;
  tagline: string | null;
  owner_name: string | null;
  owner_title: string | null;
  owner_photo_url: string | null;
  about: string | null;
  whatsapp_number: string | null;
  phone: string | null;
  email: string | null;
  tiktok_handle: string | null;
  location: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}
