import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that listens to route changes and saves the current path to localStorage.
 * This allows the application to restore the last visited page after a reload or PWA restart.
 */
export function RoutePersister() {
    const location = useLocation();

    useEffect(() => {
        // List of paths that should NOT be persisted
        const ignoredPaths = ['/login', '/auth', '/', '/reset-password'];

        // Also ignore if we are at root
        if (ignoredPaths.includes(location.pathname)) {
            return;
        }

        const fullPath = location.pathname + location.search;
        // console.log('📍 Saving route:', fullPath);
        localStorage.setItem('lastVisitedPath', fullPath);
    }, [location]);

    return null;
}
