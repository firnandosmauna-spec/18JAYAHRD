import React from 'react';
import { ConsumerProfile } from './MarketingTypes';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConsumerBioDataProps {
    consumer: ConsumerProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ConsumerBioData({ consumer, isOpen, onClose }: ConsumerBioDataProps) {
    if (!consumer) return null;

    const handlePrint = () => {
        window.print();
    };

    const Field = ({ label, value }: { label: string, value: any }) => (
        <div className="flex border-b border-gray-100 py-2">
            <div className="w-1/3 text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</div>
            <div className="w-2/3 text-gray-900 text-sm font-semibold">{value || '-'}</div>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="bg-gray-50 px-3 py-1 border-l-4 border-blue-600 mb-2 mt-6">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</h3>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none bg-slate-100/50 backdrop-blur-sm">
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b p-4 flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Printer className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold">Pratinjau Cetak</h2>
                            <p className="text-[10px] text-gray-500">Biodata Konsumen: {consumer.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} className="h-8">
                            <X className="w-4 h-4 mr-2" /> Tutup
                        </Button>
                        <Button onClick={handlePrint} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                            <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
                        </Button>
                    </div>
                </div>

                {/* THE WHITE PAPER */}
                <div className="bg-white mx-auto my-8 p-12 shadow-2xl w-[210mm] min-h-[297mm] relative print:m-0 print:shadow-none print:w-full print:p-8">
                    {/* Header Logo Placeholder */}
                    <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">18 JAYA TEMPO</h1>
                            <p className="text-xs text-gray-500 font-medium">Real Estate Developer & Management System</p>
                        </div>
                        <div className="text-right">
                            <div className="bg-gray-900 text-white px-3 py-1 text-[10px] font-bold tracking-widest mb-1">DATA PROFIL KONSUMEN</div>
                            <p className="text-sm font-black text-blue-600">{consumer.code}</p>
                        </div>
                    </div>

                    <div className="absolute top-40 right-12 opacity-[0.03] rotate-[-15deg] pointer-events-none select-none">
                        <h1 className="text-[120px] font-black">{consumer.housing_project || 'PROYEK'}</h1>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 relative z-10">
                        {/* LEFT COLUMN */}
                        <div className="space-y-1">
                            <SectionTitle title="Informasi Pribadi" />
                            <Field label="Nama Lengkap" value={consumer.name} />
                            <Field label="Nomor KTP (NIK)" value={consumer.id_card_number} />
                            <Field label="NPWP" value={consumer.npwp} />
                            <Field label="Tempat, Tgl Lahir" value="-" />
                            <Field label="Alamat Domisili" value={consumer.address} />
                            <Field label="Telepon / WA" value={consumer.phone} />
                            <Field label="Email" value={consumer.email} />

                            <SectionTitle title="Data Keluarga" />
                            <Field label="Status Nikah" value={consumer.marital_status} />
                            <Field label="Nama Pasangan" value={consumer.spouse_name} />
                            <Field label="Pekerjaan Pasangan" value={consumer.spouse_occupation} />
                            <Field label="Kontak Darurat" value={consumer.family_name} />
                            <Field label="Hubungan" value={consumer.family_relationship} />
                            <Field label="Telepon Keluarga" value={consumer.family_phone} />
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-1">
                            <SectionTitle title="Data Pekerjaan" />
                            <Field label="Pekerjaan" value={consumer.occupation} />
                            <Field label="Nama Instansi" value={consumer.employer_name} />
                            <Field label="Alamat Kantor" value={consumer.employer_address} />
                            <Field label="Telepon Kantor" value={consumer.employer_phone} />
                            <Field label="Penghasilan" value={consumer.salary ? `Rp ${consumer.salary.toLocaleString()}` : '-'} />

                            <SectionTitle title="Rencana Pembelian" />
                            <Field label="Proyek Perumahan" value={consumer.housing_project} />
                            <Field label="Sumber Info" value={consumer.source} />
                            <Field label="Sales Marketing" value={consumer.sales_person} />
                            <Field label="Proses Bank" value={consumer.bank_process} />
                            
                            <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                                <p className="text-[10px] text-blue-700 font-bold uppercase mb-2">Catatan Booking</p>
                                <p className="text-xs text-gray-700 leading-relaxed italic">
                                    "{consumer.booking_remarks || 'Tidak ada catatan tambahan.'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE SECTION */}
                    <div className="mt-20 grid grid-cols-3 gap-8 text-center pt-12">
                        <div className="space-y-16">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Konsumen</p>
                            <div className="border-b border-gray-900 w-3/4 mx-auto"></div>
                            <p className="text-xs font-bold">{consumer.name}</p>
                        </div>
                        <div className="space-y-16">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sales / Marketing</p>
                            <div className="border-b border-gray-900 w-3/4 mx-auto"></div>
                            <p className="text-xs font-bold">{consumer.sales_person || '............................'}</p>
                        </div>
                        <div className="space-y-16">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin / Head</p>
                            <div className="border-b border-gray-900 w-3/4 mx-auto"></div>
                            <p className="text-xs font-bold">............................</p>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end border-t pt-4 text-[9px] text-gray-400 font-medium italic">
                        <p>Dicetak otomatis oleh Sistem 18 JAYA pada {new Date().toLocaleString('id-ID')}</p>
                        <p>Halaman 1 dari 1</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
