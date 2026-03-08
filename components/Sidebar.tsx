'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wand2, MousePointer2, Loader2, Check, Sparkles,
    AlignLeft, AlignCenter, AlignRight,
    Minus, Plus, Bold, Italic, Underline,
    RotateCcw, ArrowUp, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAppStore, type ElementStyle } from '@/store/useAppStore';
import { supabase } from '@/lib/supabaseClient';

async function callAI(projectId: string, prompt: string, screenId?: string) {
    try {
        const functionName = screenId ? 'updateDesigns' : 'generateDesigns';
        const body = screenId ? { projectId, prompt, screenId } : { projectId, prompt };
        const { data, error } = await supabase.functions.invoke(functionName, { body });
        if (error) {
            const errorBody = await error.context?.json();
            throw new Error(errorBody?.error || error.message || 'Something went wrong');
        }
        return data;
    } catch (err: any) {
        throw err;
    }
}

// ─── Prompt Panel ─────────────────────────────────────────────────────────────
function PromptPanel({ projectId }: { projectId: string }) {
    const messages = useAppStore(s => s.messages);
    const addMessage = useAppStore(s => s.addMessage);
    const isAiLoading = useAppStore(s => s.isAiLoading);
    const setIsAiLoading = useAppStore(s => s.setIsAiLoading);
    const selectedScreenId = useAppStore(s => s.selectedScreenId);
    const setSelectedScreenId = useAppStore(s => s.setSelectedScreenId);
    const screens = useAppStore(s => s.screens);
    const [trackedIds, setTrackedIds] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const selectedScreen = screens.find(s => s.id === selectedScreenId);

    useEffect(() => {
        if (isAiLoading) {
            const empty = screens.filter(s => !s.html).map(s => s.id);
            if (empty.length > 0) setTrackedIds(prev => [...prev, ...empty.filter(id => !prev.includes(id))]);
        } else {
            setTrackedIds([]);
        }
    }, [isAiLoading, screens]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const displayScreens = screens.filter(s => trackedIds.includes(s.id));

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const el = textareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
    };

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || isAiLoading || !projectId) return;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        addMessage({ role: 'user', content: text });
        setIsAiLoading(true);
        try {
            await callAI(projectId, text, selectedScreen?.id);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Insufficient credits')) addMessage({ role: 'assistant', content: 'Insufficient credits. Need at least 2 credits.' });
            else if (msg.includes('Your plan has expired')) addMessage({ role: 'assistant', content: 'Your plan has expired.' });
            else if (msg.includes('Profile not found')) addMessage({ role: 'assistant', content: 'Profile not found. Please sign out and back in.' });
            else addMessage({ role: 'assistant', content: msg || 'Failed to process request' });
            setIsAiLoading(false);
        }
    }, [input, isAiLoading, addMessage, setIsAiLoading, projectId, selectedScreen]);

    const isEmpty = messages.length === 0;

    return (
        <div className="flex-1 flex flex-col min-h-0 font-mono">
            {/* @screen chip */}
            <AnimatePresence>
                {selectedScreenId && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 pt-2.5">
                        <div className="flex items-center gap-1.5 w-fit max-w-full rounded-md px-2.5 py-1.5
                            bg-black/[0.05] dark:bg-white/[0.05]
                            border border-black/[0.09] dark:border-white/[0.09]">
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">@</span>
                            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{selectedScreen?.id}</span>
                            <button onClick={() => setSelectedScreenId(null)}
                                className="ml-1 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.2) transparent', overscrollBehavior: 'contain' }}>
                {isEmpty ? (
                    <div className="flex flex-col items-start justify-end h-full pb-2 gap-2">
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Describe what you want to build.</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Login screen with Google OAuth', 'Dashboard with sidebar nav', 'Onboarding flow, 3 steps'].map(s => (
                                <button key={s} onClick={() => setInput(s)}
                                    className="text-[11px] rounded px-2 py-1 transition-all
                                        text-zinc-500 dark:text-zinc-500
                                        bg-black/[0.05] dark:bg-white/[0.04]
                                        border border-black/[0.09] dark:border-white/[0.07]
                                        hover:text-zinc-900 dark:hover:text-zinc-100
                                        hover:border-black/[0.2] dark:hover:border-white/[0.16]">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {messages.map(msg => (
                            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-1.5">
                                <span className={`text-[10px] uppercase tracking-widest ${msg.role === 'user' ? 'text-zinc-400 dark:text-zinc-600' : 'text-violet-500/70'}`}>
                                    {msg.role === 'user' ? '› you' : '◆ mockit'}
                                </span>
                                <div className={`text-[13px] leading-relaxed pl-3 border-l ${msg.role === 'user'
                                    ? 'text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
                                    : 'text-zinc-600 dark:text-zinc-400 border-violet-400/40 dark:border-violet-500/25'}`}>
                                    {msg.content.split('\n').map((line, i, arr) => (
                                        <span key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}{i < arr.length - 1 && <br />}</span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}

                        {isAiLoading && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-violet-500/70">◆ mockit</span>
                                <div className="pl-3 border-l border-violet-400/40 dark:border-violet-500/25 space-y-1.5">
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-600">
                                        <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
                                        <span>Generating…</span>
                                    </div>
                                    {displayScreens.map(screen => (
                                        <motion.div key={screen.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-[11px]">
                                            {screen.html
                                                ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                : <Loader2 className="w-3 h-3 text-zinc-400 dark:text-zinc-600 animate-spin flex-shrink-0" />}
                                            <span className={screen.html ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-600'}>{screen.id}</span>
                                            {screen.html && <span className="text-emerald-500/50 text-[10px]">done</span>}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-black/[0.07] dark:border-white/[0.07]">
                <div className="relative rounded-xl overflow-hidden transition-colors duration-150
                    bg-black/[0.05] dark:bg-white/[0.04]
                    border border-black/[0.09] dark:border-white/[0.09]
                    focus-within:border-black/[0.2] dark:focus-within:border-white/[0.2]">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={selectedScreenId ? `Update ${selectedScreen?.id}…` : 'Describe a screen…'}
                        rows={2}
                        className="w-full bg-transparent text-[13px] font-mono leading-relaxed resize-none outline-none px-3.5 pt-3 pb-10 min-h-[72px] max-h-[160px]
                            text-zinc-800 dark:text-zinc-200
                            placeholder:text-zinc-400 dark:placeholder:text-zinc-700"
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 pointer-events-none">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-700">⏎ send · ⇧⏎ newline</span>
                        <button onClick={handleSend} disabled={!input.trim() || isAiLoading}
                            className="pointer-events-auto w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed
                                bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-white
                                text-white dark:text-zinc-900">
                            {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Editor Panel ─────────────────────────────────────────────────────────────
function EditorPanel() {
    const selectedElement = useAppStore(s => s.selectedElement);
    const setSelectedElement = useAppStore(s => s.setSelectedElement);
    const [localStyle, setLocalStyle] = useState<ElementStyle>(selectedElement?.style ?? {});
    const [localText, setLocalText] = useState(selectedElement?.textContent ?? '');

    useEffect(() => {
        if (selectedElement) {
            setLocalStyle({ ...selectedElement.style });
            setLocalText(selectedElement.textContent ?? '');
        }
    }, [selectedElement?.mkId]);

    const setStyle = (key: keyof ElementStyle, val: string) =>
        setLocalStyle(prev => ({ ...prev, [key]: val }));

    // const applyChanges = useCallback((style: ElementStyle, text: string) => {
    //     if (!selectedElement) return;
    //     const payload = { type: '__mockit_apply_style__', screenId: selectedElement.screenId, mkId: selectedElement.mkId, style, textContent: text };
    //     document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(iframe => {
    //         try { iframe.contentWindow?.postMessage(payload, '*'); } catch { }
    //     });
    // }, [selectedElement]);

    // useEffect(() => {
    //     if (selectedElement) applyChanges(localStyle, localText);
    // }, [localStyle, localText, applyChanges, selectedElement]);

    const applyChanges = useCallback((style: ElementStyle, text: string) => {
        if (!selectedElement) return;
        const payload = { type: '__mockit_apply_style__', screenId: selectedElement.screenId, mkId: selectedElement.mkId, style, textContent: text };
        document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(iframe => {
            try { iframe.contentWindow?.postMessage(payload, '*'); } catch { }
        });
    }, [selectedElement]);

    // Style changes apply instantly (sliders, toggles, etc.)
    useEffect(() => {
        if (selectedElement) applyChanges(localStyle, localText);
    }, [localStyle, applyChanges, selectedElement]);

    // Text changes debounced — avoids postMessage on every keystroke
    useEffect(() => {
        if (!selectedElement) return;
        const timer = setTimeout(() => applyChanges(localStyle, localText), 300);
        return () => clearTimeout(timer);
    }, [localText]);

    if (!selectedElement) {
        return (
            <div className="flex-1 flex flex-col justify-end p-4 pb-8 font-mono">
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-700">no element selected</p>
                    <div className="space-y-2.5">
                        {[['01', 'click cursor icon on a screen titlebar'], ['02', 'click any element on the canvas'], ['03', 'edit styles here in real-time']].map(([n, t]) => (
                            <div key={n} className="flex gap-3 text-[12px]">
                                <span className="text-zinc-300 dark:text-zinc-700 flex-shrink-0">{n}</span>
                                <span className="text-zinc-400 dark:text-zinc-500 leading-relaxed">{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const fieldCls = `h-7 rounded text-[12px] font-mono outline-none px-2 transition-colors
        bg-black/[0.06] dark:bg-white/[0.06]
        border border-black/[0.1] dark:border-white/[0.09]
        text-zinc-800 dark:text-zinc-200
        focus:border-black/[0.24] dark:focus:border-white/[0.24]`;

    const iconBtn = (active: boolean) =>
        `w-7 h-7 flex items-center justify-center rounded border transition-all ${active
            ? 'bg-violet-500/15 dark:bg-violet-500/20 border-violet-400/50 dark:border-violet-500/50 text-violet-600 dark:text-violet-300'
            : 'border-black/[0.1] dark:border-white/[0.09] text-zinc-400 dark:text-zinc-500 hover:border-black/[0.22] dark:hover:border-white/[0.22] hover:text-zinc-700 dark:hover:text-zinc-200'}`;

    return (
        <div className="flex-1 overflow-y-auto min-h-0 font-mono"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.2) transparent', overscrollBehavior: 'contain' }}>

            {/* Target element */}
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-black/[0.07] dark:border-white/[0.06]">
                <span className="text-[10px] text-violet-500/60 flex-shrink-0">◆</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 flex-shrink-0">&lt;{selectedElement.tagName}&gt;</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 truncate flex-1 min-w-0">{selectedElement.selector}</span>
                <button onClick={() => setSelectedElement(null)}
                    className="flex-shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-1">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">

                {/* Content */}
                {selectedElement.textContent !== '' && (
                    <ESection label="content">
                        <textarea
                            value={localText}
                            onChange={e => setLocalText(e.target.value)}
                            rows={2}
                            placeholder="Text content…"
                            className={`w-full rounded-md text-[12px] font-mono px-2.5 py-2 resize-none outline-none transition-colors
                                bg-black/[0.06] dark:bg-white/[0.06]
                                border border-black/[0.1] dark:border-white/[0.09]
                                text-zinc-800 dark:text-zinc-200
                                placeholder:text-zinc-400 dark:placeholder:text-zinc-700
                                focus:border-black/[0.24] dark:focus:border-white/[0.24]`}
                        />
                    </ESection>
                )}

                {/* Typography */}
                <ESection label="typography">
                    <ERow prop="font-size">
                        <div className="flex items-center gap-1">
                            <button onClick={() => { const n = parseInt(localStyle.fontSize ?? '16'); setStyle('fontSize', `${Math.max(8, n - 1)}px`); }} className={iconBtn(false)}><Minus className="w-2.5 h-2.5" /></button>
                            <input value={(localStyle.fontSize ?? '16px').replace('px', '')} onChange={e => setStyle('fontSize', `${e.target.value}px`)} className={`${fieldCls} w-10 text-center`} />
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 pl-0.5">px</span>
                            <button onClick={() => { const n = parseInt(localStyle.fontSize ?? '16'); setStyle('fontSize', `${n + 1}px`); }} className={iconBtn(false)}><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                    </ERow>

                    <ERow prop="font-weight">
                        <select value={localStyle.fontWeight ?? '400'} onChange={e => setStyle('fontWeight', e.target.value)}
                            className={`${fieldCls} w-[72px] appearance-none cursor-pointer`}>
                            {['300', '400', '500', '600', '700', '800', '900'].map(w => (
                                <option key={w} value={w} className="bg-zinc-100 dark:bg-zinc-900">{w}</option>
                            ))}
                        </select>
                    </ERow>

                    <ERow prop="style">
                        <div className="flex gap-1.5">
                            {[
                                { icon: <Bold className="w-3 h-3" />, label: 'Bold', sk: 'fontWeight', on: '700', off: '400' },
                                { icon: <Italic className="w-3 h-3" />, label: 'Italic', sk: 'fontStyle', on: 'italic', off: 'normal' },
                                { icon: <Underline className="w-3 h-3" />, label: 'Underline', sk: 'textDecoration', on: 'underline', off: 'none' },
                            ].map(({ icon, label, sk, on, off }) => {
                                const active = (localStyle as Record<string, string>)[sk] === on;
                                return (
                                    <Tooltip key={label}>
                                        <TooltipTrigger asChild>
                                            <button className={iconBtn(active)} onClick={() => setStyle(sk as keyof ElementStyle, active ? off : on)}>{icon}</button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[11px]">{label}</TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </ERow>

                    <ERow prop="text-align">
                        <div className="flex gap-1.5">
                            {[{ icon: <AlignLeft className="w-3 h-3" />, val: 'left' }, { icon: <AlignCenter className="w-3 h-3" />, val: 'center' }, { icon: <AlignRight className="w-3 h-3" />, val: 'right' }].map(({ icon, val }) => (
                                <button key={val} className={iconBtn(localStyle.textAlign === val)} onClick={() => setStyle('textAlign', val)}>{icon}</button>
                            ))}
                        </div>
                    </ERow>
                </ESection>

                {/* Colors */}
                <ESection label="colors">
                    <ERow prop="color">
                        <Swatch value={localStyle.color ?? '#000000'} onChange={v => setStyle('color', v)} />
                    </ERow>
                    <ERow prop="background">
                        <Swatch value={localStyle.backgroundColor ?? '#ffffff'} onChange={v => setStyle('backgroundColor', v)} />
                    </ERow>
                </ESection>

                {/* Shape */}
                <ESection label="shape">
                    <ERow prop="border-radius">
                        <div className="flex items-center gap-2.5 flex-1">
                            <Slider min={0} max={48} step={1}
                                value={[parseInt(localStyle.borderRadius ?? '0')]}
                                onValueChange={([v]) => setStyle('borderRadius', `${v}px`)}
                                className="flex-1 [&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:h-3" />
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600 w-8 text-right tabular-nums flex-shrink-0">{localStyle.borderRadius ?? '0px'}</span>
                        </div>
                    </ERow>
                    <ERow prop="opacity">
                        <div className="flex items-center gap-2.5 flex-1">
                            <Slider min={0} max={100} step={1}
                                value={[Math.round(parseFloat(localStyle.opacity ?? '1') * 100)]}
                                onValueChange={([v]) => setStyle('opacity', String(v / 100))}
                                className="flex-1 [&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:h-3" />
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600 w-8 text-right tabular-nums flex-shrink-0">{Math.round(parseFloat(localStyle.opacity ?? '1') * 100)}%</span>
                        </div>
                    </ERow>
                </ESection>
            </div>

            {/* Reset */}
            <div className="p-4 pb-8">
                <button
                    onClick={() => { setLocalStyle(selectedElement.style); setLocalText(selectedElement.textContent); }}
                    className="w-full h-8 flex items-center justify-center gap-2 text-[11px] font-mono rounded-md transition-all
                        text-zinc-400 dark:text-zinc-600
                        border border-black/[0.09] dark:border-white/[0.08]
                        hover:text-zinc-800 dark:hover:text-zinc-200
                        hover:border-black/[0.2] dark:hover:border-white/[0.18]">
                    <RotateCcw className="w-3 h-3" />reset to original
                </button>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ESection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 pt-4 pb-3 space-y-3">
            <p className="text-[10px] uppercase tracking-widest dark:text-zinc-200 text-zinc-850">{label}</p>
            <div className="space-y-2.5">{children}</div>
        </div>
    );
}

function ERow({ prop, children }: { prop: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 min-h-[28px]">
            <span className="text-[11px] dark:text-zinc-400  text-zinc-600 w-[88px] flex-shrink-0">{prop}</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">{children}</div>
        </div>
    );
}

function Swatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const safe = value.startsWith('#') ? value : '#7c3aed';
    return (
        <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="color" value={safe} onChange={e => onChange(e.target.value)} className="sr-only" />
            <div className="w-[18px] h-[18px] rounded-sm flex-shrink-0 border transition-colors
                border-black/[0.12] dark:border-white/[0.12]
                group-hover:border-black/[0.3] dark:group-hover:border-white/[0.3]"
                style={{ backgroundColor: value }} />
            <span className="text-[11px] transition-colors
                text-zinc-500 group-hover:text-zinc-800
                dark:text-zinc-500 dark:group-hover:text-zinc-200">
                {value}
            </span>
        </label>
    );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ projectId, onClose }: { projectId: string; onClose?: () => void }) {
    const sidebarMode = useAppStore(s => s.sidebarMode);
    const setSidebarMode = useAppStore(s => s.setSidebarMode);
    const theme = useAppStore(s => s.theme);
    const selectedElement = useAppStore(s => s.selectedElement);
    const isDark = theme === 'dark';

    return (
        <motion.div
            className={`flex flex-col w-full md:w-[340px] flex-shrink-0 h-full overflow-hidden rounded-2xl border
                ${isDark ? 'bg-[#111113] border-white/[0.06]' : 'bg-zinc-100 border-black/[0.08]'}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onWheel={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className={`px-4 pt-4 pb-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.07]'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>mockIt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedElement && sidebarMode === 'editor' && (
                            <Badge className="bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-400/30 text-[10px] hidden xs:flex">
                                Element Selected
                            </Badge>
                        )}
                        {onClose && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={onClose}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={sidebarMode} onValueChange={v => setSidebarMode(v as 'prompt' | 'editor')}>
                    <TabsList className={`w-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.06]'}`}>
                        <TabsTrigger value="prompt" className="flex-1 gap-1.5 text-xs text-zinc-500 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                            <Wand2 className="w-3.5 h-3.5" />AI Prompt
                        </TabsTrigger>
                        <TabsTrigger value="editor" className="flex-1 gap-1.5 text-xs text-zinc-500 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                            <MousePointer2 className="w-3.5 h-3.5" />Element Editor
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                    {sidebarMode === 'prompt' ? (
                        <motion.div key="prompt" className="flex-1 flex flex-col overflow-hidden min-h-0"
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }}>
                            <PromptPanel projectId={projectId} />
                        </motion.div>
                    ) : (
                        <motion.div key="editor" className="flex-1 flex flex-col overflow-hidden min-h-0"
                            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}>
                            <EditorPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}