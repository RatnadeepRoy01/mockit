'use client';

import { Sun, Moon, Menu, LayoutGrid, ChevronDown, ZoomIn, ZoomOut, Maximize, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

export default function Toolbar({ onToggleChat }: { onToggleChat?: () => void }) {
    const canvasZoom = useAppStore(state => state.canvasZoom);
    const setCanvasZoom = useAppStore(state => state.setCanvasZoom);
    const setCanvasOffset = useAppStore(state => state.setCanvasOffset);
    const theme = useAppStore(state => state.theme);
    const toggleTheme = useAppStore(state => state.toggleTheme);
    const screens = useAppStore(state => state.screens);
    const selectedScreenId = useAppStore(state => state.selectedScreenId);
    const isProjectSidebarOpen = useAppStore(state => state.isProjectSidebarOpen);
    const setIsProjectSidebarOpen = useAppStore(state => state.setIsProjectSidebarOpen);

    const { user, loading, signOut } = useAuthStore();
    const router = useRouter();
    const isDark = theme === 'dark';

    const resetView = () => {
        setCanvasZoom(0.5);
        setCanvasOffset({ x: 0, y: 0 });
    };

    const btn = (onClick: () => void, children: React.ReactNode, tip: string, className?: string) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    className={className}
                    style={{
                        width: 30, height: 30, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
                        transition: 'color 0.12s, background 0.12s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
                        (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    }}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{tip}</TooltipContent>
        </Tooltip>
    );

    return (
        <header style={{
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            background: isDark ? '#0a0a0f' : '#F0F0F0',
            flexShrink: 0,
            zIndex: 30,
            position: 'relative',
        }}>
            {/* LEFT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {btn(() => setIsProjectSidebarOpen(!isProjectSidebarOpen), <Menu size={15} />, 'Projects')}

                <div style={{ width: 1, height: 16, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {/* Wordmark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
                    <div style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: '#1a0a00',
                    }}>
                        M
                    </div>
                    <span className="hidden xs:inline-block" style={{
                        fontSize: 13, fontWeight: 700,
                        color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.82)',
                        letterSpacing: '-0.02em',
                    }}>
                        mockIt
                    </span>
                </div>

                <div className="hidden sm:block" style={{ width: 1, height: 16, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {/* Screen count - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-5 text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)' }}>
                    <LayoutGrid size={11} />
                    <span>{screens.length}</span>
                    {selectedScreenId && (
                        <>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span style={{ color: isDark ? 'rgba(255,165,100,0.7)' : 'rgba(200,80,0,0.7)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {screens.find(s => s.id === selectedScreenId)?.id}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Mobile Chat Toggle */}
                {onToggleChat && btn(onToggleChat, <MessageSquare size={14} />, 'Toggle Chat', 'md:hidden')}

                <div className="hidden md:block" style={{ width: 1, height: 16, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {btn(toggleTheme, isDark ? <Sun size={14} /> : <Moon size={14} />, isDark ? 'Light' : 'Dark')}

                <div style={{ width: 1, height: 16, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {loading ? (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,107,53,0.2)', borderTopColor: '#ff6b35', animation: 'spin 0.6s linear infinite' }} />
                ) : user ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                                padding: '2px 6px 2px 3px', borderRadius: 20,
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                            }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: '50%', overflow: 'hidden',
                                    background: 'linear-gradient(135deg, #ff6b35, #f7c59f)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    {user.user_metadata?.avatar_url
                                        ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: 7, fontWeight: 800, color: '#1a0a00', textTransform: 'uppercase' }}>{user.email?.[0]}</span>
                                    }
                                </div>
                                <span className="hidden xs:inline-block" style={{ fontSize: 10, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                </span>
                                <ChevronDown size={8} style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', flexShrink: 0 }} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="p-3 flex flex-col gap-2" style={{ minWidth: 150 }}>
                            <div className="flex items-center gap-2">
                                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="w-5 h-5 rounded-full" alt="" />}
                                <span className="text-xs font-semibold">{user.user_metadata?.full_name || user.email}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                            <Separator />
                            <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-red-500 hover:text-red-400" onClick={() => signOut()}>
                                Sign Out
                            </Button>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={() => router.push('/login')}
                        style={{
                            height: 26, padding: '0 12px', borderRadius: 6,
                            background: 'linear-gradient(135deg, #ff6b35, #e8520a)',
                            border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            color: 'white', letterSpacing: '0.01em',
                        }}
                    >
                        Sign In
                    </button>
                )}
            </div>
        </header>
    );
}