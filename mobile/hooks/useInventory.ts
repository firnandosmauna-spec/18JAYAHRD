import { useState, useEffect } from 'react'
import {
    productService,
    categoryService,
    warehouseService,
    stockMovementService
} from '../services/inventoryService'
import { handleSupabaseError } from '../services/supabaseService'
import type { Product, ProductCategory, Warehouse, StockMovement } from '../lib/supabase'

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

    useEffect(() => {
        fetchMovements()
    }, [startDate, endDate])

    return {
        movements,
        loading,
        error,
        refetch: fetchMovements,
        addMovement,
        deleteMovement
    }
}
