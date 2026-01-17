import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

// Hook to register global keyboard shortcuts
export function useKeyboardShortcuts() {
    const navigate = useNavigate();
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input/textarea
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // ? - Show shortcuts help
            if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setShowHelp(prev => !prev);
                return;
            }

            // G + <key> navigation (vim-style)
            if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
                // Wait for next key
                const handleSecondKey = (e2) => {
                    e2.preventDefault();
                    switch (e2.key) {
                        case 'd': navigate('/dashboard'); break;
                        case 'p': navigate('/projects'); break;
                        case 't': navigate('/tasks'); break;
                        case 'c': navigate('/calendar'); break;
                        case 'm': navigate('/team'); break;
                        case 's': navigate('/settings'); break;
                    }
                    document.removeEventListener('keydown', handleSecondKey);
                };
                document.addEventListener('keydown', handleSecondKey, { once: true });
                // Auto-cleanup after 1 second
                setTimeout(() => {
                    document.removeEventListener('keydown', handleSecondKey);
                }, 1000);
                return;
            }

            // Escape - Close help
            if (e.key === 'Escape') {
                setShowHelp(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    return { showHelp, setShowHelp };
}

// Keyboard Shortcuts Help Dialog Component
export function KeyboardShortcutsHelp({ open, onOpenChange }) {
    const shortcuts = [
        {
            category: 'Global', items: [
                { keys: ['⌘', 'K'], description: 'Open command palette / search' },
                { keys: ['?'], description: 'Show keyboard shortcuts' },
            ]
        },
        {
            category: 'Navigation (press G then...)', items: [
                { keys: ['G', 'D'], description: 'Go to Dashboard' },
                { keys: ['G', 'P'], description: 'Go to Projects' },
                { keys: ['G', 'T'], description: 'Go to Tasks' },
                { keys: ['G', 'C'], description: 'Go to Calendar' },
                { keys: ['G', 'M'], description: 'Go to Team' },
                { keys: ['G', 'S'], description: 'Go to Settings' },
            ]
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {shortcuts.map((section) => (
                        <div key={section.category}>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3">{section.category}</h4>
                            <div className="space-y-2">
                                {section.items.map((shortcut, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm text-foreground">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <kbd
                                                    key={j}
                                                    className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-center text-muted-foreground">
                    Press <kbd className="px-1 py-0.5 text-xs bg-muted border border-border rounded">Esc</kbd> to close
                </p>
            </DialogContent>
        </Dialog>
    );
}
