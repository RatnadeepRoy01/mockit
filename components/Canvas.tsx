'use client';

import {
    useRef, useState, useCallback, useEffect, memo,
    Component, type ReactNode, type ErrorInfo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ReactFlow,
    Background,
    useNodesState,
    useReactFlow,
    ReactFlowProvider,
    type NodeTypes,
    type Node,
    type NodeProps,
    type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Code2, Trash2, Camera, Maximize2, MousePointer2,
    ZoomIn, ZoomOut, Maximize, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type Screen, type SelectedElement, type ElementStyle } from '@/store/useAppStore';
import { toast } from 'sonner';

/* ─── Error Boundary ─────────────────────────────────────────────────────────── */
class CanvasErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null }
> {
    state = { error: null };
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[Canvas] Unhandled error:', error, info);
    }
    render() {
        if (this.state.error) return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-sm">
                <AlertTriangle className="w-8 h-8 text-red-400 opacity-60" />
                <p className="text-zinc-400 font-medium">Something went wrong with the canvas</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => this.setState({ error: null })}
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
            </div>
        );
        return this.props.children;
    }
}

/* ─── Picker script ──────────────────────────────────────────────────────────── */
function buildPickerScript(screenId: string, initialActive: boolean): string {
    return `
(function() {
  // Always set the current active state (passed from React at injection time)
  window.__mockitPickerActive = ${initialActive};

  function clearHighlights() {
    document.querySelectorAll('[data-mk-sel]').forEach(function(n) {
      var el = n;
      el.removeAttribute('data-mk-sel');
      el.style.outline = el.getAttribute('data-mk-prev-outline') || '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-mk-prev-outline');
    });
  }

  document.addEventListener('click', function(e) {
    if (!window.__mockitPickerActive) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (!el.getAttribute('data-mk-id')) {
      el.setAttribute('data-mk-id', 'mk_' + Date.now() + '_' + Math.random().toString(36).slice(2));
    }
    var mkId = el.getAttribute('data-mk-id');
    clearHighlights();
    el.setAttribute('data-mk-sel', 'true');
    el.setAttribute('data-mk-prev-outline', el.style.outline || '');
    el.style.outline = '2.5px solid #7c3aed';
    el.style.outlineOffset = '2px';
    var cs = window.getComputedStyle(el);
    function s(p) { return el.style[p] || cs[p] || ''; }
    var tag = el.tagName.toLowerCase();
    var idPart = el.id ? '#' + el.id : '';
    var clsPart = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '';
    var textContent = '';
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) textContent = el.textContent.trim();
    window.parent.postMessage({
      type: '__mockit_pick__', screenId: '${screenId}',
      mkId: mkId, tagName: tag, selector: tag + idPart + clsPart,
      textContent: textContent, innerHTML: el.innerHTML.slice(0, 1200),
      style: {
        color: s('color'), backgroundColor: s('backgroundColor'),
        fontSize: s('fontSize'), fontWeight: s('fontWeight'),
        fontFamily: s('fontFamily'), textAlign: s('textAlign'),
        borderRadius: s('borderRadius'), padding: s('padding'),
        border: s('border'), letterSpacing: s('letterSpacing'),
        lineHeight: s('lineHeight'), textDecoration: s('textDecoration'),
        fontStyle: s('fontStyle'), opacity: s('opacity'),
      }
    }, '*');
  }, true);

  if (!window.__mockitMessageListenerAdded) {
    window.__mockitMessageListenerAdded = true;
    window.addEventListener('message', function(e) {
    if (!e.data || e.data.screenId !== '${screenId}') return;
    if (e.data.type === '__mockit_set_picker__') {
      window.__mockitPickerActive = !!e.data.active;
      if (!e.data.active) clearHighlights();
    }
    if (e.data.type === '__mockit_apply_style__') {
      var el = document.querySelector('[data-mk-id="' + e.data.mkId + '"]');
      if (!el) return;
      var style = e.data.style || {};
      Object.keys(style).forEach(function(k) { if (style[k]) el.style[k] = style[k]; });
      if (e.data.textContent && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        el.textContent = e.data.textContent;
      }
      clearHighlights();
      el.setAttribute('data-mk-sel', 'true');
      el.setAttribute('data-mk-prev-outline', el.style.outline || '');
      el.style.outline = '2.5px solid #7c3aed';
      el.style.outlineOffset = '2px';
      window.parent.postMessage({
        type: '__mockit_html_update__', screenId: '${screenId}',
        html: '<!DOCTYPE html>\\n' + document.documentElement.outerHTML,
      }, '*');
    }
  });
}
})();
`.trim();
}
function buildHeightScript(screenId: string): string {
    return `
(function() {
  function report() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({ type: '__mockit_height__', screenId: '${screenId}', height: h }, '*');
  }
  report();
  new MutationObserver(report).observe(document.body, { childList: true, subtree: true, attributes: true });
})();
`.trim();
}

