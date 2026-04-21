import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sopService } from '@/services/sopService';
import type { CompanySOP } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileText, CheckCircle, SkipForward, Edit } from 'lucide-react';

export function SopOverlay() {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sop, setSop] = useState<CompanySOP | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isAdminOrManager = user?.role === 'Administrator' || user?.role === 'manager';

    useEffect(() => {
        // Only run if authenticated
        if (!isAuthenticated || !user) {
            setIsOpen(false);
            return;
        }

        // Check if they've seen it this session
        const hasSeen = sessionStorage.getItem(`hasSeenSOP_${user.id}`);
        if (hasSeen === 'true') {
            setIsOpen(false);
            setIsLoading(false);
            return;
        }

        // Open immediately to show loading state if not seen
        setIsOpen(true);

        // Fetch SOP
        const fetchSOP = async () => {
            try {
                setIsLoading(true);
                const data = await sopService.getActiveSOP();

                if (data) {
                    setSop(data);
                    setEditTitle(data.title);
                    setEditContent(data.content);
                } else {
                    // Default placeholder if none exists
                    setEditTitle('Standard Operating Procedure');
                    setEditContent('Belum ada SOP yang diatur. Silakan hubungi Administrator.');
                }
            } catch (err) {
                console.error('Failed to load SOP:', err);
                // Even on error, we keep it open so they see the default or error msg
                setEditTitle('SOP Perusahaan');
                setEditContent('Gagal memuat SOP. Harap coba lagi nanti.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSOP();
    }, [isAuthenticated, user?.id]); // Use user.id specifically to avoid frequent triggers

    const handleDismiss = () => {
        if (user) {
            sessionStorage.setItem(`hasSeenSOP_${user.id}`, 'true');
        }
        setIsOpen(false);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const updated = await sopService.saveSOP(editTitle, editContent);
            if (updated) {
                setSop(updated);
                toast({
                    title: 'SOP Diperbarui',
                    description: 'SOP perusahaan berhasil disimpan.',
                });
            }
            setIsEditing(false);
        } catch (err: any) {
            toast({
                title: 'Gagal Menyimpan',
                description: err.message || 'Terjadi kesalahan saat menyimpan SOP',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // If we shouldn't show it, render nothing
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <div className="sm:max-w-5xl w-[95vw] h-[85vh] max-h-[95vh] flex flex-col gap-0 overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="bg-gradient-to-r from-[#0D7377] to-[#14A098] p-4 text-white text-center flex-shrink-0">
                    <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-display text-white text-center">
                            {isEditing ? 'Edit SOP Perusahaan' : (sop?.title || 'SOP Perusahaan')}
                        </h2>
                    </div>
                </div>

                <div className="p-4 sm:p-10 overflow-y-auto flex-grow flex flex-col">
                    {isLoading ? (
                        <div className="flex-grow flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#0D7377]" />
                        </div>
                    ) : isEditing ? (
                        <div className="space-y-4 flex-grow flex flex-col">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-gray-700">Judul SOP</label>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Masukkan judul SOP..."
                                    className="font-body"
                                />
                            </div>
                            <div className="flex-grow flex flex-col">
                                <label className="text-sm font-medium mb-1 block text-gray-700">Isi SOP / Peraturan</label>
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Ketikkan isi SOP di sini..."
                                    className="flex-grow font-body resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-sm max-w-none font-body whitespace-pre-wrap text-gray-700">
                            {sop?.content || "Belum ada Standar Operasional Prosedur yang ditetapkan."}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex sm:flex-row flex-col gap-2 justify-end items-center flex-shrink-0 sm:justify-between">
                    {isAdminOrManager && !isEditing && (
                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            className="w-full sm:w-auto font-body flex items-center gap-2 text-gray-600"
                        >
                            <Edit className="w-4 h-4" />
                            Edit SOP
                        </Button>
                    )}

                    {isEditing ? (
                        <div className="flex w-full sm:w-auto gap-2 justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="font-body"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || !editTitle || !editContent}
                                className="bg-[#0D7377] hover:bg-[#0D7377]/90 text-white font-body flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Simpan SOP
                            </Button>
                        </div>
                    ) : (
                        <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                            <Button
                                variant="ghost"
                                onClick={handleDismiss}
                                className="flex-1 sm:flex-none font-body text-gray-600 hover:text-gray-900 border"
                            >
                                <SkipForward className="w-4 h-4 mr-2" />
                                Skip
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                className="flex-1 sm:flex-none bg-[#0D7377] hover:bg-[#0D7377]/90 text-white font-body"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Setuju & Lanjutkan
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
