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
import { FieldGroup, FieldLegend, Field, FieldContent, FieldLabel } from '@/components/ui/field';

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


const field = `h-7 rounded text-[12px] font-mono outline-none px-2 transition-colors
        bg-black/[0.06] dark:bg-white/[0.06]
        border border-black/[0.1] dark:border-white/[0.09]
        text-zinc-800 dark:text-zinc-200
        focus:border-black/[0.24] dark:focus:border-white/[0.24]`;

const iconBtn = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded border transition-all ${active
        ? 'bg-violet-500/15 dark:bg-violet-500/20 border-violet-400/50 dark:border-violet-500/50 text-violet-600 dark:text-violet-300'
        : 'border-black/[0.1] dark:border-white/[0.09] text-zinc-400 dark:text-zinc-500 hover:border-black/[0.22] dark:hover:border-white/[0.22] hover:text-zinc-700 dark:hover:text-zinc-200'}`;

const PxInput = ({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) => {
    const [local, setLocal] = useState(() => (value ?? '0').replace('px', ''));
    return (
        <input
            value={local}
            onChange={e => {
                setLocal(e.target.value);
                onChange(`${e.target.value}px`);
            }}
            className="h-7 rounded text-[12px] font-mono outline-none px-2 text-center transition-colors
                bg-black/[0.06] dark:bg-white/[0.06]
                border border-black/[0.1] dark:border-white/[0.09]
                text-zinc-800 dark:text-zinc-200
                focus:border-black/[0.24] dark:focus:border-white/[0.24] w-full"
        />
    );
};

const ColorSwatch = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const safe = value.startsWith('#') ? value : '#7c3aed';
    return (
        <div className="flex items-center gap-2 flex-1">
            <div className="relative w-[18px] h-[18px] flex-shrink-0">
                <div className="w-full h-full rounded-sm border border-black/[0.12] dark:border-white/[0.12]"
                    style={{ backgroundColor: value }} />
                <input
                    type="color"
                    value={safe}
                    onChange={e => onChange(e.target.value)}
                    className="absolute h-full opacity-0 cursor-pointer"
                    style={{ width: '18px', height: '18px', bottom: 0, left: 0 }}
                />
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-500 transition-colors font-mono">
                {value}
            </span>
        </div>
    );
};

const px = (v: string | undefined, fallback = '0') => (v ?? fallback).replace('px', '');

const getTransformValue = (transform: string | undefined, fn: string, fallback: string) => {
    if (!transform || transform === 'none') return fallback;

    if (fn === 'scale') {
        // handle matrix format
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
            const values = matrix[1].split(',');
            return String(parseFloat(values[0]).toFixed(2));
        }
    }

    const match = transform.match(new RegExp(`${fn}\\(([^)]+)\\)`));
    return match ? match[1].replace('px', '').replace('deg', '') : fallback;
};

const setTransformValue = (current: string | undefined, fn: string, value: string, unit = '') => {
    const newFn = `${fn}(${value}${unit})`;
    if (!current || current === 'none') return newFn;
    if (current.includes(`${fn}(`)) {
        return current.replace(new RegExp(`${fn}\\([^)]+\\)`), newFn);
    }
    return `${current} ${newFn}`;
};

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

    const applyChanges = useCallback((style: ElementStyle, text: string) => {
        if (!selectedElement) return;
        const payload = { type: '__mockit_apply_style__', screenId: selectedElement.screenId, mkId: selectedElement.mkId, style, textContent: text };
        document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(iframe => {
            try { iframe.contentWindow?.postMessage(payload, '*'); } catch { }
        });
    }, [selectedElement]);

    useEffect(() => {
        if (!selectedElement) return;
        const timer = setTimeout(() => applyChanges(localStyle, localText), 100);
        return () => clearTimeout(timer);
    }, [localStyle, applyChanges, selectedElement]);

    useEffect(() => {
        if (!selectedElement) return;
        const timer = setTimeout(() => applyChanges(localStyle, localText), 300);
        return () => clearTimeout(timer);
    }, [localText]);

    if (!selectedElement) {
        return (
            <div className="flex-1 flex flex-col justify-end p-4 pb-8 font-mono">
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600">no element selected</p>
                    <div className="space-y-2">
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

    return (
        <div className="flex-1 overflow-y-auto min-h-0 font-mono"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.2) transparent', overscrollBehavior: 'contain' }}>

            {/* Target */}
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-black/[0.07] dark:border-white/[0.06]">
                <span className="text-[10px] text-violet-500/50 flex-shrink-0">◆</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 flex-shrink-0">&lt;{selectedElement.tagName}&gt;</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 truncate flex-1 min-w-0">{selectedElement.selector}</span>
                <button onClick={() => setSelectedElement(null)}
                    className="flex-shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div key={selectedElement?.mkId} className="divide-y divide-black/[0.05] dark:divide-white/[0.04]">

                {/* Content */}
                {selectedElement.textContent !== '' && (
                    <FieldGroup className="px-4 py-2 gap-2">
                        <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">content</FieldLegend>
                        <textarea
                            value={localText}
                            onChange={e => setLocalText(e.target.value)}
                            onBlur={() => applyChanges(localStyle, localText)}
                            rows={2}
                            placeholder="Text content…"
                            className="w-full rounded text-[12px] font-mono px-2.5 py-2 resize-none outline-none transition-colors
                                bg-black/[0.06] dark:bg-white/[0.06]
                                border border-black/[0.1] dark:border-white/[0.09]
                                text-zinc-800 dark:text-zinc-200
                                placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                                focus:border-black/[0.24] dark:focus:border-white/[0.24]"
                        />
                    </FieldGroup>
                )}

                {/* Typography */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">typography</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">size</FieldLabel>
                        <FieldContent className="flex-1">
                            <input value={px(localStyle.fontSize, '16')} onChange={e => setStyle('fontSize', `${e.target.value}px`)} className={`${field} w-full text-center`} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">family</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.fontFamily ?? ''} onChange={e => setStyle('fontFamily', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['', 'system-ui', 'Inter', 'Georgia', 'Times New Roman', 'monospace', 'Arial', 'Helvetica', 'Courier New'].map(f => (
                                    <option key={f} value={f} className="bg-zinc-100 dark:bg-zinc-900">{f || '— default —'}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">weight</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.fontWeight ?? '400'} onChange={e => setStyle('fontWeight', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['300', '400', '500', '600', '700', '800', '900'].map(w => (
                                    <option key={w} value={w} className="bg-zinc-100 dark:bg-zinc-900">{w}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">style</FieldLabel>
                        <FieldContent className="flex-row gap-1.5">
                            {[
                                { icon: <Bold className="w-3 h-3" />, sk: 'fontWeight', on: '700', off: '400' },
                                { icon: <Italic className="w-3 h-3" />, sk: 'fontStyle', on: 'italic', off: 'normal' },
                                { icon: <Underline className="w-3 h-3" />, sk: 'textDecoration', on: 'underline', off: 'none' },
                            ].map(({ icon, sk, on, off }) => {
                                const active = (localStyle as Record<string, string>)[sk] === on;
                                return <button key={sk} className={iconBtn(active)} onClick={() => setStyle(sk as keyof ElementStyle, active ? off : on)}>{icon}</button>;
                            })}
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">align</FieldLabel>
                        <FieldContent className="flex-row gap-1.5">
                            {[{ icon: <AlignLeft className="w-3 h-3" />, val: 'left' }, { icon: <AlignCenter className="w-3 h-3" />, val: 'center' }, { icon: <AlignRight className="w-3 h-3" />, val: 'right' }].map(({ icon, val }) => (
                                <button key={val} className={iconBtn(localStyle.textAlign === val)} onClick={() => setStyle('textAlign', val)}>{icon}</button>
                            ))}
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">case</FieldLabel>
                        <FieldContent className="flex-row gap-1.5">
                            {[['AA', 'uppercase'], ['aa', 'lowercase'], ['Aa', 'capitalize']].map(([label, val]) => (
                                <button key={val} onClick={() => setStyle('textTransform', localStyle.textTransform === val ? 'none' : val)}
                                    className={`px-2 h-7 rounded border text-[10px] transition-all ${localStyle.textTransform === val
                                        ? 'bg-violet-500/15 border-violet-400/50 text-violet-600 dark:text-violet-300'
                                        : 'border-black/[0.1] dark:border-white/[0.09] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
                                    {label}
                                </button>
                            ))}
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">line-h</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.lineHeight ?? ''} onChange={v => setStyle('lineHeight', v)} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">spacing</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.letterSpacing} onChange={v => setStyle('letterSpacing', v)} />
                        </FieldContent>
                    </Field>
                </FieldGroup>

                {/* Colors */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">colors</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">text</FieldLabel>
                        <FieldContent className="flex-1"><ColorSwatch value={localStyle.color ?? '#000000'} onChange={v => setStyle('color', v)} /></FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">fill</FieldLabel>
                        <FieldContent className="flex-1"><ColorSwatch value={localStyle.backgroundColor ?? '#ffffff'} onChange={v => setStyle('backgroundColor', v)} /></FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">border</FieldLabel>
                        <FieldContent className="flex-1"><ColorSwatch value={localStyle.borderColor ?? '#000000'} onChange={v => setStyle('borderColor', v)} /></FieldContent>
                    </Field>
                </FieldGroup>

                {/* Spacing */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">padding</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">top</FieldLabel>
                        <FieldContent className="flex-1"><PxInput value={localStyle.paddingTop} onChange={v => setStyle('paddingTop', v)} /></FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">right</FieldLabel>
                        <FieldContent className="flex-1"><PxInput value={localStyle.paddingRight} onChange={v => setStyle('paddingRight', v)} /></FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">bottom</FieldLabel>
                        <FieldContent className="flex-1"><PxInput value={localStyle.paddingBottom} onChange={v => setStyle('paddingBottom', v)} /></FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">left</FieldLabel>
                        <FieldContent className="flex-1"><PxInput value={localStyle.paddingLeft} onChange={v => setStyle('paddingLeft', v)} /></FieldContent>
                    </Field>
                </FieldGroup>

                {/* Size */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">size</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">width</FieldLabel>
                        <FieldContent className="flex-1">
                            <input value={localStyle.width ?? ''} onChange={e => setStyle('width', e.target.value)} placeholder="auto" className={`${field} w-full`} />
                        </FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">height</FieldLabel>
                        <FieldContent className="flex-1">
                            <input value={localStyle.height ?? ''} onChange={e => setStyle('height', e.target.value)} placeholder="auto" className={`${field} w-full`} />
                        </FieldContent>
                    </Field>
                </FieldGroup>

                {/* Border */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">border</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">width</FieldLabel>
                        <FieldContent className="flex-1"><PxInput value={localStyle.borderWidth} onChange={v => setStyle('borderWidth', v)} /></FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">style</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.borderStyle ?? 'solid'} onChange={e => setStyle('borderStyle', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['solid', 'dashed', 'dotted', 'none'].map(s => (
                                    <option key={s} value={s} className="bg-zinc-100 dark:bg-zinc-900">{s}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>
                </FieldGroup>

                {/* Shape */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">shape</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">radius</FieldLabel>
                        <FieldContent className="flex-1 flex-row gap-2">
                            <Slider min={0} max={48} step={1}
                                value={[parseInt(localStyle.borderRadius ?? '0')]}
                                onValueChange={([v]) => setStyle('borderRadius', `${v}px`)}
                                className="flex-1 [&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:h-3" />
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600 w-12 text-right tabular-nums">{localStyle.borderRadius ?? '0px'}</span>
                        </FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">opacity</FieldLabel>
                        <FieldContent className="flex-1 flex-row gap-2">
                            <Slider min={0} max={100} step={1}
                                value={[Math.round(parseFloat(localStyle.opacity ?? '1') * 100)]}
                                onValueChange={([v]) => setStyle('opacity', String(v / 100))}
                                className="flex-1 [&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:h-3" />
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-600 w-12 text-right tabular-nums">{Math.round(parseFloat(localStyle.opacity ?? '1') * 100)}%</span>
                        </FieldContent>
                    </Field>
                </FieldGroup>

                {/* Effects */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">effects</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">shadow</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.boxShadow ?? 'none'} onChange={e => setStyle('boxShadow', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {[
                                    { label: 'none', value: 'none' },
                                    { label: 'sm', value: '0 1px 2px rgba(0,0,0,0.05)' },
                                    { label: 'md', value: '0 4px 6px rgba(0,0,0,0.1)' },
                                    { label: 'lg', value: '0 10px 15px rgba(0,0,0,0.15)' },
                                    { label: 'xl', value: '0 20px 25px rgba(0,0,0,0.2)' },
                                    { label: 'inner', value: 'inset 0 2px 4px rgba(0,0,0,0.1)' },
                                ].map(o => <option key={o.label} value={o.value} className="bg-zinc-100 dark:bg-zinc-900">{o.label}</option>)}
                            </select>
                        </FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">display</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.display ?? ''} onChange={e => setStyle('display', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['', 'block', 'flex', 'inline', 'inline-block', 'grid', 'none'].map(d => (
                                    <option key={d} value={d} className="bg-zinc-100 dark:bg-zinc-900">{d || '— default —'}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>
                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">visibility</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.visibility ?? 'visible'} onChange={e => setStyle('visibility', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['visible', 'hidden'].map(v => (
                                    <option key={v} value={v} className="bg-zinc-100 dark:bg-zinc-900">{v}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>
                </FieldGroup>
                {/* Transform */}
                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">transform</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">scale</FieldLabel>
                        <FieldContent className="flex-1">
                            <div className="flex items-center gap-1">
                                <input
                                    value={getTransformValue(localStyle.transform, 'scale', '1')}
                                    onChange={e => setStyle('transform', setTransformValue(localStyle.transform, 'scale', e.target.value))}
                                    className={`${field} w-full text-center`}
                                />
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">sc</span>
                            </div>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">rotate</FieldLabel>
                        <FieldContent className="flex-1">
                            <div className="flex items-center gap-1">
                                <input
                                    value={getTransformValue(localStyle.transform, 'rotate', '0')}
                                    onChange={e => setStyle('transform', setTransformValue(localStyle.transform, 'rotate', e.target.value, 'deg'))}
                                    className={`${field} w-full text-center`}
                                />
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">dg</span>
                            </div>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">translate x</FieldLabel>
                        <FieldContent className="flex-1">
                            <div className="flex items-center gap-1">
                                <input
                                    value={getTransformValue(localStyle.transform, 'translateX', '0')}
                                    onChange={e => setStyle('transform', setTransformValue(localStyle.transform, 'translateX', e.target.value, 'px'))}
                                    className={`${field} w-full text-center`}
                                />
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">px</span>
                            </div>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">translate y</FieldLabel>
                        <FieldContent className="flex-1">
                            <div className="flex items-center gap-1">
                                <input
                                    value={getTransformValue(localStyle.transform, 'translateY', '0')}
                                    onChange={e => setStyle('transform', setTransformValue(localStyle.transform, 'translateY', e.target.value, 'px'))}
                                    className={`${field} w-full text-center`}
                                />
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">px</span>
                            </div>
                        </FieldContent>
                    </Field>
                </FieldGroup>

                <FieldGroup className="px-4 py-2 gap-2">
                    <FieldLegend variant="label" className="text-[10px] text-zinc-600 dark:text-zinc-400">position</FieldLegend>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">type</FieldLabel>
                        <FieldContent className="flex-1">
                            <select value={localStyle.position ?? ''} onChange={e => setStyle('position', e.target.value)}
                                className={`${field} w-full appearance-none cursor-pointer`}>
                                {['', 'static', 'relative', 'absolute', 'fixed', 'sticky'].map(p => (
                                    <option key={p} value={p} className="bg-zinc-100 dark:bg-zinc-900">{p || '— default —'}</option>
                                ))}
                            </select>
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">top</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.top} onChange={v => setStyle('top', v)} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">right</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.right} onChange={v => setStyle('right', v)} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">bottom</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.bottom} onChange={v => setStyle('bottom', v)} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">left</FieldLabel>
                        <FieldContent className="flex-1">
                            <PxInput value={localStyle.left} onChange={v => setStyle('left', v)} />
                        </FieldContent>
                    </Field>

                    <Field orientation="horizontal" className="gap-2 items-center" style={{ gap: '6px' }}>
                        <FieldLabel className="w-16 text-[11px]">z-index</FieldLabel>
                        <FieldContent className="flex-1">
                            <input
                                value={localStyle.zIndex ?? ''}
                                onChange={e => setStyle('zIndex', e.target.value)}
                                placeholder="auto"
                                className={`${field} w-full text-center`}
                            />
                        </FieldContent>
                    </Field>
                </FieldGroup>
            </div>

            {/* Reset */}
            <div className="p-4 pb-8">
                <button
                    onClick={() => { setLocalStyle(selectedElement.style); setLocalText(selectedElement.textContent); }}
                    className="w-full h-8 flex items-center justify-center gap-2 text-[11px] font-mono rounded transition-all
                        text-zinc-400 dark:text-zinc-600
                        border border-black/[0.09] dark:border-white/[0.07]
                        hover:text-zinc-800 dark:hover:text-zinc-200
                        hover:border-black/[0.2] dark:hover:border-white/[0.16]">
                    <RotateCcw className="w-3 h-3" /> reset to original
                </button>
            </div>
        </div>
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