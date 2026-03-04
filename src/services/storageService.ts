import { supabase } from '@/lib/supabase';

export const storageService = {
    /**
     * Upload an employee contract PDF to Supabase storage.
     * @param file The File object carefully selected via input type=file.
     * @param employeeName The name of the employee to construct a friendly path.
     * @returns The public URL of the uploaded file.
     */
    async uploadEmployeeContract(file: File, employeeName: string): Promise<string> {
        try {
            // Validate the file type
            if (!file.type.includes('pdf')) {
                throw new Error('Hanya file PDF yang diperbolehkan.');
            }

            // Generate a clean file name
            const fileExt = file.name.split('.').pop() || 'pdf';
            const cleanName = employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const uniqueSuffix = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
            const fileName = `${cleanName}-${uniqueSuffix}.${fileExt}`;
            const filePath = `contracts/${fileName}`;

            const { data, error } = await supabase.storage
                .from('employee_contracts')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false // Don't over-write existing, just make new unique name
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('employee_contracts')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading employee contract:', error);
            throw error;
        }
    }
};
