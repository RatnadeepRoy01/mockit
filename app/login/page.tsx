'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { signInWithGoogle, loading, setLoading } = useAuthStore();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            toast.error(error.message || 'Failed to sign in with Google');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-[400px]"
            >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-foreground">
                        <Sparkles className="w-5 h-5 text-background" />
                    </div>
                </div>

                <Card className="shadow-md">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl font-semibold tracking-tight">
                            Welcome to mockIt
                        </CardTitle>
                        <CardDescription>
                            Sign in to start generating UI with AI
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Google Button */}
                        <Button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            variant="outline"
                            className="w-full h-10 font-medium gap-3"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>

                        <Separator />

                        <p className="text-center text-xs text-muted-foreground leading-relaxed">
                            By continuing, you agree to our{' '}
                            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
                                Terms of Service
                            </span>{' '}
                            and{' '}
                            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
                                Privacy Policy
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground/40 mt-4">
                    Secured by Supabase
                </p>
            </motion.div>
        </div>
    );
}