'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Search, Loader2, FolderOpen } from 'lucide-react';
import { AddProjectModal } from './projectDialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  updated_at: string;
}

interface ProjectSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelect?: (projectId: string) => void;
}

export function ProjectSidebar({ isOpen, onOpenChange, onProjectSelect }: ProjectSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isOpen && user) fetchProjects();
  }, [isOpen, user]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProject = async (name: string) => {
    if (!user) return toast.error('You must be logged in to create a project');
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name, user_id: user.id, content: {}, processing: false }])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setProjects((prev) => [data, ...prev]);
        toast.success(`"${name}" created`);
        onProjectSelect?.(data.id);
        router.push(`/projects/${data.id}`);
        onOpenChange(false);
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => onOpenChange(false)}
        />
      )}

      <div
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 200ms ease' }}
        className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 ${!isOpen ? 'pointer-events-none' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Projects</span>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 border-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={() => { onProjectSelect?.(project.id); onOpenChange(false); }}
                className="flex flex-col px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group"
              >
                <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {project.name}
                </span>
                <span className="text-[11px] text-zinc-400 mt-0.5">
                  {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-28 gap-1.5">
              <FolderOpen className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
              <span className="text-xs text-zinc-400">No projects found</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              if (!user) return toast.error('Please sign in to create projects');
              setIsModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProject}
      />
    </>
  );
}