import { create } from 'zustand';

export type SidebarMode = 'prompt' | 'editor';
export type Theme = 'dark' | 'light';


interface HtmlItem {
    name: string;
    code: string;
}

interface PromptItem {
    role: 'user' | 'ai';
    text: string;
}

interface ProjectContent {
    html?: HtmlItem[];
    prompt?: PromptItem[];
}

export interface SupabaseProject {
    id: string;
    name: string;
    user_id: string;
    content?: ProjectContent;
    processing?: boolean;
    project_visual_des?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Screen {
  id: string;
  html: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: string;
  borderRadius?: string;
  padding?: string;
  border?: string;
  opacity?: string;
  letterSpacing?: string;
  lineHeight?: string;
  textDecoration?: string;
  fontStyle?: string;
}

export interface SelectedElement {
  screenId: string;
  mkId: string;          // data-mk-id assigned to the DOM element inside iframe
  selector: string;
  tagName: string;
  textContent: string;
  style: ElementStyle;
  innerHTML: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AppState {
  // ── Screens ──────────────────────────────────────────────────────────────
  screens: Screen[];
  /** Called ONLY by the AI backend response to spawn new screens */
  spawnScreensFromAI: (htmlBlocks: { name: string; html: string }[]) => void;
  updateScreen: (id: string, updates: Partial<Screen>) => void;
  deleteScreen: (id: string) => void;
  updateScreenHtml: (id: string, html: string) => void;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;

  // ── Selection ─────────────────────────────────────────────────────────────
  selectedScreenId: string | null;
  setSelectedScreenId: (id: string | null) => void;
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;

  // ── Canvas ────────────────────────────────────────────────────────────────
  canvasZoom: number;
  setCanvasZoom: (zoom: number) => void;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: (offset: { x: number; y: number }) => void;

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: Theme;
  toggleTheme: () => void;

  // ── Chat ──────────────────────────────────────────────────────────────────
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;

  // ── Modals ────────────────────────────────────────────────────────────────
  htmlViewModalScreenId: string | null;
  setHtmlViewModalScreenId: (id: string | null) => void;

  // ── Project Sidebar ───────────────────────────────────────────────────────
  isProjectSidebarOpen: boolean;
  setIsProjectSidebarOpen: (v: boolean) => void;

  // ── AI state ──────────────────────────────────────────────────────────────
  isAiLoading: boolean;
  setIsAiLoading: (v: boolean) => void;

  // ── Project ID ────────────────────────────────────────────────────────────
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  setScreens: (screens: Screen[]) => void;
  setMessages: (messages: Message[]) => void;
}


// ─── ID counter ──────────────────────────────────────────────────────────────
let _idCounter = 4;
const newId = () => `s${_idCounter++}`;

// ─── Layout helper: auto-place screens in a flow grid ───────────────────────
function autoPlace(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 60 + col * 980, y: 80 + row * 680 };
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
  screens: [],

  /** Spawns one screen per HTML block returned by the AI backend */
  spawnScreensFromAI: (htmlBlocks) => {
    const total = htmlBlocks.length;
    const newScreens: Screen[] = htmlBlocks.map((block, i) => {
      const pos = autoPlace(i, total);
      return {
        id: newId(),
        name: block.name,
        html: block.html,
        x: pos.x,
        y: pos.y,
        width: 920,
        height: 580,
      };
    });
    set((state) => ({ screens: [...state.screens, ...newScreens] }));
  },

  updateScreen: (id, updates) =>
    set((state) => ({
      screens: state.screens.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  deleteScreen: (id) =>
    set((state) => ({
      screens: state.screens.filter((s) => s.id !== id),
      selectedScreenId:
        state.selectedScreenId === id ? null : state.selectedScreenId,
      selectedElement:
        state.selectedElement?.screenId === id ? null : state.selectedElement,
    })),

  updateScreenHtml: (id, html) =>
    set((state) => ({
      screens: state.screens.map((s) => (s.id === id ? { ...s, html } : s)),
    })),

  // ── Sidebar ──
  sidebarMode: 'prompt',
  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  // ── Selection ──
  selectedScreenId: null,
  setSelectedScreenId: (id) => set({ selectedScreenId: id }),
  selectedElement: null,
  setSelectedElement: (el) => set({ selectedElement: el }),

  // ── Canvas ──
  canvasZoom: 0.5,
  setCanvasZoom: (zoom) =>
    set({ canvasZoom: Math.min(2, Math.max(0.15, zoom)) }),
  canvasOffset: { x: 0, y: 0 },
  setCanvasOffset: (offset) => set({ canvasOffset: offset }),

  // ── Theme ──
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  // ── Chat ──
  messages: [
    {
      id: 'msg-0',
      role: 'assistant',
      content:
        "Hi! I'm your AI design assistant. Describe what screens you'd like to generate and I'll build them for you.\n\nYou can also switch to **Element Editor** mode to visually tweak any element on the canvas.",
      timestamp: Date.now(),
    },
  ],
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: `msg-${state.messages.length}`, timestamp: Date.now() },
      ],
    })),

  // ── Modals ──
  htmlViewModalScreenId: null,
  setHtmlViewModalScreenId: (id) => set({ htmlViewModalScreenId: id }),

  // ── Project Sidebar ──
  isProjectSidebarOpen: false,
  setIsProjectSidebarOpen: (v) => set({ isProjectSidebarOpen: v }),

  // ── AI ──
  isAiLoading: false,
  setIsAiLoading: (v: boolean) => void set({ isAiLoading: v }),

  // ── Project ──
  projectId: null,
  setProjectId: (id) => set({ projectId: id }),
  setScreens: (screens) => set({ screens }),
  setMessages: (messages) => set({ messages }),
}));
