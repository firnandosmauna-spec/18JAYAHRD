import { useState, useEffect } from 'react'
import { projectService } from '@/services/projectService'
import { handleSupabaseError } from '@/services/supabaseService'
import type { Project, ProjectPhase, ProjectMaterial, ProjectWorker } from '@/lib/supabase'

// Projects Hook
export function useProjects(status?: string) {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProjects = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getAll(status)
            setProjects(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newProject = await projectService.create(project)
            setProjects(prev => [newProject, ...prev])
            return newProject
        } catch (err) {
            const errorMsg = handleSupabaseError(err)
            setError(errorMsg)
            throw new Error(errorMsg)
        }
    }

    const updateProject = async (id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => {
        try {
            const updatedProject = await projectService.update(id, updates)
            setProjects(prev => prev.map(p => p.id === id ? updatedProject : p))
            return updatedProject
        } catch (err) {
            const errorMsg = handleSupabaseError(err)
            setError(errorMsg)
            throw new Error(errorMsg)
        }
    }

    const deleteProject = async (id: string) => {
        try {
            await projectService.delete(id)
            setProjects(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            const errorMsg = handleSupabaseError(err)
            setError(errorMsg)
            throw new Error(errorMsg)
        }
    }

    useEffect(() => {
        fetchProjects()
    }, [status])

    return {
        projects,
        loading,
        error,
        refetch: fetchProjects,
        addProject,
        updateProject,
        deleteProject
    }
}

// Single Project Hook
export function useProject(id?: string) {
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProject = async () => {
        if (!id) return
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getById(id)
            setProject(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProject()
    }, [id])

    return {
        project,
        loading,
        error,
        refetch: fetchProject
    }
}

// Project Phases Hook
export function useProjectPhases(projectId?: string) {
    const [phases, setPhases] = useState<ProjectPhase[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPhases = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getPhases(projectId)
            setPhases(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addPhase = async (phase: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newPhase = await projectService.createPhase(phase)
            setPhases(prev => [...prev, newPhase])
            return newPhase
        } catch (err) {
            throw err
        }
    }

    useEffect(() => {
        fetchPhases()
    }, [projectId])

    return {
        phases,
        loading,
        error,
        refetch: fetchPhases,
        addPhase
    }
}

// Project Materials Hook
export function useProjectMaterials(projectId?: string) {
    const [materials, setMaterials] = useState<ProjectMaterial[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMaterials = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getMaterials(projectId)
            setMaterials(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addMaterial = async (material: Omit<ProjectMaterial, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) => {
        try {
            const newMaterial = await projectService.addMaterial(material)
            setMaterials(prev => [newMaterial, ...prev])
            return newMaterial
        } catch (err) {
            throw err
        }
    }

    useEffect(() => {
        fetchMaterials()
    }, [projectId])

    return {
        materials,
        loading,
        error,
        refetch: fetchMaterials,
        addMaterial
    }
}

// Project Workers Hook
export function useProjectWorkers(projectId?: string) {
    const [workers, setWorkers] = useState<ProjectWorker[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWorkers = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getWorkers(projectId)
            setWorkers(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addWorker = async (worker: Omit<ProjectWorker, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newWorker = await projectService.addWorker(worker)
            setWorkers(prev => [newWorker, ...prev])
            return newWorker
        } catch (err) {
            throw err
        }
    }

    const deleteWorker = async (id: string) => {
        try {
            await projectService.deleteWorker(id)
            setWorkers(prev => prev.filter(w => w.id !== id))
        } catch (err) {
            throw err
        }
    }

    useEffect(() => {
        fetchWorkers()
    }, [projectId])

    return {
        workers,
        loading,
        error,
        refetch: fetchWorkers,
        addWorker,
        deleteWorker
    }
}

// Project Worker Payments Hook
export function useProjectWorkerPayments(projectId?: string) {
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPayments = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            setError(null)
            const data = await projectService.getWorkerPayments(projectId)
            setPayments(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addPayment = async (payment: any) => {
        try {
            const newPayment = await projectService.addWorkerPayment(payment)
            setPayments(prev => [newPayment, ...prev])
            return newPayment
        } catch (err) {
            const errorMsg = handleSupabaseError(err)
            setError(errorMsg)
            throw new Error(errorMsg)
        }
    }

    const deletePayment = async (id: string) => {
        try {
            await projectService.deleteWorkerPayment(id)
            setPayments(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            const errorMsg = handleSupabaseError(err)
            setError(errorMsg)
            throw new Error(errorMsg)
        }
    }

    useEffect(() => {
        fetchPayments()
    }, [projectId])

    return {
        payments,
        loading,
        error,
        refetch: fetchPayments,
        addPayment,
        deletePayment
    }
}

// Project Labor Rates Hook
export function useProjectLaborRates() {
    const [rates, setRates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchRates = async () => {
        try {
            setLoading(true)
            const data = await projectService.getLaborRates()
            setRates(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addRate = async (rate: any) => {
        try {
            const newRate = await projectService.addLaborRate(rate)
            setRates(prev => [newRate, ...prev])
            return newRate
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    const updateRate = async (id: string, updates: any) => {
        try {
            const updatedRate = await projectService.updateLaborRate(id, updates)
            setRates(prev => prev.map(r => r.id === id ? updatedRate : r))
            return updatedRate
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    const deleteRate = async (id: string) => {
        try {
            await projectService.deleteLaborRate(id)
            setRates(prev => prev.filter(r => r.id !== id))
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    useEffect(() => {
        fetchRates()
    }, [])

    return { rates, loading, error, refetch: fetchRates, addRate, updateRate, deleteRate }
}

// Project Worker Activities Hook
export function useProjectWorkerActivities(projectId?: string) {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchActivities = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            const data = await projectService.getWorkerActivities(projectId)
            setActivities(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addActivity = async (activity: any) => {
        try {
            const newActivity = await projectService.addWorkerActivity(activity)
            // Fetch again to get joined data or manually fetch if needed
            fetchActivities()
            return newActivity
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    const deleteActivity = async (id: string) => {
        try {
            await projectService.deleteWorkerActivity(id)
            setActivities(prev => prev.filter(a => a.id !== id))
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    useEffect(() => {
        fetchActivities()
    }, [projectId])

    return { activities, loading, error, refetch: fetchActivities, addActivity, deleteActivity }
}

// Project Progress Logs Hook
export function useProjectProgressLogs(projectId?: string) {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = async () => {
        if (!projectId) return
        try {
            setLoading(true)
            const data = await projectService.getProjectLogs(projectId)
            setLogs(data)
        } catch (err) {
            setError(handleSupabaseError(err))
        } finally {
            setLoading(false)
        }
    }

    const addLog = async (log: { project_id: string, progress_percentage: number, description: string, photos?: string[] }) => {
        try {
            const newLog = await projectService.addProjectLog(log)
            setLogs(prev => [newLog, ...prev])
            return newLog
        } catch (err) {
            throw new Error(handleSupabaseError(err))
        }
    }

    const updateLog = async (id: string, updates: { progress_percentage?: number, description?: string, photos?: string[] }) => {
        if (!projectId) return;
        try {
            const updatedLog = await projectService.updateProjectLog(id, projectId, updates);
            setLogs(prev => prev.map(l => l.id === id ? updatedLog : l));
            return updatedLog;
        } catch (err) {
            throw new Error(handleSupabaseError(err));
        }
    }

    const deleteLog = async (id: string) => {
        try {
            await projectService.deleteProjectLog(id);
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            throw new Error(handleSupabaseError(err));
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [projectId])

    return { logs, loading, error, refetch: fetchLogs, addLog, updateLog, deleteLog }
}
