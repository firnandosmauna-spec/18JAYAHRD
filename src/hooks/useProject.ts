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

    useEffect(() => {
        fetchWorkers()
    }, [projectId])

    return {
        workers,
        loading,
        error,
        refetch: fetchWorkers,
        addWorker
    }
}
