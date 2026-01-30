import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function DiagnosticOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        // Hidden toggle: triple click the top left corner (or just auto-show if error detected)
        const check = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
                setStatus({
                    connected: true,
                    user_email: user?.email,
                    profile_role: profile?.role,
                    profile_modules: profile?.modules,
                    url: import.meta.env.VITE_SUPABASE_URL
                });
            } catch (e: any) {
                setStatus({ connected: false, error: e.message });
            }
        };
        check();
    }, []);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 left-4 px-6 py-3 bg-red-600 text-white font-bold rounded-full z-[9999] shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse border-2 border-white flex items-center gap-2 hover:scale-110 transition-transform"
            >
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                DITELITI: KLIK UNTUK INFO DEBUG
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a]/95 z-[9999] text-[#00ff00] p-8 font-mono overflow-auto border-4 border-red-600">
            <div className="flex justify-between items-start mb-6 border-b-2 border-red-600 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-red-600 italic tracking-tighter">ADVANCED SYSTEM DIAGNOSTICS</h2>
                    <p className="text-xs text-red-400 mt-1 opacity-80">AGENT: ANTIGRAVITY // TASK: FIX_EMPLOYEE_BUTTON</p>
                </div>
                <button onClick={() => setIsVisible(false)} className="bg-red-600 text-white px-6 py-2 font-bold hover:bg-red-700 transition-colors">CLOSE [ESC]</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="bg-[#111] p-4 border border-white/10 rounded">
                    <h3 className="mb-2 font-bold text-yellow-500 flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        USER AUTH STATE
                    </h3>
                    <pre className="text-[10px] leading-tight">
                        {JSON.stringify(status, (k, v) => k === 'url' ? 'REDACTED' : v, 2)}
                    </pre>
                </section>

                <section className="bg-[#111] p-4 border border-white/10 rounded">
                    <h3 className="mb-2 font-bold text-blue-500 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        RUNTIME DATA
                    </h3>
                    <pre className="text-[10px] leading-tight">
                        {JSON.stringify({
                            SCREEN: `${window.innerWidth}x${window.innerHeight}`,
                            UA: navigator.userAgent.substring(0, 50) + '...',
                            TOUCH: 'ontouchstart' in window,
                            LANG: navigator.language
                        }, null, 2)}
                    </pre>
                </section>

                <section className="bg-[#111] p-4 border border-white/10 rounded text-xs">
                    <h3 className="mb-2 font-bold text-red-500 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]" />
                        CRITICAL ERROR LOGS
                    </h3>
                    <div className="space-y-1 opacity-80 max-h-[200px] overflow-auto">
                        <p className="text-[10px]">[INIT] Supabase connection: {status?.connected ? 'OK' : 'FAIL'}</p>
                        <p className="text-[10px]">[AUTH] User ID: {status?.user_id?.substring(0, 8) || 'NONE'}</p>
                        <p className="text-[10px] text-yellow-400">[DEBUG] Check Console (F12) for "🔥🔥 GLOBAL CLICK"</p>
                    </div>
                </section>
            </div>

            <div className="mt-8 p-6 bg-red-950/30 border-2 border-red-900 rounded-xl">
                <h3 className="font-bold text-white mb-4">EMERGENCY ACTIONS</h3>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
                        className="bg-white text-black font-bold px-6 py-3 hover:bg-gray-200 transition-colors"
                    >
                        COMPLETE FACTORY RESET (Wipe Storage)
                    </button>
                    <button
                        onClick={() => window.location.href = '/auth'}
                        className="border-2 border-white text-white font-bold px-6 py-3 hover:bg-white/10 transition-colors"
                    >
                        RE-AUTH (Goto Login)
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="border-2 border-yellow-500 text-yellow-500 font-bold px-6 py-3 hover:bg-yellow-500/10 transition-colors"
                    >
                        FORCE RELOAD
                    </button>
                </div>
            </div>
        </div>
    );
}
