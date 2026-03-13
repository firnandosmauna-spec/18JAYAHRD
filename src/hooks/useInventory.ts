import { useState, useEffect } from 'react'
import {
  productService,
  categoryService,
  warehouseService,
  stockMovementService
} from '@/services/inventoryService'
import { projectService } from '@/services/projectService'
import { settingsService } from '@/services/settingsService'
import { handleSupabaseError } from '@/services/supabaseService'
import type { Product, ProductCategory, Warehouse, StockMovement } from '@/lib/supabase'

// Product Category Hooks
export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoryService.getAll()
      setCategories(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async (category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCategory = await categoryService.create(category)
      setCategories(prev => [newCategory, ...prev])
      return newCategory
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateCategory = async (id: string, updates: Partial<Omit<ProductCategory, 'id' | 'created_at'>>) => {
    try {
      const updatedCategory = await categoryService.update(id, updates)
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat))
      return updatedCategory
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await categoryService.delete(id)
      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  }
}

// Warehouse Hooks
export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await warehouseService.getAll()
      setWarehouses(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newWarehouse = await warehouseService.create(warehouse)
      setWarehouses(prev => [newWarehouse, ...prev])
      return newWarehouse
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateWarehouse = async (id: string, updates: Partial<Omit<Warehouse, 'id' | 'created_at'>>) => {
    try {
      const updatedWarehouse = await warehouseService.update(id, updates)
      setWarehouses(prev => prev.map(wh => wh.id === id ? updatedWarehouse : wh))
      return updatedWarehouse
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteWarehouse = async (id: string) => {
    try {
      await warehouseService.delete(id)
      setWarehouses(prev => prev.filter(wh => wh.id !== id))
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchWarehouses()
  }, [])

  return {
    warehouses,
    loading,
    error,
    refetch: fetchWarehouses,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse
  }
}

// Product Hooks
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAll()
      setProducts(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await productService.create(product)
      setProducts(prev => [newProduct, ...prev])
      return newProduct
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>) => {
    try {
      const updatedProduct = await productService.update(id, updates)
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p))
      return updatedProduct
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      await productService.delete(id)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  }
}

// Low Stock Products Hook
export function useLowStockProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLowStock = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getLowStock()
      setProducts(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLowStock()
  }, [])

  return {
    products,
    loading,
    error,
    refetch: fetchLowStock
  }
}

