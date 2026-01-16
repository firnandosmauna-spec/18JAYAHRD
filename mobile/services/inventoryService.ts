import { supabase } from '../lib/supabase'
import type { Product, ProductCategory, Warehouse, StockMovement } from '../lib/supabase'
import { handleSupabaseError } from '../services/supabaseService'

// Product Category Services
export const categoryService = {
    async getAll() {
        const { data, error } = await supabase
            .from('product_categories')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Product categories table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async create(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('product_categories')
            .insert(category)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<ProductCategory, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('product_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('product_categories')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

// Warehouse Services
export const warehouseService = {
    async getAll() {
        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Warehouses table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async create(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('warehouses')
            .insert(warehouse)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<Warehouse, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('warehouses')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

// Product Services
export const productService = {
    async getAll() {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Products table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async getByCategory(categoryId: string) {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .eq('category_id', categoryId)
            .order('name', { ascending: true })

        if (error) throw error
        return data
    },

    async getLowStock() {
        // Get all products and filter in JavaScript since Supabase doesn't support column comparison in filter
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .eq('status', 'active')
            .order('stock', { ascending: true })

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Products table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }

        if (!data) return [];

        // Filter products where stock <= min_stock
        return data.filter(product => product.stock <= product.min_stock)
    },

    async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('products')
            .insert(product)
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .single()

        if (error) {
            // Better error handling
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                throw new Error('Products table does not exist. Please run the schema.sql in Supabase SQL Editor.');
            }
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                throw new Error('SKU sudah digunakan. Silakan gunakan SKU lain.');
            }
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                throw new Error('Kategori atau gudang yang dipilih tidak valid.');
            }
            throw error;
        }
        return data
    },

    async update(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        product_categories (
          id,
          name
        ),
        warehouses (
          id,
          name
        )
      `)
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set') {
        // Get current product
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        let newStock = quantity
        if (operation === 'add') {
            newStock = (product.stock || 0) + quantity
        } else if (operation === 'subtract') {
            newStock = Math.max(0, (product.stock || 0) - quantity)
        }

        const { data, error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

// Stock Movement Services
export const stockMovementService = {
    async getAll(startDate?: string, endDate?: string) {
        let query = supabase
            .from('stock_movements')
            .select(`
        *,
        products (
          id,
          name,
          sku
        ),
        warehouses (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })

        if (startDate) {
            query = query.gte('created_at', startDate)
        }
        if (endDate) {
            query = query.lte('created_at', endDate)
        }

        const { data, error } = await query

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Stock movements table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async getByProduct(productId: string) {
        const { data, error } = await supabase
            .from('stock_movements')
            .select(`
        *,
        products (
          id,
          name,
          sku
        ),
        warehouses (
          id,
          name
        )
      `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async create(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) {
        // Start transaction-like operation
        const { data: movementData, error: movementError } = await supabase
            .from('stock_movements')
            .insert(movement)
            .select()
            .single()

        if (movementError) throw movementError

        // Update product stock based on movement type
        const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', movement.product_id)
            .single()

        if (product) {
            let newStock = product.stock || 0

            if (movement.movement_type === 'in' || movement.movement_type === 'adjustment') {
                newStock += movement.quantity
            } else if (movement.movement_type === 'out') {
                newStock = Math.max(0, newStock - movement.quantity)
            }

            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', movement.product_id)

            if (updateError) throw updateError
        }

        return movementData
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('stock_movements')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
