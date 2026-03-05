'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { setSession, setUser, setLoading, syncProfile } = useAuthStore();

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                syncProfile(session.user);
            }
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                syncProfile(session.user);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [setSession, setUser, setLoading, syncProfile]);

    return <>{children}</>;
};
