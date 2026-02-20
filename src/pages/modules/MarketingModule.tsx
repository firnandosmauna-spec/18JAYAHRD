import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { Trello, Users, FileText, MessageSquare } from 'lucide-react'; // Added MessageSquare
import { supabase } from '@/lib/supabase';
import { Pipeline } from '@/components/marketing/MarketingTypes';

// import PipelineView from '@/components/marketing/PipelineView'; // Removed
import ConsumerDatabaseView from '@/components/marketing/ConsumerDatabaseView';
import FollowUpView from '@/components/marketing/FollowUpView'; // Added FollowUpView import
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

    return (
        <ModuleLayout
            moduleId="marketing"
            title="Marketing & Sales"
            navItems={[
                { label: 'Master Konsumen', href: '/marketing/master', icon: Users },
                { label: 'Follow Up', href: '/marketing/followup', icon: MessageSquare }, // Added
                // { label: 'Progres Konsumen', href: '/marketing/progress', icon: Trello }, // Removed
                { label: 'Final Laporan Konsumen', href: '/marketing/final', icon: FileText },
            ]}
        >
            <Routes>
                <Route path="/" element={<Navigate to="master" replace />} />
                <Route path="master" element={<ConsumerDatabaseView />} />
                <Route path="followup" element={<FollowUpView />} /> {/* Added */}
                {/* <Route path="progress" element={<PipelineView pipelines={pipelines} loading={loading} onRefresh={fetchPipelines} />} /> Removed */}
                <Route path="final" element={<AkadProcessView pipelines={pipelines} onUpdate={fetchPipelines} />} />
            </Routes>
        </ModuleLayout>
    );
}
