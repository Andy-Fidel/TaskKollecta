import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce hook - delays calling callback until after wait milliseconds 
 * since the last time this function was invoked
 */
export function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounced callback hook - returns a memoized debounced version of the callback
 */
export function useDebouncedCallback(callback, delay = 500) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * Hook for debounced socket emissions
 * Useful for live collaboration features like description editing
 */
export function useDebouncedSocket(socket, eventName, delay = 500) {
    const timeoutRef = useRef(null);

    const emit = useCallback((data) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            if (socket) {
                socket.emit(eventName, data);
            }
        }, delay);
    }, [socket, eventName, delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return emit;
}
