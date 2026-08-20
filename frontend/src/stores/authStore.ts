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
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
}

function profileToUser(profile: Record<string, unknown>, email: string): User {
  return {
    id: profile.id as string,
    name: (profile.name as string) || (email?.split('@')[0] ?? 'User'),
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ currentUser: null, isAuthenticated: false });
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (profile) {
      set({
        currentUser: profileToUser(profile as Record<string, unknown>, session.user.email ?? ''),
        isAuthenticated: true,
      });
    }
  },

  loginWithCredentials: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profile) {
      set({
        currentUser: profileToUser(profile as Record<string, unknown>, data.user.email ?? ''),
        isAuthenticated: true,
        loginModalOpen: false,
      });
    }
    return true;
  },

  register: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Sign up failed.' };
    // Profile is auto-created by trigger; fetch it
    await new Promise(r => setTimeout(r, 500));
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profile) {
      set({
        currentUser: profileToUser(profile as Record<string, unknown>, data.user.email ?? ''),
        isAuthenticated: true,
        loginModalOpen: false,
      });
    }
    return { ok: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, isAuthenticated: false });
  },
}));

// Listen to auth changes (tab switches, token refresh, etc.)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({ currentUser: null, isAuthenticated: false });
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    await useAuthStore.getState().loadCurrentUser();
  }
});
