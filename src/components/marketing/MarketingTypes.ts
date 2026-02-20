
export type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const HOUSING_PROJECTS = [
    "Grand City",
    "River Valley",
    "Green View",
    "Sky Garden",
    "Lake Side",
    "Palm Springs",
    "Bukit Golf",
    "Permata Hijau"
];

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
