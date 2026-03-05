'use client';

import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function HtmlViewModal() {
    const htmlViewModalScreenId = useAppStore(state => state.htmlViewModalScreenId);
    const setHtmlViewModalScreenId = useAppStore(state => state.setHtmlViewModalScreenId);
    const screens = useAppStore(state => state.screens);
    const [copied, setCopied] = useState(false);

    const screen = screens.find((s) => s.id === htmlViewModalScreenId);

    // Extract body content if it's a full document
    let bodyContent = screen?.html || '';
    const bodyMatch = bodyContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
        bodyContent = bodyMatch[1];
    }

    const fullHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Google Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

  <!-- Tailwind + Iconify -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
  <style>
   
  </style>
</head>
<body class="bg-[var(--background)] text-[var(--foreground)] w-full">
  ${bodyContent}
</body>
</html>
    `.trim();

    const open = !!htmlViewModalScreenId && !!screen;

    const copyHtml = async () => {
        if (!screen) return;
        await navigator.clipboard.writeText(fullHtml);
        setCopied(true);
        toast.success('HTML copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };


    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) setHtmlViewModalScreenId(null); }}>
            <DialogContent className="max-w-3xl w-full bg-background border-border text-foreground p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-base font-bold">{screen?.id}</DialogTitle>
                        <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs">
                            Read-only
                        </Badge>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={copyHtml}
                        className={`gap-1.5 text-xs h-8 transition-colors ${copied ? 'text-emerald-500 hover:text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy HTML'}
                    </Button>
                </DialogHeader>

                <ScrollArea className="h-[520px]">
                    <pre className="p-6 text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap break-words">
                        {fullHtml}
                    </pre>
                </ScrollArea>

                <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {fullHtml.length.toLocaleString() ?? 0} characters
                    </span>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHtmlViewModalScreenId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground h-7"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