// Stock Movement Hooks
export function useStockMovements(startDate?: string, endDate?: string) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovements = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stockMovementService.getAll(startDate, endDate)
      setMovements(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addMovement = async (movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newMovement = await stockMovementService.create(movement)
      setMovements(prev => [newMovement, ...prev])
      return newMovement
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteMovement = async (id: string) => {
    try {
      await stockMovementService.delete(id)
      setMovements(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateMovement = async (id: string, updates: Partial<StockMovement>) => {
    try {
      const updatedMovement = await stockMovementService.update(id, updates)
      setMovements(prev => prev.map(m => m.id === id ? updatedMovement : m))
      return updatedMovement
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [startDate, endDate])

  return {
    movements,
    loading,
    error,
    refetch: fetchMovements,
    addMovement,
    updateMovement,
    deleteMovement
  }
}

// Inventory Units Hook (using system_settings)
export function useInventoryUnits() {
  const [units, setUnits] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = async () => {
    try {
      setLoading(true)
      setError(null)
      const settings = await settingsService.getSettings(['inventory_units'])
      if (settings && settings.length > 0) {
        try {
          const parsedUnits = JSON.parse(settings[0].value)
          setUnits(Array.isArray(parsedUnits) ? parsedUnits : [])
        } catch (e) {
          console.error('Failed to parse inventory_units:', e)
          setUnits([])
        }
      } else {
        // Default units if not set
        const defaultUnits = ['sak', 'batang', 'buah', 'm³', 'dus', 'kaleng', 'kg', 'lembar', 'meter', 'roll', 'set']
        setUnits(defaultUnits)
        // Optionally seed the setting
        await settingsService.updateSetting('inventory_units', JSON.stringify(defaultUnits), 'Daftar satuan inventaris')
      }
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addUnit = async (unit: string) => {
    try {
      if (units.includes(unit)) return units
      const newUnits = [...units, unit]
      await settingsService.updateSetting('inventory_units', JSON.stringify(newUnits))
      setUnits(newUnits)
      return newUnits
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const removeUnit = async (unit: string) => {
    try {
      const newUnits = units.filter(u => u !== unit)
      await settingsService.updateSetting('inventory_units', JSON.stringify(newUnits))
      setUnits(newUnits)
      return newUnits
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
    addUnit,
    removeUnit,
    updateUnit: async (oldUnit: string, newUnit: string) => {
      try {
        const updatedUnits = units.map(u => u === oldUnit ? newUnit : u)
        await settingsService.updateSetting('inventory_units', JSON.stringify(updatedUnits))
        setUnits(updatedUnits)
        return updatedUnits
      } catch (err) {
        const errorMsg = handleSupabaseError(err)
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    }
  }
}

// Inventory Volumes Hook
export function useInventoryVolumes() {
  const [volumes, setVolumes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVolumes = async () => {
    try {
      setLoading(true)
      setError(null)
      const settings = await settingsService.getSettings(['inventory_volumes'])
      if (settings && settings.length > 0) {
        try {
          const parsed = JSON.parse(settings[0].value)
          setVolumes(Array.isArray(parsed) ? parsed : [])
        } catch (e) {
          console.error('Failed to parse inventory_volumes:', e)
          setVolumes([])
        }
      } else {
        const defaultVolumes = ['10 kg', '25 kg', '40 kg', '50 kg', '1 m3', 'Unit']
        setVolumes(defaultVolumes)
        await settingsService.updateSetting('inventory_volumes', JSON.stringify(defaultVolumes), 'Daftar volume produk')
      }
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addVolume = async (volume: string) => {
    try {
      if (volumes.includes(volume)) return volumes
      const newVolumes = [...volumes, volume]
      await settingsService.updateSetting('inventory_volumes', JSON.stringify(newVolumes))
      setVolumes(newVolumes)
      return newVolumes
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const removeVolume = async (volume: string) => {
    try {
      const newVolumes = volumes.filter(v => v !== volume)
      await settingsService.updateSetting('inventory_volumes', JSON.stringify(newVolumes))
      setVolumes(newVolumes)
      return newVolumes
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchVolumes()
  }, [])

  return {
    volumes,
    loading,
    error,
    refetch: fetchVolumes,
    addVolume,
    removeVolume,
    updateVolume: async (oldVolume: string, newVolume: string) => {
      try {
        const updated = volumes.map(v => v === oldVolume ? newVolume : v)
        await settingsService.updateSetting('inventory_volumes', JSON.stringify(updated))
        setVolumes(updated)
        return updated
      } catch (err) {
        const errorMsg = handleSupabaseError(err)
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    }
  }
}

// Project Locations Hook
export function useProjectLocations() {
  const [locations, setLocations] = useState<string[]>([])
  const [projectNames, setProjectNames] = useState<string[]>([])
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch from settings (custom locations)
      const settings = await settingsService.getSettings(['inventory_project_locations'])
      let custom: string[] = []
      if (settings && settings.length > 0) {
        try {
          const parsed = JSON.parse(settings[0].value)
          custom = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          console.error('Failed to parse inventory_project_locations:', e)
        }
      } else {
        custom = ['Gudang Utama', 'Transit']
        await settingsService.updateSetting('inventory_project_locations', JSON.stringify(custom), 'Daftar lokasi proyek')
      }
      setCustomLocations(custom)

      // Fetch from projects table
      let projects: string[] = []
      try {
        const projectData = await projectService.getAll('in-progress')
        // Include project names AND project location fields if they exist
        const names = projectData.map(p => p.name)
        const locs = projectData.map(p => p.location).filter(l => l && l.trim() !== '')
        projects = Array.from(new Set([...names, ...locs]))
      } catch (e) {
        console.error('Failed to fetch projects for locations:', e)
      }
      setProjectNames(projects)

      // Merge and deduplicate
      const merged = Array.from(new Set([...custom, ...projects]))
      setLocations(merged)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addLocation = async (location: string) => {
    try {
      if (customLocations.includes(location) || projectNames.includes(location)) return locations
      const newCustom = [...customLocations, location]
      await settingsService.updateSetting('inventory_project_locations', JSON.stringify(newCustom))
      setCustomLocations(newCustom)
      
      const merged = Array.from(new Set([...newCustom, ...projectNames]))
      setLocations(merged)
      return merged
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const removeLocation = async (location: string) => {
    try {
      const newCustom = customLocations.filter(l => l !== location)
      await settingsService.updateSetting('inventory_project_locations', JSON.stringify(newCustom))
      setCustomLocations(newCustom)
      
      const merged = Array.from(new Set([...newCustom, ...projectNames]))
      setLocations(merged)
      return merged
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  return {
    locations,
    projectNames,
    customLocations,
    loading,
    error,
    refetch: fetchLocations,
    addLocation,
    removeLocation,
    updateLocation: async (oldLocation: string, newLocation: string) => {
      try {
        const updatedCustom = customLocations.map(l => l === oldLocation ? newLocation : l)
        await settingsService.updateSetting('inventory_project_locations', JSON.stringify(updatedCustom))
        setCustomLocations(updatedCustom)
        
        const merged = Array.from(new Set([...updatedCustom, ...projectNames]))
        setLocations(merged)
        return merged
      } catch (err) {
        const errorMsg = handleSupabaseError(err)
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    }
  }
}

