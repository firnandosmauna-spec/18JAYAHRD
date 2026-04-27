
export type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const HOUSING_PROJECTS: string[] = [];

export interface Pipeline {
    id: string;
    title: string;
    contact_name: string;
    company: string;
    value: number;
    stage: Stage;
    survey_date?: string;
    booking_date?: string;
    booking_fee?: number;
    akad_date?: string;
    source?: string;
    approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
    notes?: string;
    created_by?: string;
    created_at: string;
    attachment_url?: string;
    survey_attachment_url?: string;
    booking_attachment_url?: string;
    akad_attachment_url?: string;
    consumer_id?: string; // Link to consumer_profiles
}

export interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
    uploaded_by: string;
}

export interface LogEntry {
    id: string;
    action: string;
    details: string;
    created_at: string;
    user_id: string;
}

export const STAGES: { id: Stage; label: string; color: string }[] = [
    { id: 'lead', label: 'Lead Masuk', color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { id: 'qualified', label: 'Qualified', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'proposal', label: 'Proposal', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'negotiation', label: 'Negosiasi', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { id: 'won', label: 'Deal Won', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'lost', label: 'Lost', color: 'bg-red-50 border-red-200 text-red-700' },
];

export interface ConsumerProfile {
    id: string;
    code: string;
    name: string;
    id_card_number: string; // KTP
    address: string;
    phone: string;
    email?: string;
    sales_person?: string;
    sales_person_id?: string; // Link to auth.users
    housing_project?: string; // New field
    booking_fee_status?: 'paid' | 'unpaid'; // Added field
    created_at: string;

    // Data Diri Tambahan
    npwp?: string;
    company_id_number?: string;
    booking_remarks?: string;
    salary?: number;

    // Data Pekerjaan
    occupation?: string;
    employer_name?: string;
    employer_address?: string;
    employer_phone?: string;
    employer_remarks?: string;

    // Data Pasangan
    marital_status?: string;
    spouse_name?: string;
    spouse_phone?: string;
    spouse_occupation?: string;
    spouse_office_address?: string;
    spouse_remarks?: string;

    // Data Keluarga
    family_name?: string;
    family_relationship?: string;
    family_phone?: string;
    family_address?: string;

    // Data Sumber
    source?: string; // Sumber Konsumen
    bank_process?: string; // Proses Bank
    document_urls?: string[]; // Lampiran Dokumen
    unreal_data?: any; // Data Perbandingan (Unreal)
    consumer_pemberkasan?: ConsumerPemberkasan[];
}

export interface ConsumerFollowUp {
    id: string;
    consumer_id: string;
    consumer_name?: string; // For display
    consumer_created_at?: string; // For duration calculation
    follow_up_date: string;
    notes: string;
    status: 'pending' | 'approved' | 'rejected';
    photo_url?: string;
    created_at: string;
}

export interface ConsumerPemberkasan {
    id: string;
    consumer_id: string;
    booking: boolean;
    booking_date?: string;
    booking_file_url?: string;
    slik_ojk: boolean;
    slik_ojk_date?: string;
    slik_ojk_file_url?: string;
    proses_berkas: boolean;
    proses_berkas_date?: string;
    proses_berkas_file_url?: string;
    ots: boolean;
    ots_date?: string;
    ots_file_url?: string;
    penginputan: boolean;
    penginputan_date?: string;
    penginputan_file_url?: string;
    analis_data: boolean;
    analis_data_date?: string;
    analis_data_file_url?: string;
    lpa_aprasial: boolean;
    lpa_aprasial_date?: string;
    lpa_aprasial_file_url?: string;
    pip: boolean;
    pip_date?: string;
    pip_file_url?: string;
    pk: boolean;
    pk_date?: string;
    pk_file_url?: string;
    akad: boolean;
    akad_date?: string;
    akad_file_url?: string;
    pencairan_akad: boolean;
    pencairan_akad_date?: string;
    pencairan_akad_file_url?: string;
    slik_ojk_status?: 'none' | 'pending' | 'approved' | 'rejected';
    slik_ojk_approved_by?: string;
    slik_ojk_approved_at?: string;
    updated_at: string;
    updated_by?: string;
}

export interface ConsumerTransaction {
    id: string;
    consumer_id: string;
    amount: number;
    transaction_type: 'booking_fee' | 'dp' | 'installment' | 'other';
    payment_method: 'cash' | 'transfer' | 'edc';
    payment_date: string;
    receipt_number?: string;
    notes?: string;
    attachment_url?: string;
    created_by?: string;
    created_at: string;
}
