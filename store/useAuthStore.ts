import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  plan: 'free' | 'pro';
  credits: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncProfile: (user: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/callback` : undefined,
      },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  syncProfile: async (user: User) => {
    if (!user) return;

    try {
      // First try to get the profile to see the current plan
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: user.user_metadata.avatar_url,
          updated_at: new Date().toISOString(),
          // Don't overwrite plan if it exists
          plan: existingProfile?.plan || 'free',
          credits: existingProfile?.credits ?? 100,
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error syncing profile:', error.message);
      } else if (data) {
        set({ profile: data as Profile });
      }
    } catch (err) {
      console.error('Unexpected error during profile sync:', err);
    }
  },
}));