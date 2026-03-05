'use client';

import { useState } from 'react';
import { Check, Loader2, Sparkles, Zap, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FEATURES = [
    'Unlimited AI Generations',
    'Advanced Element Editor',
    'Export to React/Next.js Code',
    'Priority Support',
    'Custom Themes',
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        if (!user) {
            toast.error('Please sign in to upgrade');
            return;
        }

        // Guard against double-clicks
        if (loading) return;

        setLoading(true);

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_cart: [{ product_id: process.env.NEXT_PUBLIC_DODO_PRODUCT_ID!, quantity: 1 }],
                    customer: { email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || 'User' },
                    metadata: { user_id: user.id },
                }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${res.status}`);
            }

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.checkout_url) {
                // Redirect user to Dodo Payments hosted checkout
                window.location.href = data.checkout_url;
            } else {
                throw new Error('Failed to get checkout URL');
            }
        } catch (error: any) {
            console.error('Upgrade error:', error);
            toast.error(error.message || 'Failed to initiate upgrade');
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-background">
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-br from-violet-600 to-blue-600 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 translate-x-8 -translate-y-8 opacity-20 pointer-events-none">
                        <Sparkles className="w-32 h-32 text-white" />
                    </div>

                    <DialogHeader className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 w-fit">
                            <Zap className="w-3 h-3 fill-white" />
                            Limited Time Offer
                        </div>
                        <DialogTitle className="text-3xl font-black text-white">
                            mockIt Pro
                        </DialogTitle>
                        <DialogDescription className="text-violet-100 text-base">
                            Supercharge your design workflow with AI.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Feature list */}
                    <ul className="space-y-3">
                        {FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                </span>
                                <span className="text-sm text-foreground/80 font-medium">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* Pricing + CTA */}
                    <div className="pt-4 border-t border-border">
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <span className="text-4xl font-black text-foreground">₹499</span>
                                <span className="text-muted-foreground ml-2">/ lifetime</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground line-through block">
                                    ₹1,999
                                </span>
                                <span className="text-xs font-bold text-emerald-500">75% OFF</span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
                            onClick={handleUpgrade}
                            disabled={loading}
                            aria-busy={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Upgrade Now'
                            )}
                        </Button>

                        <p className="text-[10px] text-muted-foreground text-center mt-4">
                            Secure payment via Dodo Payments.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}