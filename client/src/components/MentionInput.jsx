import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * MentionInput - Textarea with @mention autocomplete
 * 
 * @param {Object} props
 * @param {string} props.value - Current text value
 * @param {function} props.onChange - Called when text changes
 * @param {Array} props.users - Array of users for autocomplete [{_id, name, avatar}]
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional classes
 * @param {function} props.onSubmit - Called when Enter is pressed (without shift)
 */
export function MentionInput({
    value,
    onChange,
    users = [],
    placeholder = "Write a comment...",
    className,
    onSubmit
}) {
    const textareaRef = useRef(null);
    const dropdownRef = useRef(null);

    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Filter users based on mention query
    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);

    // Detect @ trigger and extract query
    const detectMention = useCallback((text, cursorPos) => {
        const textBeforeCursor = text.substring(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setMentionQuery(atMatch[1]);
            setShowMentions(true);
            setMentionIndex(0);

            // Calculate dropdown position
            if (textareaRef.current) {
                const textarea = textareaRef.current;
                const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
                const lines = textBeforeCursor.split('\n');
                const currentLineIndex = lines.length - 1;

                setDropdownPosition({
                    top: (currentLineIndex + 1) * lineHeight + 8,
                    left: 0
                });
            }
        } else {
            setShowMentions(false);
            setMentionQuery('');
        }
    }, []);

    // Handle text change
    const handleChange = (e) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;

        onChange(newValue);
        setCursorPosition(newCursorPos);
        detectMention(newValue, newCursorPos);
    };

    // Insert mention at cursor position
    const insertMention = (user) => {
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);

        // Find the @ symbol position
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        if (!atMatch) return;

        const atPosition = textBeforeCursor.lastIndexOf('@');
        const beforeAt = value.substring(0, atPosition);

        // Use first name for the mention (matches backend regex)
        const firstName = user.name.split(' ')[0];
        const newValue = `${beforeAt}@${firstName} ${textAfterCursor}`;

        onChange(newValue);
        setShowMentions(false);
        setMentionQuery('');

        // Focus back on textarea
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = atPosition + firstName.length + 2; // @name + space
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (showMentions && filteredUsers.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setMentionIndex(prev =>
                        prev < filteredUsers.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setMentionIndex(prev =>
                        prev > 0 ? prev - 1 : filteredUsers.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    insertMention(filteredUsers[mentionIndex]);
                    break;
                case 'Escape':
                    setShowMentions(false);
                    break;
                case 'Tab':
                    e.preventDefault();
                    insertMention(filteredUsers[mentionIndex]);
                    break;
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (onSubmit) onSubmit(e);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowMentions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn("min-h-[80px] resize-none", className)}
            />

            {/* Mentions Dropdown */}
            {showMentions && filteredUsers.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left
                    }}
                >
                    <div className="py-1">
                        {filteredUsers.map((user, index) => (
                            <button
                                key={user._id}
                                type="button"
                                onClick={() => insertMention(user)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                                    index === mentionIndex
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted"
                                )}
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="text-xs">
                                        {user.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate">{user.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state when no matches */}
            {showMentions && mentionQuery && filteredUsers.length === 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg p-3"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left
                    }}
                >
                    <p className="text-sm text-muted-foreground text-center">
                        No users found
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Helper to render comment text with highlighted @mentions
 */
export function renderMentions(text) {
    if (!text) return null;

    const parts = text.split(/(@\w+)/g);

    return parts.map((part, index) => {
        if (part.match(/^@\w+$/)) {
            return (
                <span
                    key={index}
                    className="text-primary font-medium bg-primary/10 px-1 rounded"
                >
                    {part}
                </span>
            );
        }
        return part;
    });
}
