import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { CarStatus, CarWithImages } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { carFormSchema } from '../../lib/validation';
import { formatMileage, formatPrice, formatSpeed } from '../../lib/formatters';
import { CarImage } from '../CarImage';

interface AdminCarsManagerProps {
  cars: CarWithImages[];
  loading: boolean;
  editingCar: CarWithImages | null;
  formOpen: boolean;
  onOpenNew: () => void;
  onOpenEdit: (car: CarWithImages) => void;
  onCloseForm: () => void;
  onRefresh: () => Promise<void>;
}

interface FormImageItem {
  localId: string;
  dbId?: string;
  url: string;
  storagePath?: string;
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
}

interface CarFormFields {
  make: string;
  model: string;
  year: string;
  price: string;
  currency: string;
  mileage: string;
  top_speed_kph: string;
  description: string;
  status: CarStatus;
  is_published: boolean;
}

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_CAR = 10;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_DEFAULT_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function generateRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getSafeExtension(file: File): string {
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (rawExt === 'jpg' || rawExt === 'jpeg' || rawExt === 'png' || rawExt === 'webp') {
    return rawExt;
  }
  return MIME_DEFAULT_EXT[file.type] ?? 'jpg';
}

function createInitialFields(car: CarWithImages | null): CarFormFields {
  if (!car) {
    return {
      make: '',
      model: '',
      year: String(new Date().getFullYear()),
      price: '',
      currency: 'NGN',
      mileage: '',
      top_speed_kph: '',
      description: '',
      status: 'available',
      is_published: true,
    };
  }
  return {
    make: car.make,
    model: car.model,
    year: String(car.year),
    price: String(car.price),
    currency: car.currency || 'NGN',
    mileage: String(car.mileage),
    top_speed_kph: String(car.top_speed_kph),
    description: car.description ?? '',
    status: car.status,
    is_published: car.is_published,
  };
}

function createInitialImages(car: CarWithImages | null): FormImageItem[] {
  if (!car?.car_images) return [];
  return [...car.car_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      localId: img.id,
      dbId: img.id,
      url: img.image_url,
      status: 'ready',
    }));
}

