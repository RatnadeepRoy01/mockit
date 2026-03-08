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
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type Screen, type SelectedElement, type ElementStyle } from '@/store/useAppStore';
import { supabase } from '@/lib/supabaseClient';
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

/* ─── Skeleton HTML ──────────────────────────────────────────────────────────── */
function buildSkeletonHtml(): string {
    return `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:360px;background:#ffffff;font-family:system-ui,sans-serif;overflow:hidden}
  @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
  .sk{
    background:linear-gradient(90deg,#e8e8e8 25%,#bdbdbd 50%,#e8e8e8 75%);
    background-size:600px 100%;
    animation:shimmer 1.4s infinite linear;
    border-radius:5px;
  }
  .section{padding:20px 16px;display:flex;flex-direction:column;gap:14px}
  .row{display:flex;flex-direction:column;gap:8px}
  .divider{height:1px;background:#f0f0f0;margin:4px 16px}
</style>
</head><body>

<!-- Header bar -->
<div style="padding:18px 16px 14px;border-bottom:1px solid #f0f0f0">
  <div class="sk" style="height:16px;width:45%"></div>
</div>

<!-- Section 1: title + 3 lines -->
<div class="section">
  <div class="sk" style="height:13px;width:30%"></div>
  <div class="row">
    <div class="sk" style="height:11px;width:95%"></div>
    <div class="sk" style="height:11px;width:88%"></div>
    <div class="sk" style="height:11px;width:72%"></div>
  </div>
</div>

<div class="divider"></div>

<!-- Section 2: sub-heading + lines -->
<div class="section">
  <div class="sk" style="height:13px;width:38%"></div>
  <div class="row">
    <div class="sk" style="height:11px;width:90%"></div>
    <div class="sk" style="height:11px;width:80%"></div>
  </div>
  <div class="sk" style="height:11px;width:55%"></div>
</div>

<div class="divider"></div>

<!-- Section 3: list-like rows -->
<div class="section">
  <div class="sk" style="height:13px;width:28%"></div>
  ${[92, 78, 85, 65].map(() => `
  <div class="row" style="gap:6px">
    <div class="sk" style="height:11px;width:__W__%"></div>
  </div>`).join('').replace(/__W__/g, '').replace(/width:%;/g, () => {
        const ws = [92, 78, 85, 65];
        return `width:${ws[Math.floor(Math.random() * ws.length)]}%;`;
    })}
  <div class="sk" style="height:11px;width:92%"></div>
  <div class="sk" style="height:11px;width:78%"></div>
  <div class="sk" style="height:11px;width:85%"></div>
  <div class="sk" style="height:11px;width:65%"></div>
</div>

<div class="divider"></div>

<!-- Section 4 -->
<div class="section">
  <div class="sk" style="height:13px;width:33%"></div>
  <div class="row">
    <div class="sk" style="height:11px;width:88%"></div>
    <div class="sk" style="height:11px;width:70%"></div>
  </div>
</div>

<!-- Label -->
<div style="padding:8px 16px">
</div>

</body></html>`;
}

/* ─── Picker script ──────────────────────────────────────────────────────────── */
function buildPickerScript(screenId: string): string {
    return `
(function() {
  // Always start inactive — isEditing useEffect will activate if needed
  window.__mockitPickerActive = false;

  function clearHighlights() {
    document.querySelectorAll('[data-mk-sel]').forEach(function(n) {
      var el = n;
      el.removeAttribute('data-mk-sel');
      el.style.outline = el.getAttribute('data-mk-prev-outline') || '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-mk-prev-outline');
    });
  }

  // DOCUMENT-level listener: always re-attach on every injection.
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
        borderRadius: s('borderRadius'), letterSpacing: s('letterSpacing'),
        lineHeight: s('lineHeight'), textDecoration: s('textDecoration'),
        fontStyle: s('fontStyle'), opacity: s('opacity'),
        textTransform: s('textTransform'),
        paddingTop: s('paddingTop'), paddingRight: s('paddingRight'),
        paddingBottom: s('paddingBottom'), paddingLeft: s('paddingLeft'),
        width: s('width'), height: s('height'),
        borderWidth: s('borderWidth'), borderColor: s('borderColor'),
        borderStyle: s('borderStyle'), boxShadow: s('boxShadow'),
        display: s('display'), visibility: s('visibility'),
        transform: s('transform'), position: s('position'),
        top: s('top'), right: s('right'),
        bottom: s('bottom'), left: s('left'),
        zIndex: s('zIndex'),
      }
    }, '*');
  }, true);

  if (window.__mockitMessageHandler) {
    window.removeEventListener('message', window.__mockitMessageHandler);
  }
  window.__mockitMessageHandler = function(e) {
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
      document.querySelectorAll('[data-mk-prev-outline]').forEach(function(n) {
        n.removeAttribute('data-mk-prev-outline');
      });
      var cleanHtml = document.body.innerHTML;
      // Re-highlight the element visually AFTER snapshot (UI feedback only)
      el.setAttribute('data-mk-sel', 'true');
      el.setAttribute('data-mk-prev-outline', el.style.outline || '');
      el.style.outline = '2.5px solid #7c3aed';
      el.style.outlineOffset = '2px';
      window.parent.postMessage({
        type: '__mockit_html_update__', screenId: '${screenId}',
        html: cleanHtml,
      }, '*');
    }
  };
  window.addEventListener('message', window.__mockitMessageHandler);
})();
`.trim();
}

