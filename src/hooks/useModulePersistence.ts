import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to manage route persistence for a specific module.
 * It handles getting the last visited sub-path and auto-updating the global lastVisitedPath.
 */
export function useModulePersistence(moduleId: string) {
    const location = useLocation();
    const storageKey = `lastPath_${moduleId.replace('project', 'projects')}`;
    
    // Initial fetch of the saved path
    const [savedPath] = useState<string | null>(() => {
        const path = localStorage.getItem(storageKey);
        // Ensure the path is actually for this module
        if (path && path.startsWith(`/${moduleId}`)) return path;
        if (path && moduleId === 'project' && path.startsWith('/projects')) return path;
        return null;
    });

    // Auto-update the module-specific and global path whenever the location changes
    useEffect(() => {
        const fullPath = location.pathname + location.search;
        const ignoredPaths = ['/login', '/auth', '/', '/reset-password', '/dashboard'];
        
        if (ignoredPaths.includes(location.pathname)) return;

        // Check if the current location belongs to this module
        const belongsToModule = location.pathname.startsWith(`/${moduleId}`) || 
                               (moduleId === 'project' && location.pathname.startsWith('/projects'));
        
        if (belongsToModule) {
            localStorage.setItem(storageKey, fullPath);
            localStorage.setItem('lastVisitedPath', fullPath);
            // console.log(`%c 💾 [MODULE ${moduleId}] Saved:`, 'color: #3498db', fullPath);
        }
    }, [location.pathname, location.search, moduleId, storageKey]);

    return { savedPath };
}