/* ─── ScreenNode ─────────────────────────────────────────────────────────────── */
const ScreenNode = memo(function ScreenNode({ data }: NodeProps) {
    const screen = data.screen as Screen;

    const updateScreen = useAppStore(s => s.updateScreen);
    const deleteScreen = useAppStore(s => s.deleteScreen);
    const setSelectedScreenId = useAppStore(s => s.setSelectedScreenId);
    const setSidebarMode = useAppStore(s => s.setSidebarMode);
    const setSelectedElement = useAppStore(s => s.setSelectedElement);
    const setHtmlViewModalScreenId = useAppStore(s => s.setHtmlViewModalScreenId);
    const updateScreenHtml = useAppStore(s => s.updateScreenHtml);
    const isSelected = useAppStore(s => s.selectedScreenId === screen.id);
    const isEditing = useAppStore(s => s.sidebarMode === 'editor' && s.selectedScreenId === screen.id);

    const isEditingRef = useRef(isEditing);
    useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const skipRewriteRef = useRef(false);

    const [renaming, setRenaming] = useState(false);
    const [nameValue, setNameValue] = useState(screen.id);
    const [isHovered, setIsHovered] = useState(false);
    const [contentHeight, setContentHeight] = useState(screen.height ?? 800);

    const MOBILE_WIDTH = 360;
    const frameWidth = screen.width ?? MOBILE_WIDTH;
    const iframeScale = frameWidth / MOBILE_WIDTH;
    const scaledHeight = contentHeight * iframeScale;

    const injectScripts = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc?.head) return;

        // Remove stale script tags before re-injecting (deduplication at DOM level)
        doc.querySelectorAll('[data-mk-script]').forEach(n => n.remove());
        const ps = doc.createElement('script');
        ps.setAttribute('data-mk-script', 'true');
        ps.textContent = buildPickerScript(screen.id, isEditingRef.current);
        doc.head.appendChild(ps);

        doc.querySelectorAll('[data-mk-height]').forEach(n => n.remove());
        const hs = doc.createElement('script');
        hs.setAttribute('data-mk-height', 'true');
        hs.textContent = buildHeightScript(screen.id);
        doc.head.appendChild(hs);
        iframeRef.current?.contentWindow?.postMessage(
            { type: '__mockit_set_picker__', screenId: screen.id, active: isEditingRef.current }, '*'
        );
    }, [screen.id]);

    useEffect(() => {
        if (skipRewriteRef.current) { skipRewriteRef.current = false; return; }
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return;

        let body = screen.html;
        const m = screen.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (m) body = m[1];

        // Attach BEFORE doc.open() — guarantees we catch the load event
        const onLoad = () => injectScripts();
        iframe?.addEventListener('load', onLoad, { once: true });

        doc.open();
        doc.write(`<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
<style>*{box-sizing:border-box}html,body{margin:0;padding:0;width:${MOBILE_WIDTH}px;overflow-x:hidden;overflow-y:visible;background:#fff}</style>
</head><body class="bg-white text-gray-900 w-full">${body || ''}</body></html>`);
        doc.close();

        return () => iframe?.removeEventListener('load', onLoad);
    }, [screen.html, injectScripts]);

    // ── sync picker active state whenever isEditing changes ──
    // useEffect(() => {
    //     iframeRef.current?.contentWindow?.postMessage(
    //         { type: '__mockit_set_picker__', screenId: screen.id, active: isEditing }, '*'
    //     );
    // }, [isEditing, screen.id]);

    // ── parent-side message handler ──
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (!e.data || e.data.screenId !== screen.id) return;
            if (e.data.type === '__mockit_pick__') {
                setSelectedElement({
                    screenId: screen.id,
                    mkId: e.data.mkId as string,
                    selector: e.data.selector as string,
                    tagName: e.data.tagName as string,
                    textContent: e.data.textContent as string,
                    style: e.data.style as ElementStyle,
                    innerHTML: e.data.innerHTML as string,
                });
            }
            if (e.data.type === '__mockit_html_update__') {
                skipRewriteRef.current = true;
                updateScreenHtml(screen.id, e.data.html as string);
            }
            if (e.data.type === '__mockit_height__') {
                const h = Math.max(200, e.data.height as number);
                setContentHeight(h);
                updateScreen(screen.id, { height: h });
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [screen.id, setSelectedElement, updateScreenHtml, updateScreen]);

    const takeScreenshot = useCallback(async () => {
        try {
            const { default: html2canvas } = await import('html2canvas');
            const body = iframeRef.current?.contentDocument?.body;
            if (!body) { toast.error('Could not capture screenshot'); return; }
            const canvas = await html2canvas(body, { useCORS: true, scale: 2 });
            const link = document.createElement('a');
            link.download = `${screen.id.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast.success('Screenshot downloaded!');
        } catch { toast.error('Screenshot failed'); }
    }, [screen.id]);

    const submitRename = () => { updateScreen(screen.id, { id: screen.id }); setRenaming(false); };

    return (
        <motion.div
            className="drag-handle flex flex-col"
            style={{ width: frameWidth, height: scaledHeight + 40 }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setSelectedScreenId(screen.id)}
        >
            {/* Title bar */}
            <div
                className={`flex items-center justify-between px-3 py-2 rounded-t-xl select-none cursor-grab active:cursor-grabbing transition-colors
                    ${isSelected ? 'bg-violet-600 text-white' : 'bg-[#1e1e2e] text-white/70 hover:bg-[#252535]'}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="flex gap-1.5 flex-shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </span>
                    {renaming ? (
                        <input
                            className="nodrag nopan bg-transparent border-b border-white/40 text-xs text-white outline-none w-36 px-1"
                            value={nameValue} autoFocus
                            onChange={e => setNameValue(e.target.value)}
                            onBlur={submitRename}
                            onKeyDown={e => e.key === 'Enter' && submitRename()}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-xs font-semibold truncate max-w-[160px]" onDoubleClick={() => setRenaming(true)}>
                            {screen.id}
                        </span>
                    )}
                    {isEditing && (
                        <Badge className="bg-violet-300/20 text-violet-200 border-0 text-[10px] py-0 px-1.5 flex-shrink-0">
                            Editing
                        </Badge>
                    )}
                </div>

                <div
                    className={`nodrag nopan flex items-center gap-0.5 transition-opacity duration-150
                        ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost"
                                className={`h-6 w-6 hover:bg-white/10 ${isEditing ? 'text-violet-200' : 'text-white/60 hover:text-white'}`}
                                onClick={() => { setSelectedScreenId(screen.id); setSidebarMode(isEditing ? 'prompt' : 'editor'); }}>
                                <MousePointer2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{isEditing ? 'Exit Editor' : 'Element Editor'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                                onClick={() => setHtmlViewModalScreenId(screen.id)}>
                                <Code2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">View HTML</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                                onClick={takeScreenshot}>
                                <Camera className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Screenshot</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => { deleteScreen(screen.id); toast.success('Screen removed'); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* iframe body */}
            <div
                className={`relative rounded-b-xl border-2 transition-all duration-200 overflow-hidden
                    ${isEditing
                        ? 'border-violet-500 shadow-lg shadow-violet-500/25 ring-1 ring-violet-500/20'
                        : isSelected ? 'border-violet-500/40' : 'border-white/10'}`}
                style={{ height: scaledHeight }}
            >
                {!isEditing && (
                    <div className="absolute inset-0 z-10 cursor-grab" />
                )}

                <iframe
                    ref={iframeRef}
                    title={screen.id}
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                    style={{
                        width: MOBILE_WIDTH,
                        height: contentHeight,
                        transform: `scale(${iframeScale})`,
                        transformOrigin: 'top left',
                        pointerEvents: isEditing ? 'auto' : 'none',
                        cursor: isEditing ? 'crosshair' : 'default',
                        border: 'none',
                        display: 'block',
                    }}
                />

                <AnimatePresence>
                    {isEditing && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                        >
                            <div className="bg-violet-600/90 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                                <MousePointer2 className="w-3 h-3" />
                                Click any element to select it
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="absolute bottom-1 right-1 text-white/20 pointer-events-none z-20">
                    <Maximize2 className="w-3 h-3" />
                </div>
            </div>
        </motion.div>
    );
});

const nodeTypes: NodeTypes = { screen: ScreenNode };

/* ─── HUD button ─────────────────────────────────────────────────────────────── */
function HudBtn({ onClick, isDark, title, children }: {
    onClick: () => void; isDark: boolean; title: string; children: ReactNode;
}) {
    return (
        <button onClick={onClick} title={title}
            className="nodrag nopan touch-manipulation flex-shrink-0 flex items-center justify-center transition-colors"
            style={{
                width: 32, height: 32, borderRadius: 99,
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
                background: isDark ? '#2a2a2f' : '#ffffff',
                boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                color: isDark ? '#ffffff' : '#1a1a1b',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#3a3a3f' : '#f0f0f2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#2a2a2f' : '#ffffff'; }}
        >
            {children}
        </button>
    );
}

/* ─── CanvasInner ────────────────────────────────────────────────────────────── */
function CanvasInner() {
    const screens = useAppStore(s => s.screens);
    const theme = useAppStore(s => s.theme);
    const setCanvasZoomStore = useAppStore(s => s.setCanvasZoom);
    const updateScreen = useAppStore(s => s.updateScreen);
    const isDark = theme === 'dark';

    const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow();
    const zoomIndicatorRef = useRef<HTMLSpanElement>(null);
    const flowRef = useRef<HTMLDivElement>(null);

    const toNode = useCallback((s: Screen): Node => ({
        id: s.id,
        type: 'screen',
        position: { x: s.x, y: s.y },
        data: { screen: s },
        draggable: true,
        selectable: false,
        dragHandle: '.drag-handle',
    }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(screens.map(toNode));

    const screenIdsRef = useRef<string[]>([]);
    const screenPosRef = useRef<Record<string, { x: number; y: number }>>({});

    useEffect(() => {
        const prevIds = screenIdsRef.current;
        const currIds = screens.map(s => s.id);

        const added = currIds.filter(id => !prevIds.includes(id));
        const removed = prevIds.filter(id => !currIds.includes(id));

        screenIdsRef.current = currIds;

        setNodes(prev => {
            let next = prev.filter(n => !removed.includes(n.id));

            const newScreens = screens.filter(s => added.includes(s.id));
            next = [...next, ...newScreens.map(toNode)];

            next = next.map(n => {
                const s = screens.find(sc => sc.id === n.id);
                if (!s) return n;

                const prev = screenPosRef.current[s.id];
                const posChanged = !prev || prev.x !== s.x || prev.y !== s.y;

                return {
                    ...n,
                    data: { screen: s },
                    position: posChanged ? { x: s.x, y: s.y } : n.position,
                };
            });

            screens.forEach(s => { screenPosRef.current[s.id] = { x: s.x, y: s.y }; });

            return next;
        });
    }, [screens, toNode]);

    const handleNodesChange: OnNodesChange = useCallback(changes => {
        onNodesChange(changes);
        changes.forEach(c => {
            if (c.type === 'position' && !c.dragging && c.position) {
                screenPosRef.current[c.id] = { x: c.position.x, y: c.position.y };
                updateScreen(c.id, { x: c.position.x, y: c.position.y });
            }
        });
    }, [onNodesChange, updateScreen]);

    const handleViewportChange = useCallback(({ zoom }: { x: number; y: number; zoom: number }) => {
        if (zoomIndicatorRef.current)
            zoomIndicatorRef.current.textContent = `${Math.round(zoom * 100)}%`;
        setCanvasZoomStore(zoom);
    }, [setCanvasZoomStore]);

    useEffect(() => {
        const el = flowRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const { x, y, zoom } = getViewport();
            const rect = el.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            const delta = e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015);
            const newZoom = Math.min(3, Math.max(0.05, zoom * (1 - delta)));

            const ratio = newZoom / zoom;
            setViewport({
                x: cursorX - (cursorX - x) * ratio,
                y: cursorY - (cursorY - y) * ratio,
                zoom: newZoom,
            }, { duration: 0 });
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [getViewport, setViewport]);

    const handleFitView = useCallback(() => {
        fitView({ padding: 0.2, duration: 350 });
    }, [fitView]);

    useEffect(() => {
        if (screens.length > 0) {
            fitView({ padding: 0.2, duration: 350 });
        }
    }, [screens.length]);

    return (
        <div
            ref={flowRef}
            className={`relative flex-1 overflow-hidden rounded-2xl border ${isDark ? 'border-white/5' : 'border-black/5'}`}
        >
            <ReactFlow
                nodes={nodes}
                edges={[]}
                nodeTypes={nodeTypes}
                onNodesChange={handleNodesChange}
                onViewportChange={handleViewportChange}
                minZoom={0.05}
                maxZoom={3}
                defaultViewport={{ x: 40, y: 40, zoom: 0.3 }}
                zoomOnScroll={false}
                zoomOnPinch
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag
                preventScrolling
                selectNodesOnDrag={false}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode={null}
                style={{ background: isDark ? '#1a1a1d' : '#ffffff' }}
            >
                <Background
                    color={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
                    gap={24}
                    size={1}
                />

                {/* ── Zoom HUD ── */}
                <div
                    className="absolute bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5"
                    style={{
                        background: isDark ? '#1a1a1e' : '#f0f0f4',
                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 99,
                        padding: '4px 6px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        maxWidth: '90vw',
                    }}
                >
                    <HudBtn onClick={() => zoomOut({ duration: 250 })} isDark={isDark} title="Zoom out">
                        <ZoomOut size={14} />
                    </HudBtn>
                    <button
                        onClick={handleFitView}
                        title="Fit view"
                        className="nodrag nopan touch-manipulation"
                        style={{
                            height: 32, minWidth: 46, padding: '0 8px', borderRadius: 99, border: 'none',
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            cursor: 'pointer', fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                            color: isDark ? '#fff' : '#515154',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                    >
                        <span ref={zoomIndicatorRef}>30%</span>
                    </button>
                    <HudBtn onClick={() => zoomIn({ duration: 250 })} isDark={isDark} title="Zoom in">
                        <ZoomIn size={14} />
                    </HudBtn>
                    <div style={{ width: 1, height: 16, margin: '0 4px', background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                    <HudBtn onClick={handleFitView} isDark={isDark} title="Fit view">
                        <Maximize size={14} />
                    </HudBtn>
                </div>
            </ReactFlow>

            <AnimatePresence>
                {screens.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10"
                    >
                        <div className="text-5xl opacity-20">🖼️</div>
                        <p className={`text-sm font-medium text-center px-6 ${isDark ? 'text-white/25' : 'text-black/25'}`}>
                            Describe a screen in the sidebar to generate your first UI
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Canvas (exported) ──────────────────────────────────────────────────────── */
export default function Canvas() {
    return (
        <CanvasErrorBoundary>
            <ReactFlowProvider>
                <CanvasInner />
            </ReactFlowProvider>
        </CanvasErrorBoundary>
    );
}