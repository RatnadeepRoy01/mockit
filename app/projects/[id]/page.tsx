'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, use } from 'react';
import { useAppStore, type Screen as AppScreen, type Message as AppMessage, type SupabaseProject } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { PricingModal } from '@/components/PricingModal';
import { supabase } from '@/lib/supabaseClient';

const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
const Toolbar = dynamic(() => import('@/components/Toolbar'), { ssr: false });
const HtmlViewModal = dynamic(() => import('@/components/HtmlViewModal'), { ssr: false });
const ProjectSidebar = dynamic(() => import('@/components/projectSideBar').then(m => ({ default: m.ProjectSidebar })), { ssr: false });


function mapProjectData(
    data: SupabaseProject,
    setScreens: (screens: AppScreen[]) => void,
    setMessages: (messages: AppMessage[]) => void,
    setIsAiLoading: (loading: boolean) => void
) {
    if (data.content?.html) {
        setScreens(data.content.html.map((item, i) => ({
            id: item.name,
            html: item.code,
            x: 500 + i * 1100,
            y: 80,
            width: 920,
            height: 580,
        })));
    } else {
        setScreens([])
    }

    if (data.content?.prompt) {
        setMessages(data.content.prompt.map((m, i) => ({
            id: `msg-${i}-${Date.now()}`,
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text,
            timestamp: Date.now(),
        })));
    } else {
        setMessages([])
    }

    setIsAiLoading(data.processing || false);
}

export default function ProjectPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const { id } = use(paramsPromise);
    const isProjectSidebarOpen = useAppStore(state => state.isProjectSidebarOpen);
    const setIsProjectSidebarOpen = useAppStore(state => state.setIsProjectSidebarOpen);
    const theme = useAppStore(state => state.theme);
    const setProjectId = useAppStore(state => state.setProjectId);
    const setScreens = useAppStore(state => state.setScreens);
    const setIsAiLoading = useAppStore(state => state.setIsAiLoading);
    const setMessages = useAppStore(state => state.setMessages);
    const { user, loading } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false); // Mobile toggle
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!id || !user) return;

        setProjectId(id);
        supabase.from('projects').select('*').eq('id', id).single().then(({ data, error }) => {
            if (data && !error) mapProjectData(data, setScreens, setMessages, setIsAiLoading);
        });

        const channel = supabase
            .channel(`project:${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
                (payload) => mapProjectData(payload.new as SupabaseProject, setScreens, setMessages, setIsAiLoading)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, user, setProjectId, setScreens, setIsAiLoading, setMessages]);

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
        </main>
    );
}
