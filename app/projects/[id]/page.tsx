'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, use } from 'react';
import { useAppStore, type Screen as AppScreen, type Message as AppMessage, type SupabaseProject } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { PricingModal } from '@/components/PricingModal';
import { supabase } from '@/lib/supabaseClient';
import { AddProjectModal } from '@/components/projectDialog';
import { toast } from 'sonner';

const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const Toolbar = dynamic(() => import('@/components/Toolbar'), { ssr: false });
const HtmlViewModal = dynamic(() => import('@/components/HtmlViewModal'), { ssr: false });
const ProjectSidebar = dynamic(() => import('@/components/projectSideBar').then(m => ({ default: m.ProjectSidebar })), { ssr: false });


// ── Stable hash to avoid redundant updates ──────────────────────────────────
let lastDataVersion = "";

const welcomeMsg: AppMessage = {
    id: 'msg-0',
    role: 'assistant',
    content: "Hi! I'm your AI design assistant. Describe what screens you'd like to generate and I'll build them for you.\n\nYou can also switch to **Element Editor** mode to visually tweak any element on the canvas.",
    timestamp: 0,
};

function mapProjectData(
    data: SupabaseProject,
    setScreens: (screens: AppScreen[]) => void,
    setMessages: (messages: AppMessage[]) => void,
    setIsAiLoading: (loading: boolean) => void
) {
    // Basic structural hash to see if content changed
    const version = `${data.updated_at}-${data.processing}-${JSON.stringify(data.content || {})}`;
    if (version === lastDataVersion) return;
    lastDataVersion = version;

    if (data.content?.html && data.content.html.length > 0) {
        setScreens(data.content.html.map((item, i) => ({
            id: item.name,
            html: item.code,
            x: 500 + i * 1100,
            y: 80,
            width: 920,
            height: 580,
        })));
    }

    if (data.content?.prompt && data.content.prompt.length > 0) {
        const dbMsgs = data.content.prompt.map((m, i) => ({
            id: `msg-${i + 1}`,
            role: (m.role === 'ai') ? 'assistant' as const : 'user' as const,
            content: m.text,
            timestamp: 0,
        }));
        setMessages([welcomeMsg, ...dbMsgs]);
    }

    setIsAiLoading(data.processing || false);
}

export default function ProjectPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const { id } = use(paramsPromise);
    const isProjectSidebarOpen = useAppStore(state => state.isProjectSidebarOpen);
    const setIsProjectSidebarOpen = useAppStore(state => state.setIsProjectSidebarOpen);
    const theme = useAppStore(state => state.theme);
    const projectId = useAppStore(state => state.projectId);
    const setProjectId = useAppStore(state => state.setProjectId);
    const setScreens = useAppStore(state => state.setScreens);
    const setIsAiLoading = useAppStore(state => state.setIsAiLoading);
    const setMessages = useAppStore(state => state.setMessages);
    const { user, loading } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false); // Mobile toggle
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {

        if (!id || !user) return;

        if (id != projectId) {
            setProjectId(id);
            setScreens([]);
            setMessages([welcomeMsg]);
            setIsAiLoading(false);
        }
        supabase.from('projects').select('*').eq('id', id).single().then(({ data, error }) => {
            if (data && !error) {
                mapProjectData(data, setScreens, setMessages, setIsAiLoading);
            } else {
                console.error('Project not found or error:', error);
                setIsAddModalOpen(true);
            }
        });

        const channel = supabase
            .channel(`project:${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
                (payload) => mapProjectData(payload.new as SupabaseProject, setScreens, setMessages, setIsAiLoading)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, user, setProjectId, setScreens, setIsAiLoading, setMessages]);

    const handleAddProject = async (name: string) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([{ name, user_id: user.id, content: {}, processing: false }])
                .select()
                .single();

            if (data && !error) {
                toast.success(`"${name}" created`);
                router.push(`/projects/${data.id}`);
            }
            setIsAddModalOpen(false);
        } catch {
            toast.error('Failed to create project');
        }
    };

    if (loading) return (
        <div className={`flex items-center justify-center h-screen ${theme === 'dark' ? 'bg-[#0d0d14]' : 'bg-[#f5f3ff]'}`}>
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    return (
        <main
            className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
            style={{ background: theme === 'dark' ? '#0d0d14' : '#F0F0F0' }}
        >
            <Toolbar onToggleChat={() => setIsChatSidebarOpen(!isChatSidebarOpen)} />
            <PricingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

            <div className="flex flex-1 overflow-hidden min-h-0 p-2 md:px-6 md:pb-4 gap-2 md:gap-4 relative">
                {/* Canvas always visible */}
                <Canvas />

                {/* Sidebar Drawer on Mobile / Fixed Panel on Desktop */}
                <div
                    className={`
                        fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity md:hidden
                        ${isChatSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                    onClick={() => setIsChatSidebarOpen(false)}
                />

                <div className={`
                    fixed right-2 top-14 bottom-2 z-[70] w-[calc(100%-16px)] max-w-[360px] transform transition-transform duration-300 ease-out 
                    md:relative md:top-0 md:right-0 md:bottom-0 md:z-auto md:w-[340px] md:transform-none
                    ${isChatSidebarOpen ? 'translate-x-0' : 'translate-x-[110%] md:translate-x-0'}
                `}>
                    <Sidebar projectId={id} onClose={() => setIsChatSidebarOpen(false)} />
                </div>
            </div>

            <ProjectSidebar isOpen={isProjectSidebarOpen} onOpenChange={setIsProjectSidebarOpen} />
            <HtmlViewModal />
            <AddProjectModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddProject}
            />
        </main>
    );
}
