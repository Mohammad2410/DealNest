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

async function ensureProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<User> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      return profileToUser(profile as Record<string, unknown>, authUser.email || '', authUser.user_metadata?.name as string);
    }

    // Try to insert profile if missing
    const newProfile = {
      id: authUser.id,
      name: (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || 'User',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
      location: 'Dhaka',
    };
    await supabase.from('profiles').upsert(newProfile);
  } catch (err) {
    console.warn('Could not fetch or insert profile, using fallback auth data:', err);
  }
  return fallbackUserFromAuth(authUser);
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
      const user = await ensureProfile(session.user);
      set({ currentUser: user, isAuthenticated: true });
    } catch (err) {
      console.error('Error loading current user:', err);
      set({ currentUser: null, isAuthenticated: false });
    }
  },

  loginWithCredentials: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        return { ok: false, error: error.message };
      }
      if (!data.user) {
        return { ok: false, error: 'No user returned from login.' };
      }

      const user = await ensureProfile(data.user);
      set({
        currentUser: user,
        isAuthenticated: true,
        loginModalOpen: false,
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'An unexpected error occurred during login.' };
    }
  },

  register: async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (!data.user) {
        return { ok: false, error: 'Registration failed. Please check your details and try again.' };
      }

      // Check if session was created (if email confirmation is on, session will be null)
      if (!data.session) {
        return {
          ok: false,
          error: 'Registration succeeded! Please check your email inbox to confirm your account, or disable "Confirm Email" in your Supabase dashboard.',
        };
      }

      const user = await ensureProfile(data.user);
      set({
        currentUser: user,
        isAuthenticated: true,
        loginModalOpen: false,
      });
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

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({ currentUser: null, isAuthenticated: false });
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    const user = await ensureProfile(session.user);
    useAuthStore.setState({ currentUser: user, isAuthenticated: true });
  }
});