function buildHeightScript(screenId: string): string {
    return `
(function() {
  var _pending = false;

  function report() {
    if (_pending) return;
    _pending = true;
    requestAnimationFrame(function() {
      // body.scrollHeight gives true content height because html has overflow:hidden,
      // which prevents the iframe viewport from inflating the measurement,
      // and prevents outline overflow from leaking into the scroll area.
      var h = document.body.scrollHeight;
      if (h > 0) {
        window.parent.postMessage({ type: '__mockit_height__', screenId: '${screenId}', height: h }, '*');
      }
      _pending = false;
    });
  }

  report();

  // Only structural DOM changes trigger re-measure.
  // Attribute/style mutations from the picker (outline, data-mk-*) are ignored.
  new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].type === 'childList') { report(); return; }
    }
  }).observe(document.body, { childList: true, subtree: true });
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
    const projectId = useAppStore(s => s.projectId);
    const isSelected = useAppStore(s => s.selectedScreenId === screen.id);
    const isEditing = useAppStore(s => s.sidebarMode === 'editor' && s.selectedScreenId === screen.id);

    const isEditingRef = useRef(isEditing);
    useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const skipRewriteRef = useRef(false);

    const [renaming, setRenaming] = useState(false);
    const [nameValue, setNameValue] = useState(screen.id);
    const [isHovered, setIsHovered] = useState(false);
    const [contentHeight, setContentHeight] = useState(screen.height ?? 700);

    const MOBILE_WIDTH = 360;
    const frameWidth = screen.width ?? MOBILE_WIDTH;
    const iframeScale = frameWidth / MOBILE_WIDTH;
    const scaledHeight = contentHeight * iframeScale;

    const isEmpty = !screen.html || screen.html.trim() === '';

    const injectScripts = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc?.head) return;

        // Always re-inject picker script (stateless, safe to replace)
        doc.querySelectorAll('[data-mk-script]').forEach(n => n.remove());
        const ps = doc.createElement('script');
        ps.setAttribute('data-mk-script', 'true');
        ps.textContent = buildPickerScript(screen.id);
        doc.head.appendChild(ps);

        // Only inject height script once per document load.
        // Re-injecting fires report() while picker outline is still on the DOM
        // → spurious height inflation on every element click.
        if (!doc.head.querySelector('[data-mk-height]')) {
            const hs = doc.createElement('script');
            hs.setAttribute('data-mk-height', 'true');
            hs.textContent = buildHeightScript(screen.id);
            doc.head.appendChild(hs);
        }

        iframeRef.current?.contentWindow?.postMessage(
            { type: '__mockit_set_picker__', screenId: screen.id, active: isEditingRef.current }, '*'
        );
    }, [screen.id]);

    useEffect(() => {
        if (skipRewriteRef.current) { skipRewriteRef.current = false; return; }
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return;

        // Empty screen → show animated skeleton, no picker needed
        if (isEmpty) {
            const onLoad = () => {
                const hs = doc.createElement('script');
                hs.textContent = buildHeightScript(screen.id);
                doc.head?.appendChild(hs);
            };
            iframe?.addEventListener('load', onLoad, { once: true });
            doc.open();
            doc.write(buildSkeletonHtml());
            doc.close();
            return () => iframe?.removeEventListener('load', onLoad);
        }

        let body = screen.html;
        const m = screen.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (m) body = m[1];

        const cleanBody = (body || '')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

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
<style>
*{box-sizing:border-box}
html{margin:0;padding:0;width:${MOBILE_WIDTH}px;overflow:hidden}
body{margin:0;padding:0;width:${MOBILE_WIDTH}px;min-height:700px;overflow-x:hidden;overflow-y:hidden;background:#fff}
.h-screen,.min-h-screen,.h-full{height:auto!important;min-height:0!important}
[style*="min-height: 100vh"],[style*="min-height:100vh"],[style*="height: 100vh"],[style*="height:100vh"]{height:auto!important;min-height:0!important}
</style>
</head><body class="bg-white text-gray-900 w-full">${cleanBody}</body></html>`);
        doc.close();

        return () => iframe?.removeEventListener('load', onLoad);
    }, [screen.html, isEmpty, injectScripts]);

    // ── sync picker active state whenever isEditing changes ──
    useEffect(() => {
        if (isEmpty) return;
        iframeRef.current?.contentWindow?.postMessage(
            { type: '__mockit_set_picker__', screenId: screen.id, active: isEditing }, '*'
        );
    }, [isEditing, screen.id, isEmpty]);

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
                const h = Math.max(700, e.data.height as number);
                setContentHeight(h);
                updateScreen(screen.id, { height: h });
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [screen.id, setSelectedElement, updateScreenHtml, updateScreen]);

    const takeScreenshot = useCallback(async () => {
        try {
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

    const submitRename = async () => {
        const oldId = screen.id;
        const newId = nameValue.trim();

        if (!newId || newId === oldId) {
            setRenaming(false);
            setNameValue(oldId);
            return;
        }

        // Optimistic local update
        updateScreen(oldId, { id: newId });
        setRenaming(false);

        if (projectId) {
            try {
                // Fetch current project content directly
                const { data: project, error: fetchErr } = await supabase
                    .from('projects')
                    .select('content')
                    .eq('id', projectId)
                    .single();

                if (fetchErr || !project) throw fetchErr;

                const content = project.content || { html: [], prompt: [] };
                if (content.html) {
                    let found = false;
                    for (const s of content.html) {
                        if (s.name === oldId) {
                            s.name = newId;
                            found = true;
                            break;
                        }
                    }

                    if (found) {
                        const { error: updateErr } = await supabase
                            .from('projects')
                            .update({ content })
                            .eq('id', projectId);
                        if (updateErr) throw updateErr;
                    }
                }
            } catch (err) {
                // Revert string on failure
                updateScreen(newId, { id: oldId });
                toast.error('Failed to rename screen on server');
            }
        }
    };

    const handleDelete = async () => {
        deleteScreen(screen.id);
        toast.success('Screen removed');

        if (projectId) {
            try {
                const { data: project, error: fetchErr } = await supabase
                    .from('projects')
                    .select('content')
                    .eq('id', projectId)
                    .single();

                if (fetchErr || !project) throw fetchErr;

                const content = project.content || { html: [], prompt: [] };
                if (content.html) {
                    content.html = content.html.filter((s: { name: string, code: string }) => s.name !== screen.id);
                    await supabase.from('projects').update({ content }).eq('id', projectId);
                }
            } catch {
                toast.error('Failed to sync deletion with server');
            }
        }
    };

    return (
        <motion.div
            className="drag-handle flex flex-col relative"
            style={{ width: frameWidth, height: scaledHeight + 40 }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                if (isSelected) setSelectedScreenId(null);
                else setSelectedScreenId(screen.id);
            }}
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
                    {isEmpty && (
                        <Badge className="bg-zinc-700/60 text-zinc-400 border-0 text-[10px] py-0 px-1.5 flex-shrink-0">
                            Empty
                        </Badge>
                    )}
                </div>

            </div>

            {/* Right side floating tools (pill) */}
            <div
                className={`nodrag nopan absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col items-center gap-5 py-8 px-4 transition-all duration-300 z-50
                    ${isSelected ? 'bg-violet-600' : 'bg-[#1e1e2e]'}
                    rounded-full border ${isSelected ? 'border-violet-500/50' : 'border-white/10'} shadow-2xl
                    ${isHovered || isSelected ? 'opacity-100 translate-x-full' : 'opacity-0 translate-x-[80%] pointer-events-none'}`}
                onClick={e => e.stopPropagation()}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost"
                            className={`w-[72px] h-[72px] rounded-full hover:bg-white/10 ${isEditing ? 'text-violet-200' : 'text-white/60 hover:text-white'}`}
                            onClick={() => {
                                setSelectedScreenId(screen.id);
                                setSidebarMode(isEditing ? 'prompt' : 'editor');
                            }}>
                            <MousePointer2 className="size-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={16}>{isEditing ? 'Exit Editor' : 'Element Editor'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="w-[72px] h-[72px] rounded-full text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => setHtmlViewModalScreenId(screen.id)}>
                            <Code2 className="size-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={16}>View HTML</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="w-[72px] h-[72px] rounded-full text-white/60 hover:text-white hover:bg-white/10"
                            onClick={takeScreenshot}>
                            <Camera className="size-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={16}>Screenshot</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="w-[72px] h-[72px] rounded-full text-white/60 hover:text-red-400 hover:bg-red-500/10"
                            onClick={handleDelete}>
                            <Trash2 className="size-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={16}>Delete</TooltipContent>
                </Tooltip>
            </div>

            {/* iframe body */}
            <div
                className={`relative rounded-b-xl border-2 transition-all duration-200 overflow-hidden bg-white
                    ${isEditing
                        ? 'border-violet-500 shadow-lg shadow-violet-500/25 ring-1 ring-violet-500/20'
                        : isSelected ? 'border-violet-500/40' : 'border-white/10'}`}
                style={{ height: scaledHeight }}
            >
                {(!isEditing || isEmpty) && (
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
                        pointerEvents: isEditing && !isEmpty ? 'auto' : 'none',
                        cursor: isEditing && !isEmpty ? 'crosshair' : 'default',
                        border: 'none',
                        display: 'block',
                    }}
                />

                <AnimatePresence>
                    {isEditing && !isEmpty && (
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
function HudBtn({ onClick, isDark, title, children, disabled }: {
    onClick: () => void; isDark: boolean; title: string; children: ReactNode; disabled?: boolean;
}) {
    return (
        <button onClick={onClick} title={title}
            className="nodrag nopan touch-manipulation flex-shrink-0 flex items-center justify-center transition-colors"
            disabled={disabled}
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
    const [capturing, setCapturing] = useState(false);
    const theme = useAppStore(s => s.theme);
    const setCanvasZoomStore = useAppStore(s => s.setCanvasZoom);
    const updateScreen = useAppStore(s => s.updateScreen);
    const isDark = theme === 'dark';

    const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow();
    const zoomIndicatorRef = useRef<HTMLSpanElement>(null);
    const flowRef = useRef<HTMLDivElement>(null);

    const takeCanvasScreenshot = useCallback(async () => {
        setCapturing(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const iframes = flowRef.current?.querySelectorAll<HTMLIFrameElement>('iframe');
            if (!iframes?.length) { toast.error('No screens to capture'); return; }

            const GAP = 40;
            const dpr = 3;
            const captures: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }[] = [];

            for (const iframe of Array.from(iframes)) {
                const doc = iframe.contentDocument;
                if (!doc?.body) continue;

                // @ts-ignore
                if (doc.fonts?.ready) await doc.fonts.ready;
                await new Promise(r => setTimeout(r, 200));

                const rect = iframe.getBoundingClientRect();
                const flowRect = flowRef.current!.getBoundingClientRect();

                const canvas = await html2canvas(doc.body, {
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    scale: dpr,
                    logging: false,
                });

                captures.push({
                    canvas,
                    x: rect.left - flowRect.left,
                    y: rect.top - flowRect.top,
                    w: rect.width * dpr,
                    h: rect.height * dpr,
                });
            }

            if (!captures.length) { toast.error('Nothing to capture'); return; }

            const minX = Math.min(...captures.map(c => c.x));
            const minY = Math.min(...captures.map(c => c.y));
            const maxX = Math.max(...captures.map(c => c.x + c.w / dpr));
            const maxY = Math.max(...captures.map(c => c.y + c.h / dpr));

            const out = document.createElement('canvas');
            out.width = (maxX - minX + GAP * 2) * dpr;
            out.height = (maxY - minY + GAP * 2) * dpr;

            const ctx = out.getContext('2d')!;
            ctx.fillStyle = isDark ? '#1a1a1d' : '#f4f4f5';
            ctx.fillRect(0, 0, out.width, out.height);

            for (const { canvas, x, y, w, h } of captures) {
                ctx.drawImage(canvas, (x - minX + GAP) * dpr, (y - minY + GAP) * dpr, w, h);
            }

            const link = document.createElement('a');
            link.download = 'canvas.png';
            link.href = out.toDataURL('image/png');
            link.click();
            toast.success('Screenshot downloaded!');
        } catch (e) {
            console.error(e);
            toast.error('Screenshot failed');
        } finally {
            setCapturing(false);
        }
    }, [isDark]);

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
                    <HudBtn onClick={takeCanvasScreenshot} isDark={isDark} disabled={capturing} title="Screenshot">
                        {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
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