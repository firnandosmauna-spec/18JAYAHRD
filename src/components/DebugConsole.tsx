import React, { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronUp, ChevronDown, Copy, Trash, Activity } from 'lucide-react';

export function DebugConsole() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isTesting, setIsTesting] = useState(false);
    const { user, session, isLoading } = useAuth();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial load
        setLogs(logger.getLogs());

        // Subscribe to changes
        const unsubscribe = logger.subscribe((newLogs) => {
            setLogs([...newLogs]); // Create copy to trigger re-render
        });

        return () => unsubscribe();
    }, []);

    const clearLogs = () => {
        logger.clearLogs();
    };

    const copyLogs = () => {
        const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`).join('\n');
        navigator.clipboard.writeText(text);
        logger.addLog('Logs copied to clipboard', 'success');
    };

    const testConnection = async () => {
        setIsTesting(true);
        logger.addLog('🚀 Starting connection test...', 'info');

        try {
            const start = Date.now();
            const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const duration = Date.now() - start;

            if (error) {
                throw error;
            }

            logger.addLog(`✅ Connection successful (${duration}ms)`, 'success', { count });
        } catch (error: any) {
            logger.addLog('❌ Connection failed', 'error', { message: error.message, code: error.code });
        } finally {
            setIsTesting(false);
        }
    };

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="secondary"
                    className="shadow-lg bg-gray-900 text-white hover:bg-gray-800"
                >
                    <Activity className="w-4 h-4 mr-2" />
                    Debug Mode
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 text-gray-100 border-t border-gray-800 shadow-2xl h-[400px] flex flex-col font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="font-bold">System Debugger</span>
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                        {logs.length} events
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={testConnection} disabled={isTesting} className="h-7 text-xs hover:bg-gray-800">
                        {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={copyLogs} className="h-7 w-7 p-0 hover:bg-gray-800">
                        <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearLogs} className="h-7 w-7 p-0 hover:bg-gray-800">
                        <Trash className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0 hover:bg-gray-800">
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* State Monitor */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900/50 border-b border-gray-800 text-xs">
                <div>
                    <span className="text-gray-500">Auth Status:</span>{' '}
                    <span className={user ? 'text-green-400' : 'text-yellow-400'}>
                        {user ? 'Authenticated' : 'Guest'}
                    </span>
                </div>
                <div>
                    <span className="text-gray-500">Loading:</span>{' '}
                    <span className={isLoading ? 'text-blue-400' : 'text-gray-400'}>
                        {isLoading ? 'Yes' : 'No'}
                    </span>
                </div>
                <div className="truncate">
                    <span className="text-gray-500">Session ID:</span>{' '}
                    <span className="text-gray-400">
                        {session ? session.access_token.substring(0, 10) + '...' : 'None'}
                    </span>
                </div>
            </div>

            {/* Logs Area */}
            <ScrollArea className="flex-1 bg-gray-950 p-2">
                <div className="space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 border-b border-gray-900/50 pb-1 last:border-0 hover:bg-gray-900/30">
                            <span className="text-gray-500 shrink-0 w-20 truncate" title={log.timestamp}>
                                {log.timestamp.split('T')[1].split('.')[0]}
                            </span>
                            <span className={`shrink-0 w-16 font-bold ${log.type === 'error' ? 'text-red-500' :
                                    log.type === 'success' ? 'text-green-500' :
                                        log.type === 'warning' ? 'text-yellow-500' :
                                            'text-blue-400'
                                }`}>
                                [{log.type.toUpperCase()}]
                            </span>
                            <span className="text-gray-300 break-all">
                                {log.message}
                                {log.data && (
                                    <pre className="mt-1 text-[10px] text-gray-500 bg-gray-900 p-1 rounded overflow-x-auto">
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                )}
                            </span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>
        </div>
    );
}
