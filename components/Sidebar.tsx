'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wand2, MousePointer2, Send, Loader2,
    Bot, User, Sparkles, Type, Palette,
    AlignLeft, AlignCenter, AlignRight,
    Minus, Plus, Bold, Italic, Underline,
    RotateCcw, Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore, type ElementStyle } from '@/store/useAppStore';
import { supabase } from '@/lib/supabaseClient';

async function callAI(projectId: string, prompt: string, screenId?: string) {
    try {
        const functionName = screenId ? 'updateDesigns' : 'generateDesigns';
        const body = screenId
            ? { projectId, prompt, screenId }
            : { projectId, prompt };

        const { data, error } = await supabase.functions.invoke(functionName, {
            body,
        });

        if (error) throw error
        return data;

    } catch (err: any) {
        console.error(`${screenId ? 'updateDesigns' : 'generateDesigns'} error:`, err);
        throw err;
    }
}

function PromptPanel({ projectId }: { projectId: string }) {
    const messages = useAppStore(state => state.messages);
    const addMessage = useAppStore(state => state.addMessage);
    const isAiLoading = useAppStore(state => state.isAiLoading);
    const setIsAiLoading = useAppStore(state => state.setIsAiLoading);
    const selectedScreenId = useAppStore(state => state.selectedScreenId);
    const setSelectedScreenId = useAppStore(state => state.setSelectedScreenId);
    const screens = useAppStore(state => state.screens);

    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const selectedScreen = screens.find((s) => s.id === selectedScreenId);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || isAiLoading || !projectId) return;

        setInput('');
        addMessage({ role: 'user', content: text });
        setIsAiLoading(true);

        try {
            // If a screen is selected, use its name for the update flow
            let res = await callAI(projectId, text, selectedScreen?.id || undefined);
        } catch (err: any) {
            console.error('Error in generation loop:', err);
            addMessage({ role: 'assistant', content: `Error: ${err.message || 'Failed to process request'}` });
        } finally {
            setIsAiLoading(false);
        }
    }, [input, isAiLoading, addMessage, setIsAiLoading, projectId, selectedScreen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Context chip */}
            {selectedScreenId && (
                <div className="px-4 pt-3 pb-0">
                    <div className="group flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-400/20 rounded-lg px-3 py-2">
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate flex-1">Targeting: <strong>{selectedScreen?.id}</strong></span>
                        <button
                            onClick={() => setSelectedScreenId(null)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-violet-500/20 rounded transition-all"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div
                className="flex-1 overflow-y-auto min-h-0 px-4 py-3"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(139,92,246,0.3) transparent',
                    overscrollBehavior: 'contain'
                }}
            >
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                ${msg.role === 'user' ? 'bg-violet-600' : 'bg-gradient-to-br from-violet-500 to-blue-500'}`}>
                                {msg.role === 'user'
                                    ? <User className="w-3.5 h-3.5 text-white" />
                                    : <Bot className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                                ${msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-tr-sm'
                                    : 'bg-black/5 dark:bg-white/7 border border-black/10 dark:border-white/10 text-foreground rounded-tl-sm'}`}>
                                {msg.content.split('\n').map((line, i, arr) => (
                                    <span key={i}>
                                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                                        {i < arr.length - 1 && <br />}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}

                    {isAiLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="bg-black/5 dark:bg-white/7 border border-black/10 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                                <span className="text-xs text-muted-foreground">Generating…</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            <Separator />

            {/* Input */}
            <div className="p-4 space-y-2">
                <div className="relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={selectedScreenId ? `Update "${selectedScreen?.id}"…` : 'Describe a screen to generate…'}
                        rows={3}
                        className="resize-none pr-12 rounded-xl focus-visible:ring-violet-500/50"
                    />
                    <Button
                        size="icon"
                        disabled={!input.trim() || isAiLoading}
                        onClick={handleSend}
                        className="absolute bottom-2.5 right-2.5 h-8 w-8 bg-violet-600 hover:bg-violet-500 rounded-lg disabled:opacity-30"
                    >
                        {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/50 text-center">Enter to send · Shift+Enter new line</p>
            </div>
        </div>
    );
}

// ─── Element Editor Panel ─────────────────────────────────────────────────────
function EditorPanel() {
    const selectedElement = useAppStore(state => state.selectedElement);
    const setSelectedElement = useAppStore(state => state.setSelectedElement);
    const screens = useAppStore(state => state.screens);

    const [localStyle, setLocalStyle] = useState<ElementStyle>(selectedElement?.style ?? {});
    const [localText, setLocalText] = useState(selectedElement?.textContent ?? '');

    useEffect(() => {
        if (selectedElement) {
            setLocalStyle({ ...selectedElement.style });
            setLocalText(selectedElement.textContent ?? '');
        }
    }, [selectedElement?.mkId]);

    const setStyle = (key: keyof ElementStyle, val: string) =>
        setLocalStyle((prev) => ({ ...prev, [key]: val }));

    const applyChanges = useCallback((style: ElementStyle, text: string) => {
        if (!selectedElement) return;

        const payload = {
            type: '__mockit_apply_style__',
            screenId: selectedElement.screenId,
            mkId: selectedElement.mkId,
            style: style,
            textContent: text,
        };

        const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
        iframes.forEach((iframe) => {
            try {
                iframe.contentWindow?.postMessage(payload, '*');
            } catch { /* ignored */ }
        });
    }, [selectedElement]);

    useEffect(() => {
        if (selectedElement) {
            applyChanges(localStyle, localText);
        }
    }, [localStyle, localText, applyChanges, selectedElement]);

    if (!selectedElement) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
                    <MousePointer2 className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">No element selected</p>
                    <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
                        Switch to Element Editor mode,<br />then click any element inside a screen.
                    </p>
                </div>
                <div className="mt-2 text-xs text-muted-foreground/50 space-y-1 w-full">
                    {[
                        ['1.', 'Click the cursor icon on a screen titlebar'],
                        ['2.', 'Click any element on the screen canvas'],
                        ['3.', 'Edit its styles here and click Apply'],
                    ].map(([num, text]) => (
                        <div key={num} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-left">
                            <span>{num}</span> <span>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex-1 overflow-y-auto min-h-0"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139,92,246,0.3) transparent',
                overscrollBehavior: 'contain'
            }}
        >
            <div className="p-4 space-y-5">

                {/* Element chip */}
                <div className="bg-violet-500/10 border border-violet-400/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <Badge className="bg-violet-500/20 text-violet-600 dark:text-violet-300 border-0 text-[11px] font-mono flex-shrink-0">
                        &lt;{selectedElement.tagName}&gt;
                    </Badge>
                    <span className="text-xs text-muted-foreground/60 truncate">{selectedElement.selector}</span>
                    <button
                        className="ml-auto text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0"
                        onClick={() => setSelectedElement(null)}
                        title="Clear selection"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                {selectedElement.textContent !== '' && (
                    <EditorSection title="Content" icon={<Type className="w-3.5 h-3.5" />}>
                        <Textarea
                            value={localText}
                            onChange={(e) => setLocalText(e.target.value)}
                            rows={2}
                            placeholder="Text content…"
                            className="resize-none text-sm rounded-lg"
                        />
                    </EditorSection>
                )}

                <Separator />

                {/* Typography */}
                <EditorSection title="Typography" icon={<Type className="w-3.5 h-3.5" />}>
                    {/* Font size */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Font Size</Label>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => { const n = parseInt(localStyle.fontSize ?? '16'); setStyle('fontSize', `${Math.max(8, n - 1)}px`); }}>
                                <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                                value={(localStyle.fontSize ?? '16px').replace('px', '')}
                                onChange={(e) => setStyle('fontSize', `${e.target.value}px`)}
                                className="h-7 text-center text-sm"
                            />
                            <Button size="icon" variant="outline"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => { const n = parseInt(localStyle.fontSize ?? '16'); setStyle('fontSize', `${n + 1}px`); }}>
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Font weight */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Font Weight</Label>
                        <Select
                            value={localStyle.fontWeight ?? '400'}
                            onValueChange={(v) => setStyle('fontWeight', v)}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {['300', '400', '500', '600', '700', '800', '900'].map((w) => (
                                    <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Style toggles */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Style</Label>
                        <div className="flex gap-2">
                            {[
                                { icon: <Bold className="w-3.5 h-3.5" />, label: 'Bold', sk: 'fontWeight', on: '700', off: '400' },
                                { icon: <Italic className="w-3.5 h-3.5" />, label: 'Italic', sk: 'fontStyle', on: 'italic', off: 'normal' },
                                { icon: <Underline className="w-3.5 h-3.5" />, label: 'Underline', sk: 'textDecoration', on: 'underline', off: 'none' },
                            ].map(({ icon, label, sk, on, off }) => {
                                const active = (localStyle as Record<string, string>)[sk] === on;
                                return (
                                    <Tooltip key={label}>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant={active ? 'default' : 'outline'}
                                                className={`h-8 w-8 text-xs ${active ? 'bg-violet-600 border-violet-500 text-white hover:bg-violet-500' : ''}`}
                                                onClick={() => setStyle(sk as keyof ElementStyle, active ? off : on)}>
                                                {icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{label}</TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Text Align</Label>
                        <div className="flex gap-2">
                            {[
                                { icon: <AlignLeft className="w-3.5 h-3.5" />, val: 'left' },
                                { icon: <AlignCenter className="w-3.5 h-3.5" />, val: 'center' },
                                { icon: <AlignRight className="w-3.5 h-3.5" />, val: 'right' },
                            ].map(({ icon, val }) => (
                                <Button key={val} size="icon"
                                    variant={localStyle.textAlign === val ? 'default' : 'outline'}
                                    className={`h-8 w-8 ${localStyle.textAlign === val ? 'bg-violet-600 border-violet-500 text-white hover:bg-violet-500' : ''}`}
                                    onClick={() => setStyle('textAlign', val)}>
                                    {icon}
                                </Button>
                            ))}
                        </div>
                    </div>
                </EditorSection>

                <Separator />

                {/* Colors */}
                <EditorSection title="Colors" icon={<Palette className="w-3.5 h-3.5" />}>
                    <div className="grid grid-cols-2 gap-3">
                        <ColorPicker
                            label="Text Color"
                            value={localStyle.color ?? '#000000'}
                            onChange={(v) => setStyle('color', v)}
                        />
                        <ColorPicker
                            label="Background"
                            value={localStyle.backgroundColor ?? '#ffffff'}
                            onChange={(v) => setStyle('backgroundColor', v)}
                        />
                    </div>
                </EditorSection>

                <Separator />

                {/* Spacing & Shape */}
                <EditorSection title="Shape & Opacity" icon={<Sliders className="w-3.5 h-3.5" />}>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <Label className="text-muted-foreground text-xs">Border Radius</Label>
                                <span className="text-xs text-muted-foreground/60">{localStyle.borderRadius ?? '0px'}</span>
                            </div>
                            <Slider
                                min={0} max={48} step={1}
                                value={[parseInt(localStyle.borderRadius ?? '0')]}
                                onValueChange={([v]) => setStyle('borderRadius', `${v}px`)}
                                className="[&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <Label className="text-muted-foreground text-xs">Opacity</Label>
                                <span className="text-xs text-muted-foreground/60">
                                    {Math.round(parseFloat(localStyle.opacity ?? '1') * 100)}%
                                </span>
                            </div>
                            <Slider
                                min={0} max={100} step={1}
                                value={[Math.round(parseFloat(localStyle.opacity ?? '1') * 100)]}
                                onValueChange={([v]) => setStyle('opacity', String(v / 100))}
                                className="[&_[data-slot=range]]:bg-violet-500 [&_[data-slot=thumb]]:border-violet-500"
                            />
                        </div>
                    </div>
                </EditorSection>

                {/* Reset */}
                <div className="pb-8 pt-2">
                    <Button
                        variant="outline"
                        className="w-full text-xs h-9 rounded-xl"
                        onClick={() => {
                            setLocalStyle(selectedElement.style);
                            setLocalText(selectedElement.textContent);
                        }}
                    >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Reset to Original
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Small shared helpers ──────────────────────────────────────────────────────
function EditorSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-violet-500">{icon}</span>
                <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{title}</span>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const safeValue = value.startsWith('#') ? value : '#7c3aed';
    return (
        <div className="space-y-1.5">
            <Label className="text-muted-foreground/60 text-[11px]">{label}</Label>
            <label className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg p-1.5 cursor-pointer hover:border-violet-400/50 transition-colors">
                <input
                    type="color"
                    value={safeValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="sr-only"
                />
                <div
                    className="w-6 h-6 rounded-md border border-border flex-shrink-0"
                    style={{ backgroundColor: value }}
                />
                <span className="text-xs text-muted-foreground font-mono truncate">{value.slice(0, 20)}</span>
            </label>
        </div>
    );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ projectId, onClose }: { projectId: string; onClose?: () => void }) {
    const sidebarMode = useAppStore(state => state.sidebarMode);
    const setSidebarMode = useAppStore(state => state.setSidebarMode);
    const theme = useAppStore(state => state.theme);
    const selectedElement = useAppStore(state => state.selectedElement);
    const isDark = theme === 'dark';

    return (
        <motion.div
            className={`flex flex-col w-full md:w-[340px] flex-shrink-0 border h-full overflow-hidden rounded-2xl ${isDark ? 'bg-[#1a1a1e] border-white/5' : 'bg-white border-black/5'}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-bold text-foreground">mockIt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedElement && sidebarMode === 'editor' && (
                            <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-400/20 text-[10px] hidden xs:flex">
                                Element Selected
                            </Badge>
                        )}
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:hidden"
                                onClick={onClose}
                            >
                                <RotateCcw className="w-3.5 h-3.5 rotate-45" /> {/* Close-like icon if X not available or just use Rotate for now or find X */}
                                <span className="sr-only">Close</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Mode tabs */}
                <Tabs value={sidebarMode} onValueChange={(v) => setSidebarMode(v as 'prompt' | 'editor')}>
                    <TabsList className="w-full">
                        <TabsTrigger value="prompt" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                            <Wand2 className="w-3.5 h-3.5" />
                            AI Prompt
                        </TabsTrigger>
                        <TabsTrigger value="editor" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                            <MousePointer2 className="w-3.5 h-3.5" />
                            Element Editor
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                    {sidebarMode === 'prompt' ? (
                        <motion.div key="prompt" className="flex-1 flex flex-col overflow-hidden min-h-0"
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.15 }}>
                            <PromptPanel projectId={projectId} />
                        </motion.div>
                    ) : (
                        <motion.div key="editor" className="flex-1 flex flex-col overflow-hidden min-h-0"
                            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.15 }}>
                            <EditorPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}