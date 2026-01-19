import { memo, useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Memoized row component for performance
const TimelineRow = memo(({ data, index, style }) => {
    const { items, formatActivityAction } = data;
    const item = items[index];

    if (!item) return null;

    return (
        <div style={style} className="px-4 py-2">
            <div className="flex gap-3 text-sm group">
                <div className="shrink-0 pt-1">
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={item.user?.avatar || item.performer?.avatar} />
                        <AvatarFallback className="text-xs bg-muted">
                            {(item.user?.name || item.performer?.name || '?').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground text-xs truncate">
                            {item.user?.name || item.performer?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : ''}
                        </span>
                    </div>
                    {item.type === 'comment' ? (
                        <div className="bg-muted/30 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-border/50 text-foreground shadow-sm">
                            <p className="whitespace-pre-wrap leading-relaxed text-sm">{item.content}</p>
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            {formatActivityAction ? formatActivityAction(item) : "Action performed"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

TimelineRow.displayName = 'TimelineRow';

/**
 * VirtualizedTimeline component
 * Renders a virtualized list of timeline items (comments + activities)
 * Only renders visible items, significantly improving performance for long lists
 */
export function VirtualizedTimeline({
    items = [],
    formatActivityAction,
    height = 400,
    onLoadMore,
    hasMore = false,
    isLoading = false
}) {
    const listRef = useRef(null);
    const outerRef = useRef(null);

    // Handle scroll to load more
    const handleScroll = useCallback(({ scrollOffset, scrollDirection }) => {
        // Load more when scrolled near the top (for older items)
        if (scrollDirection === 'backward' && scrollOffset < 50 && hasMore && !isLoading && onLoadMore) {
            onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore]);

    // Scroll to bottom (newest items)
    const scrollToBottom = useCallback(() => {
        if (listRef.current && items.length > 0) {
            listRef.current.scrollToItem(items.length - 1, 'end');
        }
    }, [items.length]);

    // Empty state
    if (items.length === 0) {
        return (
            <div className="text-center text-xs text-muted-foreground py-8 opacity-50">
                No activity yet.
            </div>
        );
    }

    // Calculate dynamic item size (comments are taller than activities)
    const getItemSize = (index) => {
        const item = items[index];
        if (item?.type === 'comment') {
            // Estimate based on content length
            const contentLength = item.content?.length || 0;
            const lines = Math.ceil(contentLength / 50);
            return Math.max(80, 60 + (lines * 20));
        }
        return 50; // Activity items are smaller
    };

    // Use VariableSizeList for dynamic heights
    const itemData = { items, formatActivityAction };

    return (
        <div className="relative h-full">
            {isLoading && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm py-2 text-center">
                    <span className="text-xs text-muted-foreground animate-pulse">Loading more...</span>
                </div>
            )}
            <List
                ref={listRef}
                outerRef={outerRef}
                height={height}
                width="100%"
                itemCount={items.length}
                itemSize={70} // Average size for FixedSizeList
                itemData={itemData}
                onScroll={handleScroll}
                overscanCount={5}
                initialScrollOffset={items.length * 70} // Start at bottom
            >
                {TimelineRow}
            </List>
        </div>
    );
}
