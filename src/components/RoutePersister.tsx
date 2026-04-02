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
        const ignoredPaths = ['/login', '/auth', '/', '/reset-password', '/dashboard'];
        
        // Also ignore if we are at root or dashboard for the "Resume" feature
        // This ensures the LAST ACTUAL MODULE is preserved as the resumption point.
        if (ignoredPaths.includes(location.pathname)) {
            console.log(`%c ⏭️ [SKIP PERSIST] Path ${location.pathname} is in ignored list.`, 'color: #888');
            return;
        }

        const fullPath = location.pathname + location.search;
        
        // Skip updating if we are just at /dashboard and already have a module path saved?
        // Actually, we should always save the LAST page, but let's be careful with the dashboard.
        
        console.log('%c 📍 [PERSIST] Current Path:', 'background: #222; color: #bada55', fullPath);
        
        try {
            localStorage.setItem('lastVisitedPath', fullPath);
            const pathSegments = location.pathname.split('/').filter(Boolean);
            
            if (pathSegments.length > 0) {
                let moduleName = pathSegments[0];
                
                // Normalization for module mapping
                if (moduleName === 'project') moduleName = 'projects';

                const knownModules = ['hrd', 'accounting', 'inventory', 'customer', 'projects', 'marketing', 'sales', 'purchase'];
                if (knownModules.includes(moduleName)) {
                    // Update module-specific key
                    const storageKey = `lastPath_${moduleName}`;
                    localStorage.setItem(storageKey, fullPath);
                    console.log(`%c 💾 [PERSISTER] Global: lastVisitedPath=${fullPath} | Module: ${storageKey}=${fullPath}`, 'background: #222; color: #00ff00');
                }
            }
        } catch (e) {
            console.error('❌ Error saving to localStorage:', e);
        }
    }, [location]);

    return null;
}