function extractStoragePathFromUrl(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/car-images/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export function AdminCarsManager({
  cars,
  loading,
  editingCar,
  formOpen,
  onOpenNew,
  onOpenEdit,
  onCloseForm,
  onRefresh,
}: AdminCarsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold' | 'unpublished'>(
    'all'
  );
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarWithImages | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [fields, setFields] = useState<CarFormFields>(() => createInitialFields(editingCar));
  const [images, setImages] = useState<FormImageItem[]>(() => createInitialImages(editingCar));
  const [removedImages, setRemovedImages] = useState<Array<{ dbId: string; storagePath: string | null }>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (formOpen) {
      setFields(createInitialFields(editingCar));
      setImages(createInitialImages(editingCar));
      setRemovedImages([]);
      setFieldErrors({});
      setFormError(null);
    }
  }, [formOpen, editingCar]);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cars.filter((car) => {
      if (statusFilter === 'available' && car.status !== 'available') return false;
      if (statusFilter === 'sold' && car.status !== 'sold') return false;
      if (statusFilter === 'unpublished' && car.is_published) return false;
      if (q) {
        const hay = `${car.make} ${car.model} ${car.year}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cars, searchQuery, statusFilter]);

  const handleToggleStatus = async (car: CarWithImages) => {
    if (!supabase) return;
    setActionBusyId(car.id);
    setListError(null);
    const nextStatus: CarStatus = car.status === 'sold' ? 'available' : 'sold';
    try {
      const { error } = await supabase
        .from('cars')
        .update({ status: nextStatus })
        .eq('id', car.id);
      if (error) throw new Error('status_update_failed');
      await onRefresh();
    } catch {
      setListError('Something went wrong, please try again.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleTogglePublished = async (car: CarWithImages) => {
    if (!supabase) return;
    setActionBusyId(car.id);
    setListError(null);
    try {
      const { error } = await supabase
        .from('cars')
        .update({ is_published: !car.is_published })
        .eq('id', car.id);
      if (error) throw new Error('visibility_update_failed');
      await onRefresh();
    } catch {
      setListError('Something went wrong, please try again.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    setListError(null);
    try {
      const storagePaths = (deleteTarget.car_images ?? [])
        .map((img) => extractStoragePathFromUrl(img.image_url))
        .filter((p): p is string => Boolean(p));

      const { error: imagesErr } = await supabase
        .from('car_images')
        .delete()
        .eq('car_id', deleteTarget.id);
      if (imagesErr) throw new Error('delete_images_failed');

      const { error: carErr } = await supabase
        .from('cars')
        .delete()
        .eq('id', deleteTarget.id);
      if (carErr) throw new Error('delete_car_failed');

      if (storagePaths.length > 0) {
        await supabase.storage.from('car-images').remove(storagePaths);
      }

      setDeleteTarget(null);
      await onRefresh();
    } catch {
      setListError('Something went wrong, please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!supabase) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const currentActiveCount = images.filter((i) => i.status !== 'error').length;
    let remainingSlots = Math.max(0, MAX_IMAGES_PER_CAR - currentActiveCount);

    if (remainingSlots === 0) {
      setFormError(`Maximum ${MAX_IMAGES_PER_CAR} images allowed per vehicle.`);
      return;
    }

    setFormError(null);

    for (const file of files) {
      const localId = generateRandomUuid();

      if (remainingSlots <= 0) {
        setImages((prev) => [
          ...prev,
          {
            localId,
            url: '',
            status: 'error',
            errorMessage: `Maximum ${MAX_IMAGES_PER_CAR} images allowed per vehicle.`,
          },
        ]);
        continue;
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setImages((prev) => [
          ...prev,
          {
            localId,
            url: '',
            status: 'error',
            errorMessage: 'Only JPG, PNG, and WebP images are supported.',
          },
        ]);
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setImages((prev) => [
          ...prev,
          {
            localId,
            url: '',
            status: 'error',
            errorMessage: 'Each image must be 5 MB or smaller.',
          },
        ]);
        continue;
      }

      remainingSlots -= 1;
      setImages((prev) => [...prev, { localId, url: '', status: 'uploading' }]);

      const safeExt = getSafeExtension(file);
      const filePath = `${generateRandomUuid()}.${safeExt}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('upload_failed');
        }

        const { data: publicData } = supabase.storage
          .from('car-images')
          .getPublicUrl(filePath);

        setImages((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  url: publicData.publicUrl,
                  storagePath: filePath,
                  status: 'ready',
                }
              : item
          )
        );
      } catch {
        setImages((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: 'Something went wrong, please try again.',
                }
              : item
          )
        );
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  };

  const removeImage = (localId: string) => {
    const target = images.find((i) => i.localId === localId);
    if (target) {
      const storagePath = target.storagePath ?? extractStoragePathFromUrl(target.url);
      if (target.dbId) {
        setRemovedImages((prev) => [
          ...prev,
          { dbId: target.dbId!, storagePath },
        ]);
      } else if (storagePath && supabase) {
        void supabase.storage.from('car-images').remove([storagePath]);
      }
    }
    setImages((prev) => prev.filter((i) => i.localId !== localId));
  };

  const handleCancelForm = () => {
    const unsavedPaths = images
      .filter((img) => !img.dbId)
      .map((img) => img.storagePath ?? extractStoragePathFromUrl(img.url))
      .filter((p): p is string => Boolean(p));

    if (unsavedPaths.length > 0 && supabase) {
      void supabase.storage.from('car-images').remove(unsavedPaths);
    }
    onCloseForm();
  };

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setFieldErrors({});
    setFormError(null);

    const parsed = carFormSchema.safeParse(fields);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    const uploadingCount = images.filter((i) => i.status === 'uploading').length;
    if (uploadingCount > 0) {
      setFormError('Please wait for all image uploads to finish before saving.');
      return;
    }

    const readyImages = images.filter((img) => img.status === 'ready' && img.url);
    if (readyImages.length > MAX_IMAGES_PER_CAR) {
      setFormError(`Maximum ${MAX_IMAGES_PER_CAR} images allowed per vehicle.`);
      return;
    }

    setSaving(true);

    try {
      let carId = editingCar?.id;

      if (carId) {
        const { error: updateErr } = await supabase
          .from('cars')
          .update(parsed.data)
          .eq('id', carId);
        if (updateErr) throw new Error('save_failed');
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('cars')
          .insert(parsed.data)
          .select('id')
          .single();
        if (insertErr) throw new Error('save_failed');
        carId = inserted.id;
      }

      if (removedImages.length > 0) {
        const removedDbIds = removedImages.map((item) => item.dbId);
        const { error: delErr } = await supabase
          .from('car_images')
          .delete()
          .in('id', removedDbIds);
        if (delErr) throw new Error('delete_images_failed');

        const removedStoragePaths = removedImages
          .map((item) => item.storagePath)
          .filter((p): p is string => Boolean(p));
        if (removedStoragePaths.length > 0) {
          await supabase.storage.from('car-images').remove(removedStoragePaths);
        }
      }

      for (let idx = 0; idx < readyImages.length; idx++) {
        const img = readyImages[idx];
        if (img.dbId) {
          const { error: orderErr } = await supabase
            .from('car_images')
            .update({ sort_order: idx })
            .eq('id', img.dbId);
          if (orderErr) throw new Error('reorder_failed');
        } else {
          const { error: imgInsertErr } = await supabase.from('car_images').insert({
            car_id: carId,
            image_url: img.url,
            sort_order: idx,
          });
          if (imgInsertErr) throw new Error('insert_image_failed');
        }
      }

      await onRefresh();
      onCloseForm();
    } catch {
      setFormError('Something went wrong, please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (formOpen) {
    const failedUploads = images.filter((i) => i.status === 'error');

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EDA966] hover:text-[#f2b87e] mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Cars</span>
            </button>
            <h1 className="font-ev-display text-2xl sm:text-3xl text-white">
              {editingCar ? `Edit ${editingCar.make} ${editingCar.model}` : 'Add New Car'}
            </h1>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSaveCar(e)}
          noValidate
          className="bg-[#1E1F22] rounded-[28px] p-5 sm:p-8 border border-white/[0.06] space-y-7"
        >
          {formError && (
            <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {formError}
            </div>
          )}

          {/* Photo Upload Dropzone */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Vehicle Photos</h2>
                <p className="text-xs text-[#C9CFD8]/75">
                  Upload up to {MAX_IMAGES_PER_CAR} JPG, PNG, or WebP images (max 5 MB each). The first image is used as the cover photo.
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`rounded-[22px] border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#EDA966] bg-[#EDA966]/10'
                  : 'border-[#EDA966]/45 bg-[#252628]/60 hover:border-[#EDA966]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void uploadFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <Upload className="w-7 h-7 text-[#EDA966] mx-auto mb-2.5" />
              <p className="text-sm font-bold text-white">Drag photos here or click to upload</p>
              <p className="text-xs text-[#C9CFD8]/70 mt-1">
                JPG, PNG, or WebP · Max 5 MB each · Up to {MAX_IMAGES_PER_CAR} photos
              </p>
            </div>

            {/* Failed upload errors */}
            {failedUploads.length > 0 && (
              <div className="space-y-1.5">
                {failedUploads.map((item) => (
                  <div
                    key={item.localId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-red-500/15 border border-red-500/30 px-3.5 py-2 text-xs text-red-200"
                  >
                    <span>{item.errorMessage || 'Upload failed'}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(item.localId)}
                      aria-label="Dismiss upload error"
                      className="text-red-200 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Uploaded Thumbnails with Reorder & Cover controls */}
            {images.filter((i) => i.status !== 'error').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images
                  .filter((i) => i.status !== 'error')
                  .map((img, index) => (
                    <div
                      key={img.localId}
                      className={`rounded-2xl bg-[#252628] p-2 border ${
                        index === 0 ? 'border-[#EDA966]' : 'border-white/10'
                      }`}
                    >
                      <div className="relative aspect-[16/10] rounded-xl bg-white overflow-hidden mb-2">
                        {img.status === 'uploading' ? (
                          <div className="w-full h-full bg-[#1E1F22] flex flex-col items-center justify-center gap-1.5 text-xs text-[#C9CFD8]">
                            <Loader2 className="w-5 h-5 animate-spin text-[#EDA966]" />
                            <span>Uploading...</span>
                          </div>
                        ) : (
                          <CarImage
                            src={img.url}
                            alt={`Vehicle image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {index === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-[#EDA966] text-[#05080F] text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(img.localId)}
                          aria-label="Remove image"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#05080F]/85 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveImage(index, -1)}
                            aria-label="Move image left"
                            className="w-7 h-7 rounded-lg bg-[#1E1F22] text-white disabled:opacity-30 flex items-center justify-center hover:bg-[#EDA966] hover:text-[#05080F] transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              index === images.filter((i) => i.status !== 'error').length - 1
                            }
                            onClick={() => moveImage(index, 1)}
                            aria-label="Move image right"
                            className="w-7 h-7 rounded-lg bg-[#1E1F22] text-white disabled:opacity-30 flex items-center justify-center hover:bg-[#EDA966] hover:text-[#05080F] transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setAsCover(index)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EDA966] hover:text-[#f2b87e] px-1.5 py-1"
                          >
                            <Star className="w-3 h-3" />
                            <span>Cover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Vehicle Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Make *
              </label>
              <input
                type="text"
                maxLength={80}
                value={fields.make}
                onChange={(e) => setFields((f) => ({ ...f, make: e.target.value }))}
                placeholder="e.g. Tesla"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.make && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.make}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Model *
              </label>
              <input
                type="text"
                maxLength={120}
                value={fields.model}
                onChange={(e) => setFields((f) => ({ ...f, model: e.target.value }))}
                placeholder="e.g. Model S Plaid"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.model && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.model}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Year *
              </label>
              <input
                type="number"
                value={fields.year}
                onChange={(e) => setFields((f) => ({ ...f, year: e.target.value }))}
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white tabular-nums focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.year && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.year}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Currency *
              </label>
              <select
                value={fields.currency}
                onChange={(e) => setFields((f) => ({ ...f, currency: e.target.value }))}
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Price *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={fields.price}
                onChange={(e) => setFields((f) => ({ ...f, price: e.target.value }))}
                placeholder="e.g. 95000000"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white tabular-nums placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.price && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Mileage (km) *
              </label>
              <input
                type="number"
                min="0"
                value={fields.mileage}
                onChange={(e) => setFields((f) => ({ ...f, mileage: e.target.value }))}
                placeholder="e.g. 12400"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white tabular-nums placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.mileage && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.mileage}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Top Speed (km/h) *
              </label>
              <input
                type="number"
                min="1"
                value={fields.top_speed_kph}
                onChange={(e) => setFields((f) => ({ ...f, top_speed_kph: e.target.value }))}
                placeholder="e.g. 322"
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white tabular-nums placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
              {fieldErrors.top_speed_kph && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.top_speed_kph}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                Status
              </label>
              <select
                value={fields.status}
                onChange={(e) =>
                  setFields((f) => ({ ...f, status: e.target.value as CarStatus }))
                }
                className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
              >
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-white">Published on site</span>
                <input
                  type="checkbox"
                  checked={fields.is_published}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, is_published: e.target.checked }))
                  }
                  className="w-5 h-5 accent-[#EDA966] rounded"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
              Description
            </label>
            <textarea
              rows={4}
              maxLength={3000}
              value={fields.description}
              onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
              placeholder="Battery condition, range, trim highlights, and key equipment..."
              className="w-full p-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
            />
            {fieldErrors.description && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelForm}
              className="min-h-[46px] px-6 rounded-full bg-[#252628] text-white text-sm font-bold hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-7 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingCar ? 'Save Changes' : 'Save Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1 tabular-nums">
            {cars.length} {cars.length === 1 ? 'vehicle' : 'vehicles'} total
          </p>
          <h1 className="font-ev-display text-2xl sm:text-3xl text-white">Your Cars</h1>
        </div>
        <button
          type="button"
          onClick={onOpenNew}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Car</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-[#C9CFD8]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by make, model, or year"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-full bg-[#1E1F22] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/50 focus:outline-none focus:border-[#EDA966]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'available', label: 'Available' },
              { id: 'sold', label: 'Sold' },
              { id: 'unpublished', label: 'Unpublished' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[40px] px-4 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-[#EDA966] text-[#05080F]'
                  : 'bg-[#1E1F22] text-[#C9CFD8] hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {listError && (
        <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
          {listError}
        </div>
      )}

      {/* Vehicle List */}
      <div className="bg-[#1E1F22] rounded-[28px] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-[#C9CFD8]">
              {cars.length === 0
                ? 'No vehicles added yet. Click "Add Car" to publish your first EV.'
                : 'No vehicles match your current search or filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredCars.map((car) => {
              const busy = actionBusyId === car.id;
              return (
                <div
                  key={car.id}
                  className="p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-14 rounded-xl bg-white overflow-hidden shrink-0">
                      <CarImage
                        src={car.car_images?.[0]?.image_url}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {car.make} {car.model}
                      </h3>
                      <p className="text-xs text-[#C9CFD8]/75 tabular-nums">
                        {car.year} · {formatMileage(car.mileage)} · {formatSpeed(car.top_speed_kph)}
                      </p>
                      <p className="text-sm font-extrabold text-[#EDA966] tabular-nums mt-0.5 lg:hidden">
                        {formatPrice(car.price, car.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                    <span className="hidden lg:inline-block text-sm font-extrabold text-white tabular-nums mr-2">
                      {formatPrice(car.price, car.currency)}
                    </span>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleStatus(car)}
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                        car.status === 'sold'
                          ? 'bg-[#252628] text-[#C9CFD8] hover:bg-white/15'
                          : 'bg-[#EDA966] text-[#05080F] hover:bg-[#f2b87e]'
                      }`}
                    >
                      {car.status === 'sold' ? 'Sold' : 'Available'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTogglePublished(car)}
                      title={car.is_published ? 'Click to unpublish' : 'Click to publish'}
                      className={`inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                        car.is_published
                          ? 'border-white/15 text-white hover:bg-white/10'
                          : 'border-white/10 text-[#C9CFD8]/60 hover:text-white'
                      }`}
                    >
                      {car.is_published ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Unpublished</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEdit(car)}
                      aria-label={`Edit ${car.make} ${car.model}`}
                      className="w-9 h-9 rounded-full bg-[#252628] text-white hover:bg-[#EDA966] hover:text-[#05080F] flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(car)}
                      aria-label={`Delete ${car.make} ${car.model}`}
                      className="w-9 h-9 rounded-full bg-[#252628] text-[#C9CFD8] hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#1E1F22] rounded-[28px] p-6 sm:p-8 max-w-md w-full border border-white/10 space-y-5">
            <h2 id="delete-modal-title" className="text-lg font-bold text-white">
              Delete Vehicle?
            </h2>
            <p className="text-sm text-[#C9CFD8] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-white">
                {deleteTarget.year} {deleteTarget.make} {deleteTarget.model}
              </span>
              ? This will remove the listing and its uploaded photos.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-5 rounded-full bg-[#252628] text-white text-sm font-bold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-60 transition-colors"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
