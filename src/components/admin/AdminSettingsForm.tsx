import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { siteSettingsSchema } from '../../lib/validation';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_BYTES,
  extractCarImagesStoragePath,
  generateRandomUuid,
  getSafeImageExtension,
  resizeImageToMaxBounds,
} from '../../lib/imageUtils';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { OwnerAvatar } from '../OwnerAvatar';

interface SettingsFormState {
  business_name: string;
  tagline: string;
  owner_name: string;
  owner_title: string;
  about: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  tiktok_handle: string;
  location: string;
}

export function AdminSettingsForm() {
  const { settings, loading, refreshSettings } = useSiteSettings();
  const [form, setForm] = useState<SettingsFormState>({
    business_name: '',
    tagline: '',
    owner_name: '',
    owner_title: '',
    about: '',
    whatsapp_number: '',
    phone: '',
    email: '',
    tiktok_handle: '',
    location: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Owner photo state
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadStage, setPhotoUploadStage] = useState<string>('');
  const [photoRemoving, setPhotoRemoving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name ?? '',
        tagline: settings.tagline ?? '',
        owner_name: settings.owner_name ?? '',
        owner_title: settings.owner_title ?? '',
        about: settings.about ?? '',
        whatsapp_number: settings.whatsapp_number ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        tiktok_handle: settings.tiktok_handle ?? '',
        location: settings.location ?? '',
      });
    }
  }, [settings]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  const clearPendingPhoto = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingPhotoFile(null);
    setPendingPreviewUrl(null);
  };

  const handlePhotoSelect = (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      setPhotoError('Only JPG, PNG, and WebP images are supported.');
      return;
    }

    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setPhotoError('Photo must be 5 MB or smaller.');
      return;
    }

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingPhotoFile(file);
    setPendingPreviewUrl(previewUrl);
  };

  const handleUploadOwnerPhoto = async () => {
    if (!supabase || !pendingPhotoFile) return;

    setPhotoUploading(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    const oldStoragePath = extractCarImagesStoragePath(settings?.owner_photo_url);

    try {
      setPhotoUploadStage('Resizing image...');
      const resizedBlob = await resizeImageToMaxBounds(pendingPhotoFile, 800, 800);

      setPhotoUploadStage('Uploading photo...');
      const ext = getSafeImageExtension(pendingPhotoFile);
      const filePath = `owner/${generateRandomUuid()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(filePath, resizedBlob, {
          contentType: ALLOWED_IMAGE_MIME_TYPES.has(pendingPhotoFile.type)
            ? pendingPhotoFile.type
            : 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error('upload_failed');
      }

      const { data: publicData } = supabase.storage
        .from('car-images')
        .getPublicUrl(filePath);

      setPhotoUploadStage('Saving settings...');
      if (settings?.id) {
        const { error: updateErr } = await supabase
          .from('site_settings')
          .update({ owner_photo_url: publicData.publicUrl })
          .eq('id', settings.id);

        if (updateErr) {
          await supabase.storage.from('car-images').remove([filePath]);
          throw new Error('save_failed');
        }
      } else {
        const { error: insertErr } = await supabase
          .from('site_settings')
          .insert({ owner_photo_url: publicData.publicUrl });

        if (insertErr) {
          await supabase.storage.from('car-images').remove([filePath]);
          throw new Error('save_failed');
        }
      }

      if (oldStoragePath && oldStoragePath !== filePath) {
        await supabase.storage.from('car-images').remove([oldStoragePath]);
      }

      clearPendingPhoto();
      await refreshSettings();
      setPhotoSuccess('Owner photo updated.');
    } catch {
      setPhotoError('Something went wrong, please try again.');
    } finally {
      setPhotoUploading(false);
      setPhotoUploadStage('');
    }
  };

  const handleConfirmRemovePhoto = async () => {
    if (!supabase || !settings?.id) return;

    setPhotoRemoving(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    const oldStoragePath = extractCarImagesStoragePath(settings.owner_photo_url);

    try {
      const { error: updateErr } = await supabase
        .from('site_settings')
        .update({ owner_photo_url: null })
        .eq('id', settings.id);

      if (updateErr) {
        throw new Error('remove_failed');
      }

      if (oldStoragePath) {
        await supabase.storage.from('car-images').remove([oldStoragePath]);
      }

      setRemoveConfirmOpen(false);
      await refreshSettings();
      setPhotoSuccess('Owner photo removed.');
    } catch {
      setPhotoError('Something went wrong, please try again.');
    } finally {
      setPhotoRemoving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setError(null);
    setSavedNotice(false);
    setFieldErrors({});

    const parsed = siteSettingsSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setError(parsed.error.issues[0]?.message || 'Please check the highlighted fields.');
      return;
    }

    setSaving(true);

    try {
      if (settings?.id) {
        const { error: updateErr } = await supabase
          .from('site_settings')
          .update(parsed.data)
          .eq('id', settings.id);
        if (updateErr) throw new Error('save_failed');
      } else {
        const { error: insertErr } = await supabase.from('site_settings').insert(parsed.data);
        if (insertErr) throw new Error('save_failed');
      }

      await refreshSettings();
      setSavedNotice(true);
    } catch {
      setError('Something went wrong, please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasCurrentPhoto = Boolean(settings?.owner_photo_url);
  const photoBusy = photoUploading || photoRemoving;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966] mb-1">
          Public Website Content
        </p>
        <h1 className="font-ev-display text-2xl sm:text-3xl text-white">Site Settings</h1>
      </div>

      {loading ? (
        <div className="bg-[#1E1F22] rounded-[28px] p-8 border border-white/[0.06] animate-pulse space-y-4">
          <div className="h-10 w-1/2 bg-white/10 rounded" />
          <div className="h-32 w-full bg-white/10 rounded" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* OWNER PHOTO SECTION */}
          <section className="bg-[#1E1F22] rounded-[28px] p-5 sm:p-8 border border-white/[0.06] space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Owner Photo</h2>
              <p className="text-xs text-[#C9CFD8]/75 mt-1">
                Shown in the About the Owner section on the public site. JPG, PNG, or WebP up to 5 MB (automatically resized to max 800 × 800).
              </p>
            </div>

            {photoError && (
              <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                {photoError}
              </div>
            )}

            {photoSuccess && (
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{photoSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Current Round Preview */}
              <div className="flex items-center gap-4">
                <OwnerAvatar
                  src={settings?.owner_photo_url}
                  ownerName={settings?.owner_name}
                  shape="round"
                  className="w-24 h-24"
                  iconClassName="w-10 h-10"
                />
                <div className="sm:hidden">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C9CFD8]/70">
                    Current Photo
                  </p>
                  <p className="text-xs text-[#C9CFD8] mt-0.5">
                    {hasCurrentPhoto ? 'Active on public site' : 'Default icon shown'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handlePhotoSelect(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  <span>{hasCurrentPhoto ? 'Change photo' : 'Upload photo'}</span>
                </button>

                {hasCurrentPhoto && (
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => setRemoveConfirmOpen(true)}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-[#252628] text-[#C9CFD8] hover:bg-red-600 hover:text-white text-sm font-bold disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Square Preview Before Uploading */}
            {pendingPreviewUrl && pendingPhotoFile && (
              <div className="rounded-[22px] bg-[#252628] border border-[#EDA966]/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#1E1F22] border border-white/10 shrink-0">
                    <img
                      src={pendingPreviewUrl}
                      alt="Selected owner photo preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#EDA966]">
                      Preview Before Upload
                    </p>
                    <p className="text-sm font-semibold text-white">
                      Ready to resize and upload
                    </p>
                    <p className="text-xs text-[#C9CFD8]/75">
                      Will be resized to max 800 × 800 px and saved to your public profile.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={clearPendingPhoto}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 rounded-full bg-[#1E1F22] text-white text-xs font-bold hover:bg-white/15 disabled:opacity-60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => void handleUploadOwnerPhoto()}
                    className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-xs font-bold hover:bg-[#f2b87e] disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {photoUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {photoUploading ? photoUploadStage || 'Uploading...' : 'Confirm & Upload'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SITE SETTINGS FORM */}
          <form
            onSubmit={(e) => void handleSave(e)}
            noValidate
            className="bg-[#1E1F22] rounded-[28px] p-5 sm:p-8 border border-white/[0.06] space-y-6"
          >
            {error && (
              <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {savedNotice && (
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Site settings updated and live on the public website.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.business_name}
                  onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                  placeholder="Platinum EV Global"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.business_name && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.business_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Tagline *
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  placeholder="Electric Mobility."
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.tagline && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.tagline}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.owner_name}
                  onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                  placeholder="Sarah Ofure"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.owner_name && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.owner_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Owner Title
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.owner_title}
                  onChange={(e) => setForm((f) => ({ ...f, owner_title: e.target.value }))}
                  placeholder="Sales Consultant / Founder"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.owner_title && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.owner_title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  WhatsApp Number (digits only with country code)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.whatsapp_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whatsapp_number: e.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="2349052272072"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white tabular-nums focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.whatsapp_number && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.whatsapp_number}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Display Phone
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+234 905 227 2072"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.phone && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.email && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  TikTok Handle
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.tiktok_handle}
                  onChange={(e) => setForm((f) => ({ ...f, tiktok_handle: e.target.value }))}
                  placeholder="@platinumevabuja"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.tiktok_handle && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.tiktok_handle}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Abuja, Nigeria"
                  className="w-full min-h-[46px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.location && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.location}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2">
                  About the Owner
                </label>
                <textarea
                  rows={5}
                  maxLength={5000}
                  value={form.about}
                  onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                  placeholder="Tell buyers about Platinum EV Global..."
                  className="w-full p-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EDA966]"
                />
                {fieldErrors.about && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.about}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Remove Photo Confirmation Modal */}
      {removeConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-owner-photo-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#1E1F22] rounded-[28px] p-6 sm:p-8 max-w-md w-full border border-white/10 space-y-5">
            <h2 id="remove-owner-photo-title" className="text-lg font-bold text-white">
              Remove Owner Photo?
            </h2>
            <p className="text-sm text-[#C9CFD8] leading-relaxed">
              This will delete the current owner photo from storage and restore the default icon
              on the public website.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={photoRemoving}
                onClick={() => setRemoveConfirmOpen(false)}
                className="min-h-[44px] px-5 rounded-full bg-[#252628] text-white text-sm font-bold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={photoRemoving}
                onClick={() => void handleConfirmRemovePhoto()}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-60 transition-colors"
              >
                {photoRemoving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
