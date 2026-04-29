import { supabase } from '@/lib/supabase'
import type { Project, ProjectPhase, ProjectMaterial, ProjectWorker } from '@/lib/supabase'

export interface EmployeeWorkerType {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
}

export const projectService = {
    // Projects
    async getAll(status?: string) {
        let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            // Graceful handling if table missing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Projects table does not exist. Please run schema_projects.sql');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('projects')
            .insert(project)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // Phases
    async getPhases(projectId: string) {
        const { data, error } = await supabase
            .from('project_phases')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    },

    async createPhase(phase: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('project_phases')
            .insert(phase)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updatePhase(id: string, updates: Partial<Omit<ProjectPhase, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('project_phases')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Materials
    async getMaterials(projectId: string) {
        const { data, error } = await supabase
            .from('project_materials')
            .select(`
        *,
        products (
          name,
          sku
        )
      `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    async addMaterial(material: Omit<ProjectMaterial, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) {
        const { data, error } = await supabase
            .from('project_materials')
            .insert(material)
            .select(`
        *,
        products (
          name,
          sku
        )
      `)
            .single()

        if (error) throw error
        return data
    },

    async updateMaterial(id: string, updates: Partial<Omit<ProjectMaterial, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('project_materials')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        products (
          name,
          sku
        )
      `)
            .single()

        if (error) throw error
        return data
    },

    // Workers
    async getWorkers(projectId: string) {
        const { data, error } = await supabase
            .from('project_workers')
            .select(`
        *,
        employees (
          name,
          position
        )
      `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    async addWorker(worker: Omit<ProjectWorker, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('project_workers')
            .insert(worker)
            .select(`
        *,
        employees (
          name,
          position
        )
      `)
            .single()

        if (error) throw error
        return data
    },

    async updateWorker(id: string, updates: Partial<Omit<ProjectWorker, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('project_workers')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        employees (
          name,
          position
        )
      `)
            .single()

        if (error) throw error
        return data
    },

    async deleteWorker(id: string) {
        const { error } = await supabase
            .from('project_workers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Progress Logs
    async getProjectLogs(projectId: string) {
        const { data, error } = await supabase
            .from('project_progress_logs')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            // Graceful handling if table missing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
        return data || [];
    },

    async addProjectLog(log: { project_id: string, progress_percentage: number, description: string, photos?: string[] }) {
        const { data, error } = await supabase
            .from('project_progress_logs')
            .insert(log)
            .select()
            .single();

        if (error) throw error;

        // Also update the main project progress
        await this.update(log.project_id, { progress: log.progress_percentage });

        return data;
    },

    async updateProjectLog(id: string, projectId: string, updates: { progress_percentage?: number, description?: string, photos?: string[] }) {
        const { data, error } = await supabase
            .from('project_progress_logs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If progress percentage was updated, update the main project too
        if (updates.progress_percentage !== undefined) {
            await this.update(projectId, { progress: updates.progress_percentage });
        }

        return data;
    },

    async deleteProjectLog(id: string) {
        const { error } = await supabase
            .from('project_progress_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Worker Payments
    async getWorkerPayments(projectId: string) {
        const { data, error } = await supabase
            .from('project_worker_payments')
            .select(`
                *,
                project_workers (
                    role,
                    employees (
                        name
                    )
                )
            `)
            .eq('project_id', projectId)
            .order('payment_date', { ascending: false });

        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
        return data || [];
    },

    async addWorkerPayment(payment: any) {
        const { data, error } = await supabase
            .from('project_worker_payments')
            .insert(payment)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateWorkerPayment(id: string, updates: any) {
        const { data, error } = await supabase
            .from('project_worker_payments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteWorkerPayment(id: string) {
        const { error } = await supabase
            .from('project_worker_payments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Labor Rates (Master Gaji)
    async getLaborRates() {
        const { data, error } = await supabase
            .from('project_labor_rates')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async addLaborRate(rate: any) {
        const { data, error } = await supabase
            .from('project_labor_rates')
            .insert(rate)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateLaborRate(id: string, updates: any) {
        const { data, error } = await supabase
            .from('project_labor_rates')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteLaborRate(id: string) {
        const { error } = await supabase
            .from('project_labor_rates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Labor Categories
    async getLaborCategories() {
        const { data, error } = await supabase
            .from('project_labor_categories')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async addLaborCategory(category: any) {
        const { data, error } = await supabase
            .from('project_labor_categories')
            .insert(category)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateLaborCategory(id: string, updates: any) {
        const { data, error } = await supabase
            .from('project_labor_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteLaborCategory(id: string) {
        const { error } = await supabase
            .from('project_labor_categories')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Worker Activities (Rincian Kegiatan)
    async getWorkerActivities(projectId: string) {
        const { data, error } = await supabase
            .from('project_worker_activities')
            .select(`
                *,
                project_workers (
                    role,
                    employees (name)
                ),
                project_labor_rates (name)
            `)
            .eq('project_id', projectId)
            .order('activity_date', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addWorkerActivity(activity: any) {
        const { data, error } = await supabase
            .from('project_worker_activities')
            .insert(activity)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateWorkerActivity(id: string, updates: any) {
        const { data, error } = await supabase
            .from('project_worker_activities')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteWorkerActivity(id: string) {
        const { error } = await supabase
            .from('project_worker_activities')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Worker Types
  async getWorkerTypes() {
    const { data, error } = await supabase
      .from('worker_types')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []) as EmployeeWorkerType[];
  },

  async addWorkerType(type: Omit<EmployeeWorkerType, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('worker_types')
      .insert(type)
      .select()
      .single();
    if (error) throw error;
    return data as EmployeeWorkerType;
  },

  async updateWorkerType(id: string, type: Partial<Omit<EmployeeWorkerType, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('worker_types')
      .update(type)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EmployeeWorkerType;
  },

    async deleteWorkerType(id: string) {
        const { error } = await supabase
            .from('worker_types')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
