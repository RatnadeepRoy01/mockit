'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

const EXAMPLE_PROMPTS = [
  'Build a dashboard with sales analytics and charts',
  'Create a todo list app with drag and drop',
  'Design a landing page for a SaaS product',
  'Build a real-time chat application',
];

export default function NewProjectPrompt() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {

    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const encodedPrompt = encodeURIComponent(prompt);
    router.push(`/projects/8`);
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-border border-t-blue-600 rounded-full animate-spin" />
          <p className="text-muted-foreground">Creating your project...</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl px-4">
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold text-foreground mb-4 text-balance">
              What do you want to create?
            </h1>
            <p className="text-lg text-muted-foreground">
              Describe your project and we&apos;ll build it for you
            </p>
          </div>

          {/* Input Section */}
          <div className="mb-8">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything to build..."
                className="w-full px-6 py-4 text-base bg-background text-foreground border-2 border-border rounded-2xl resize-none focus:outline-none focus:border-blue-600 transition-colors placeholder:text-muted-foreground"
                rows={4}
              />
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full w-10 h-10 p-0 flex items-center justify-center text-white"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Example Prompts */}
          <div>
            <p className="text-sm text-muted-foreground mb-3 font-medium">Quick start:</p>
            <div className="grid grid-cols-1 gap-2">
              {EXAMPLE_PROMPTS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-left px-4 py-3 border border-border rounded-lg hover:bg-accent hover:border-blue-600 transition-colors flex items-start gap-3 group"
                >
                  <Wand2 className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground">
                    {example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
