'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string) => void;
}

export function AddProjectModal({ isOpen, onClose, onAdd }: AddProjectModalProps) {
    const [projectName, setProjectName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim()) return;
        setIsSubmitting(true);
        setTimeout(() => {
            onAdd(projectName);
            setProjectName('');
            setIsSubmitting(false);
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xs w-full rounded-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">New Project</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Give your project a name to get started.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="projectName" className="text-sm font-medium">
                            Project Name
                        </Label>
                        <Input
                            id="projectName"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. Landing Page Redesign"
                            disabled={isSubmitting}
                            autoFocus
                            className="h-10 text-sm"
                        />
                    </div>

                    <DialogFooter className="flex flex-row justify-center gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-10 w-24"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!projectName.trim() || isSubmitting}
                            className="h-10 w-24"
                        >
                            {isSubmitting ? 'Creating…' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
