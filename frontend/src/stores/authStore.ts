import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../utils/supabase/client';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loginModalOpen: boolean;
  loginRedirectPath: string | null;
  openLoginModal: (redirectPath?: string) => void;
  closeLoginModal: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
}

function timeoutPromise<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function fallbackUserFromAuth(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const name = (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || 'User';
  return {
    id: authUser.id,
    name,
    avatar: (authUser.user_metadata?.avatar_url as string) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
    email: authUser.email || '',
    location: 'Dhaka',
    joinedAt: new Date().toISOString(),
    rating: 5,
    reviewCount: 0,
    completedTransactions: 0,
  };
}

function profileToUser(profile: Record<string, unknown>, email: string, fallbackName?: string): User {
  return {
    id: profile.id as string,
    name: (profile.name as string) || fallbackName || (email ? email.split('@')[0] : 'User'),
    avatar: (profile.avatar_url as string) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
    email,
    phone: profile.phone as string | undefined,
    location: (profile.location as string) || 'Dhaka',
    joinedAt: (profile.created_at as string) || new Date().toISOString(),
    rating: Number(profile.rating) || 5,
    reviewCount: Number(profile.review_count) || 0,
    completedTransactions: Number(profile.completed_transactions) || 0,
    bio: profile.bio as string | undefined,
  };
}

async function fetchProfileBackground(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  try {
    const fetchPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const { data: profile } = await timeoutPromise(fetchPromise, 2500, { data: null, error: null });

    if (profile) {
      const fullUser = profileToUser(profile as Record<string, unknown>, authUser.email || '', authUser.user_metadata?.name as string);
      useAuthStore.setState({ currentUser: fullUser, isAuthenticated: true });
      return;
    }

    // Try background upsert if profile row wasn't present
    const newProfile = {
      id: authUser.id,
      name: (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || 'User',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
      location: 'Dhaka',
    };
    supabase.from('profiles').upsert(newProfile).then(() => {});
  } catch (err) {
    console.warn('Background profile sync notice:', err);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  loginModalOpen: false,
  loginRedirectPath: null,

  openLoginModal: (redirectPath) =>
    set({ loginModalOpen: true, loginRedirectPath: redirectPath || null }),

  closeLoginModal: () =>
    set({ loginModalOpen: false, loginRedirectPath: null }),

  loadCurrentUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ currentUser: null, isAuthenticated: false });
        return;
      }
      // Instant display with auth user
      const instantUser = fallbackUserFromAuth(session.user);
      set({ currentUser: instantUser, isAuthenticated: true });

      // Background profile sync
      fetchProfileBackground(session.user);
    } catch (err) {
      console.error('Error loading current user:', err);
      set({ currentUser: null, isAuthenticated: false });
    }
  },

  loginWithCredentials: async (email, password) => {
    try {
      const loginCall = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // 10 second timeout guard
      const response = await Promise.race([
        loginCall,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 10000)),
      ]);

      const { data, error } = response;
      if (error) {
        return { ok: false, error: error.message };
      }
      if (!data?.user) {
        return { ok: false, error: 'No user returned from login.' };
      }

      // Instant login transition
      const instantUser = fallbackUserFromAuth(data.user);
      set({
        currentUser: instantUser,
        isAuthenticated: true,
        loginModalOpen: false,
      });

      // Sync full profile in background
      fetchProfileBackground(data.user);

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'An unexpected error occurred during login.' };
    }
  },

  register: async (name, email, password) => {
    try {
      const registerCall = supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      const response = await Promise.race([
        registerCall,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 10000)),
      ]);

      const { data, error } = response;
      if (error) {
        return { ok: false, error: error.message };
      }

      if (!data?.user) {
        return { ok: false, error: 'Registration failed. Please try again.' };
      }

      // If email confirmation is required by Supabase project settings
      if (!data.session) {
        return {
          ok: false,
          error: 'Account created! Please check your email to confirm, or turn off "Confirm email" in Supabase settings for instant login.',
        };
      }

      // Instant state update
      const instantUser = fallbackUserFromAuth(data.user);
      set({
        currentUser: instantUser,
        isAuthenticated: true,
        loginModalOpen: false,
      });

      fetchProfileBackground(data.user);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Registration failed.' };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      set({ currentUser: null, isAuthenticated: false });
    }
  },
}));

// Listen to auth state changes smoothly
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({ currentUser: null, isAuthenticated: false });
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    const instantUser = fallbackUserFromAuth(session.user);
    useAuthStore.setState({ currentUser: instantUser, isAuthenticated: true });
    fetchProfileBackground(session.user);
  }
});
