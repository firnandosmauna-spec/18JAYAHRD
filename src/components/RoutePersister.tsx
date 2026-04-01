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
        console.log('%c 📍 [PERSIST] Current Path:', 'background: #222; color: #bada55', fullPath);
        
        try {
            localStorage.setItem('lastVisitedPath', fullPath);
            const pathSegments = location.pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                const moduleName = pathSegments[0];
                const knownModules = ['hrd', 'accounting', 'inventory', 'customer', 'projects', 'marketing', 'sales', 'purchase', 'dashboard'];
                if (knownModules.includes(moduleName)) {
                    console.log(`%c 💾 [SAVE] lastPath_${moduleName} =`, 'background: #222; color: #00ff00', fullPath);
                    localStorage.setItem(`lastPath_${moduleName}`, fullPath);
                }
            }
        } catch (e) {
            console.error('❌ Error saving to localStorage:', e);
        }
    }, [location]);

    return null;
}
