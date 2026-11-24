import { z } from 'zod';

const MAX_YEAR = new Date().getFullYear() + 1;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .max(254, 'Email must be 254 characters or less.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(200, 'Password must be 200 characters or less.'),
});

export const carFormSchema = z.object({
  make: z
    .string()
    .trim()
    .min(1, 'Make is required.')
    .max(80, 'Make must be 80 characters or less.'),
  model: z
    .string()
    .trim()
    .min(1, 'Model is required.')
    .max(120, 'Model must be 120 characters or less.'),
  year: z.preprocess(
    (val) => {
      const str = typeof val === 'string' ? val.trim() : String(val ?? '');
      return str === '' ? NaN : Number(str);
    },
    z
      .number({ message: `Enter a valid year between 1990 and ${MAX_YEAR}.` })
      .int(`Year must be a whole number between 1990 and ${MAX_YEAR}.`)
      .min(1990, `Year must be between 1990 and ${MAX_YEAR}.`)
      .max(MAX_YEAR, `Year must be between 1990 and ${MAX_YEAR}.`)
  ),
  currency: z.enum(['NGN', 'USD', 'GBP', 'EUR'], {
    message: 'Select a valid currency.',
  }),
  price: z.preprocess(
    (val) => {
      const str = typeof val === 'string' ? val.trim() : String(val ?? '');
      return str === '' ? NaN : Number(str);
    },
    z
      .number({ message: 'Enter a valid non-negative price.' })
      .finite('Enter a valid price.')
      .min(0, 'Price cannot be negative.')
      .max(10_000_000_000, 'Price exceeds the allowed limit.')
  ),
  mileage: z.preprocess(
    (val) => {
      const str = typeof val === 'string' ? val.trim() : String(val ?? '');
      return str === '' ? NaN : Number(str);
    },
    z
      .number({ message: 'Enter a valid non-negative mileage in km.' })
      .finite('Enter a valid mileage.')
      .int('Mileage must be a whole number.')
      .min(0, 'Mileage cannot be negative.')
      .max(5_000_000, 'Mileage exceeds the allowed limit.')
  ),
  top_speed_kph: z.preprocess(
    (val) => {
      const str = typeof val === 'string' ? val.trim() : String(val ?? '');
      return str === '' ? NaN : Number(str);
    },
    z
      .number({ message: 'Enter a valid top speed in km/h.' })
      .finite('Enter a valid top speed.')
      .int('Top speed must be a whole number.')
      .min(1, 'Top speed must be at least 1 km/h.')
      .max(600, 'Top speed must be 600 km/h or less.')
  ),
  description: z
    .string()
    .trim()
    .max(3000, 'Description must be 3,000 characters or less.')
    .transform((val) => val || null),
  status: z.enum(['available', 'sold']),
  is_published: z.boolean(),
});

export const siteSettingsSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, 'Business name is required.')
    .max(120, 'Business name must be 120 characters or less.'),
  tagline: z
    .string()
    .trim()
    .min(1, 'Tagline is required.')
    .max(160, 'Tagline must be 160 characters or less.'),
  owner_name: z
    .string()
    .trim()
    .min(1, 'Owner name is required.')
    .max(120, 'Owner name must be 120 characters or less.'),
  owner_title: z
    .string()
    .trim()
    .max(120, 'Owner title must be 120 characters or less.')
    .transform((val) => val || null),
  about: z
    .string()
    .trim()
    .max(5000, 'About text must be 5,000 characters or less.')
    .transform((val) => val || null),
  whatsapp_number: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine(
      (val) => val === '' || (val.length >= 7 && val.length <= 15),
      'WhatsApp number must contain 7 to 15 digits with country code.'
    )
    .transform((val) => val || null),
  phone: z
    .string()
    .trim()
    .max(40, 'Display phone must be 40 characters or less.')
    .transform((val) => val || null),
  email: z
    .string()
    .trim()
    .max(254, 'Email must be 254 characters or less.')
    .refine(
      (val) => val === '' || z.string().email().safeParse(val).success,
      'Enter a valid email address.'
    )
    .transform((val) => val || null),
  tiktok_handle: z
    .string()
    .trim()
    .max(80, 'TikTok handle must be 80 characters or less.')
    .transform((val) => val || null),
  location: z
    .string()
    .trim()
    .max(160, 'Location must be 160 characters or less.')
    .transform((val) => val || null),
});
