import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import {
  CarFront,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import type { CarWithImages } from '../types/database';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchAllCarsForAdmin } from '../lib/carsApi';
import { loginSchema } from '../lib/validation';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { BrandLogo } from '../components/BrandLogo';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminCarsManager } from '../components/admin/AdminCarsManager';
import { AdminSettingsForm } from '../components/admin/AdminSettingsForm';

type AdminTab = 'overview' | 'cars' | 'settings';

export function AdminPage() {
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const previousContent = existing?.getAttribute('content') ?? null;
    const meta = existing ?? document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    if (!existing) {
      document.head.appendChild(meta);
    }

    return () => {
      if (existing) {
        if (previousContent !== null) {
          existing.setAttribute('content', previousContent);
        } else {
          existing.removeAttribute('content');
        }
      } else {
        meta.remove();
      }
    };
  }, []);

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [cars, setCars] = useState<CarWithImages[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [carsError, setCarsError] = useState<string | null>(null);
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarWithImages | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const requestCounterRef = useRef(0);

  const verifyAdminAccess = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    const requestId = ++requestCounterRef.current;
    setAuthLoading(true);
    setVerifyError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (requestId !== requestCounterRef.current) return;

      if (sessionError) {
        setVerifyError('Something went wrong, please try again.');
        return;
      }

      if (!sessionData.session) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (requestId !== requestCounterRef.current) return;

      if (userError || !userData.user) {
        setVerifyError('Something went wrong, please try again.');
        return;
      }

      setUser(userData.user);

      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('id, user_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (requestId !== requestCounterRef.current) return;

      if (adminError) {
        setVerifyError('Something went wrong, please try again.');
        return;
      }

      setIsAdmin(Boolean(adminRow));
    } catch {
      if (requestId !== requestCounterRef.current) return;
      setVerifyError('Something went wrong, please try again.');
    } finally {
      if (requestId === requestCounterRef.current) {
        setAuthLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void verifyAdminAccess();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        requestCounterRef.current += 1;
        setUser(null);
        setIsAdmin(false);
        setVerifyError(null);
        setCars([]);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void verifyAdminAccess();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [verifyAdminAccess]);

  const loadAdminCars = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setCarsLoading(true);
    setCarsError(null);
    try {
      const data = await fetchAllCarsForAdmin();
      setCars(data);
    } catch {
      setCarsError('Something went wrong, please try again.');
    } finally {
      setCarsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && !verifyError) {
      void loadAdminCars();
    }
  }, [isAdmin, verifyError, loadAdminCars]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setLoginError(parsed.error.issues[0]?.message || 'Enter a valid email and password.');
      return;
    }

    setSigningIn(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        setLoginError('Invalid email or password. Please try again.');
      }
    } catch {
      setLoginError('Something went wrong, please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const businessName = settings?.business_name?.trim() || 'Platinum EV Global';

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#1E1F22] rounded-[28px] p-8 sm:p-10 max-w-md w-full border border-white/10 text-center space-y-5">
          <BrandLogo variant="full" businessName={businessName} className="mx-auto max-w-[190px]" />
          <h1 className="font-ev-display text-xl text-white">Supabase Required</h1>
          <p className="text-sm text-[#C9CFD8]">
            Set <code className="text-[#EDA966]">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-[#EDA966]">VITE_SUPABASE_ANON_KEY</code> to sign in to the admin
            dashboard.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#1E1F22] rounded-[28px] p-8 sm:p-10 max-w-sm w-full border border-white/10 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#EDA966] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#C9CFD8]">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Temporary verification error while keeping session intact
  if (user && verifyError) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#1E1F22] rounded-[28px] p-8 sm:p-10 max-w-md w-full border border-red-500/30 text-center space-y-5">
          <ShieldAlert className="w-9 h-9 text-[#EDA966] mx-auto" />
          <h1 className="text-lg font-bold text-white">Verification Issue</h1>
          <p className="text-sm text-[#C9CFD8]">{verifyError}</p>
          <p className="text-xs text-[#C9CFD8]/70">Signed in as {user.email}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void verifyAdminAccess()}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-[#252628] text-white text-sm font-bold hover:bg-white/15 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login form when no active session
  if (!user) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#1E1F22] rounded-[32px] p-6 sm:p-10 max-w-md w-full border border-white/10 space-y-7">
          <div className="text-center space-y-3">
            <BrandLogo variant="full" businessName={businessName} className="mx-auto max-w-[200px]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EDA966]">
                Owner Portal
              </p>
              <h1 className="font-ev-display text-xl sm:text-2xl text-white mt-1">Admin Sign In</h1>
            </div>
          </div>

          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
            {loginError && (
              <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-xs sm:text-sm text-red-200">
                {loginError}
              </div>
            )}

            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-[48px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#C9CFD8] mb-2"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] px-4 rounded-2xl bg-[#252628] border border-white/10 text-sm text-white placeholder:text-[#C9CFD8]/40 focus:outline-none focus:border-[#EDA966]"
              />
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[50px] rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] disabled:opacity-60 transition-colors mt-2"
            >
              {signingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{signingIn ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <Link to="/" className="text-xs font-semibold text-[#C9CFD8] hover:text-white">
              ← Return to public showroom
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but not present in admin_users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#1E1F22] rounded-[28px] p-8 sm:p-10 max-w-md w-full border border-white/10 text-center space-y-5">
          <ShieldAlert className="w-10 h-10 text-[#EDA966] mx-auto" />
          <h1 className="text-lg font-bold text-white">Access Restricted</h1>
          <p className="text-sm text-[#C9CFD8]">
            You are signed in, but you are not authorized as an admin.
          </p>
          {user.email && (
            <p className="text-xs text-[#C9CFD8]/70">Signed in as {user.email}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-[#252628] text-white text-sm font-bold hover:bg-white/15 transition-colors"
            >
              Public Site
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-[#EDA966] text-[#05080F] text-sm font-bold hover:bg-[#f2b87e] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Admin Dashboard
  const openAddCar = () => {
    setActiveTab('cars');
    setEditingCar(null);
    setCarFormOpen(true);
  };

  const openEditCar = (car: CarWithImages) => {
    setActiveTab('cars');
    setEditingCar(car);
    setCarFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#05080F] text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-72 bg-[#141518] border-b lg:border-b-0 lg:border-r border-white/10 p-5 sm:p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between lg:block">
            <Link to="/" className="inline-block">
              <BrandLogo variant="emblem" businessName="Platinum EV Admin" />
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-[#EDA966]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          <nav aria-label="Admin sections" className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setCarFormOpen(false);
              }}
              className={`flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#EDA966] text-[#05080F]'
                  : 'text-[#C9CFD8] hover:bg-[#1E1F22] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={openAddCar}
              className={`flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'cars' && carFormOpen && !editingCar
                  ? 'bg-[#EDA966] text-[#05080F]'
                  : 'text-[#C9CFD8] hover:bg-[#1E1F22] hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Car</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cars');
                setCarFormOpen(false);
                setEditingCar(null);
              }}
              className={`flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'cars' && (!carFormOpen || Boolean(editingCar))
                  ? 'bg-[#EDA966] text-[#05080F]'
                  : 'text-[#C9CFD8] hover:bg-[#1E1F22] hover:text-white'
              }`}
            >
              <CarFront className="w-4 h-4" />
              <span>All Cars</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setCarFormOpen(false);
              }}
              className={`flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-[#EDA966] text-[#05080F]'
                  : 'text-[#C9CFD8] hover:bg-[#1E1F22] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Site Settings</span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block pt-6 border-t border-white/10 space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9CFD8] hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Website</span>
          </Link>
          {user.email && (
            <p className="text-xs text-[#C9CFD8]/75 truncate" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#EDA966] hover:text-[#f2b87e] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
        {carsError && (
          <div className="mb-6 rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 flex items-center justify-between gap-4 text-sm text-red-200">
            <span>{carsError}</span>
            <button
              type="button"
              onClick={() => void loadAdminCars()}
              className="text-xs font-bold text-white underline"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <AdminOverview
            cars={cars}
            loading={carsLoading}
            onAddCar={openAddCar}
            onEditCar={openEditCar}
            onViewAllCars={() => {
              setActiveTab('cars');
              setCarFormOpen(false);
            }}
          />
        )}

        {activeTab === 'cars' && (
          <AdminCarsManager
            cars={cars}
            loading={carsLoading}
            editingCar={editingCar}
            formOpen={carFormOpen}
            onOpenNew={openAddCar}
            onOpenEdit={openEditCar}
            onCloseForm={() => {
              setCarFormOpen(false);
              setEditingCar(null);
            }}
            onRefresh={loadAdminCars}
          />
        )}

        {activeTab === 'settings' && <AdminSettingsForm />}
      </main>
    </div>
  );
}
