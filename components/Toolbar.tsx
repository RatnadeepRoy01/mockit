'use client';

import { Sun, Moon, Menu, LayoutGrid, ChevronDown, ZoomIn, ZoomOut, Maximize, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={`w-56 p-2 rounded-xl ${isDark ? 'border-white/5 bg-[#1e1e2e] text-white' : 'border-black/5 bg-white text-black shadow-lg'}`}>
                            <div className="flex items-center gap-2 mb-3 mt-1 px-1">
                                {user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className={`w-8 h-8 rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'}`} alt="" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#ff6b35] to-[#f7c59f] flex items-center justify-center font-bold text-[#1a0a00]">
                                        {user.email?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-sm font-semibold truncate leading-tight ${isDark ? 'text-white/90' : 'text-black/90'}`}>
                                        {user.user_metadata?.full_name || user.email}
                                    </span>
                                    <span className={`text-[11px] truncate ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                                        {user.email}
                                    </span>
                                </div>
                            </div>

                            <DropdownMenuSeparator className={isDark ? 'bg-white/5 my-2' : 'bg-black/5 my-2'} />

                            <div className="px-1 py-1 flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-black/70'}`}>Credits</span>
                                <Badge variant="secondary" className={`px-2 py-0 h-5 font-mono text-[10px] bg-violet-500/10 border-violet-500/20 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                                    {useAuthStore.getState().profile?.credits ?? 0}
                                </Badge>
                            </div>

                            <DropdownMenuSeparator className={isDark ? 'bg-white/5 my-2' : 'bg-black/5 my-2'} />

                            <DropdownMenuItem
                                className={`cursor-pointer text-xs justify-center font-medium rounded-lg ${isDark ? 'text-red-400 focus:text-red-300 focus:bg-red-500/10' : 'text-red-500 focus:text-red-600 focus:bg-red-500/10'}`}
                                onClick={() => signOut()}
                            >
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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