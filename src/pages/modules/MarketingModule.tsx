import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { Trello, Users, FileText, MessageSquare, CheckCircle2, Table as TableIcon } from 'lucide-react'; // Added MessageSquare
import { supabase } from '@/lib/supabase';
import { Pipeline } from '@/components/marketing/MarketingTypes';

// import PipelineView from '@/components/marketing/PipelineView'; // Removed
import ConsumerDatabaseView from '@/components/marketing/ConsumerDatabaseView';
import FollowUpView from '@/components/marketing/FollowUpView'; // Added FollowUpView import
import PemberkasanView from '@/components/marketing/PemberkasanView';
import ControlTableView from '@/components/marketing/ControlTableView';
import AkadProcessView from '@/components/marketing/AkadProcessView';

export default function MarketingModule() {
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPipelines = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketing_pipelines')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPipelines(data || []);
        } catch (err) {
            console.error('Error fetching pipelines:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPipelines();

        // Realtime Subscription
        const channel = supabase
            .channel('marketing_pipelines_changes_main')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_pipelines' }, () => {
                fetchPipelines();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Determine the last visited sub-path for Marketing
    const savedPath = localStorage.getItem('lastPath_marketing');
    console.log('%c 🔍 [RESTORE] MarketingModule savedPath:', 'background: #222; color: #3498db', savedPath);

    return (
        <ModuleLayout
            moduleId="marketing"
            title="Marketing & Sales"
            navItems={[
                { label: 'Master Konsumen', href: '/marketing/master', icon: Users },
                { label: 'Follow Up', href: '/marketing/followup', icon: MessageSquare }, // Added
                { label: 'Pengerjaan Pemberkasan', href: '/marketing/pemberkasan', icon: CheckCircle2 },
                { label: 'Tabel Kontrol', href: '/marketing/kontrol', icon: TableIcon },
                { label: 'Final Laporan Konsumen', href: '/marketing/final', icon: FileText },
            ]}
        >
            <Routes>
                <Route index element={
                    savedPath && savedPath !== '/marketing' && savedPath.startsWith('/marketing') ? (
                        <Navigate to={savedPath} replace />
                    ) : (
                        <Navigate to="/marketing/master" replace />
                    )
                } />
                <Route path="master" element={<ConsumerDatabaseView />} />
                <Route path="followup" element={<FollowUpView />} /> {/* Added */}
                <Route path="pemberkasan" element={<PemberkasanView />} />
                <Route path="kontrol" element={<ControlTableView />} />
                <Route path="final" element={<AkadProcessView pipelines={pipelines} onUpdate={fetchPipelines} />} />
            </Routes>
        </ModuleLayout>
    );
}
