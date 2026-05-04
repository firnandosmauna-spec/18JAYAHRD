import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatTerbilang } from '@/utils/terbilang';
import { cn } from '@/lib/utils';

interface KwitansiReceiptProps {
    receiptNumber: string;
    receivedFrom: string;
    amount: number;
    description: string;
    date: Date;
    recipientName: string;
    className?: string;
}

export default function KwitansiReceipt({
    receiptNumber,
    receivedFrom,
    amount,
    description,
    date,
    recipientName,
    className
}: KwitansiReceiptProps) {
    return (
        <div className={cn("w-full max-w-[950px] bg-white border-[3px] border-[#003366] p-0 font-serif relative overflow-hidden shadow-2xl mx-auto", className)} id="kwitansi-print">
            {/* BACKGROUND MILLIMETER GRID */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.12]" 
                 style={{ 
                     backgroundImage: 'linear-gradient(#4a5568 1px, transparent 1px), linear-gradient(90deg, #4a5568 1px, transparent 1px)',
                     backgroundSize: '20px 20px' 
                 }} 
            />

            {/* LARGE WATERMARK LOGO */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                <img 
                    src="/logo.png" 
                    alt="" 
                    className="w-2/3 object-contain"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                />
            </div>

            <div className="relative p-10 bg-white/60">
                {/* HEADER */}
                <div className="flex justify-between items-start mb-10">
                    <div className="flex items-center gap-6">
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="w-20 h-20 object-contain" 
                            onError={(e) => (e.currentTarget.src = 'https://omfzoasehiecuzaudblp.supabase.co/storage/v1/object/public/system/logo.png')} 
                        />
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-black text-[#003366] tracking-tighter uppercase leading-none">PT. DELAPAN BELAS JAYA</h1>
                            <p className="text-[11px] font-bold text-slate-700 tracking-[0.3em] uppercase">DEVELOPER & KONTRAKTOR</p>
                            <div className="h-[2px] w-full bg-[#003366] my-1" />
                            <p className="text-sm font-bold text-[#003366] italic">Jl. Danau Sentarum No. 33, Pontianak</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-[#003366] border-b-4 border-[#003366] inline-block tracking-tighter italic px-2">KWITANSI</div>
                        <div className="text-xl font-bold mt-3 text-slate-800 tracking-tight">No. KM- <span className="text-black font-black">{receiptNumber}</span></div>
                    </div>
                </div>

                {/* FORM CONTENT */}
                <div className="space-y-7 mb-16">
                    <div className="flex items-center gap-4">
                        <span className="text-[16px] font-bold w-48 shrink-0 text-slate-800">Telah Terima Dari</span>
                        <span className="text-[16px] font-bold">:</span>
                        <div className="flex-grow border-b-2 border-dotted border-slate-500 pb-1 text-[18px] font-black uppercase text-blue-900 italic px-4 bg-white/30">
                            {receivedFrom}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-[16px] font-bold w-48 shrink-0 text-slate-800">Uang Sejumlah</span>
                        <span className="text-[16px] font-bold">:</span>
                        <div className="flex-grow border-b-2 border-dotted border-slate-500 pb-1 text-[17px] font-black uppercase text-blue-950 italic bg-[#f0f7ff]/50 px-4 min-h-[32px] flex items-center">
                            {formatTerbilang(amount)}
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <span className="text-[16px] font-bold w-48 shrink-0 pt-2 text-slate-800">Untuk Pembayaran</span>
                        <span className="text-[16px] font-bold pt-2">:</span>
                        <div className="flex-grow border-b-2 border-dotted border-slate-500 pb-2 text-[16px] font-bold text-slate-900 min-h-[90px] leading-relaxed uppercase px-4 bg-white/30">
                            {description}
                        </div>
                    </div>
                </div>

                {/* FOOTER SECTION */}
                <div className="grid grid-cols-12 gap-10 items-end mt-20">
                    {/* AMOUNT BOX */}
                    <div className="col-span-5">
                         <div className="flex items-center gap-5">
                            <span className="text-4xl font-black text-[#003366] italic">Rp.</span>
                            <div style={{ backgroundColor: '#ccf0ff', boxShadow: '10px 10px 0px rgba(0, 0, 51, 1)' }} 
                                 className="flex-grow border-[3px] border-[#003366] py-5 px-8 text-4xl font-black text-[#003366] flex justify-between items-center tracking-tight">
                                <span>{amount.toLocaleString('id-ID')}</span>
                                <span>,-</span>
                            </div>
                        </div>
                    </div>

                    {/* NOTE BOX */}
                    <div className="col-span-3">
                        <div style={{ backgroundColor: '#f0e6ff' }} 
                             className="p-4 border-2 border-purple-300 rounded-md text-[11px] font-black leading-[1.4] text-slate-800 italic shadow-sm text-center">
                            Ket: Kwitansi ini sah apabila dibubuhi cap perusahaan dan ditandatangani.
                        </div>
                    </div>

                    {/* SIGNATURE */}
                    <div className="col-span-4 flex flex-col items-center">
                        <div className="text-[15px] font-bold text-black mb-28 text-center">
                            Pontianak, {format(date, 'dd MMMM yyyy', { locale: id })}
                            <div className="mt-2 font-black text-lg">Yang Menerima,</div>
                        </div>
                        <div className="w-full border-b-[3px] border-[#003366] font-black text-center pb-2 uppercase tracking-[0.2em] text-[#003366] text-lg">
                            {recipientName || 'HASANUDDIN'}
                        </div>
                    </div>
                </div>

                {/* BOTTOM MARKS */}
                <div className="mt-16 flex justify-between items-end border-t border-slate-100 pt-6">
                    <div className="text-base font-bold text-slate-800">
                        <div className="mb-24">Yang Membayarkan,</div>
                        <div className="w-48 border-b-2 border-slate-300"></div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                         <div className="text-[12px] font-black italic text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1 rounded-full border border-slate-200">LEMBAR KONSUMEN</div>
                         <div className="text-6xl font-black text-slate-100/60 mt-4 select-none tracking-tighter uppercase italic">Copy 1</div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    #kwitansi-print {
                        width: 100% !important;
                        max-width: none !important;
                        border-width: 4px !important;
                        margin: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * { visibility: hidden; }
                    #kwitansi-print, #kwitansi-print * { visibility: visible; }
                    #kwitansi-print { position: absolute; left: 0; top: 0; }
                }
            ` }} />
        </div>
    );
}
