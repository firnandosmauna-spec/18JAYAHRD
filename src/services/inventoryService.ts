import { supabase } from '@/lib/supabase'
import type { Product, ProductCategory, Warehouse, StockMovement } from '@/lib/supabase'
import { handleSupabaseError } from '@/services/supabaseService'

// Product Category Services
export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
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

// Helper to enrich products with supplier debt
async function enrichProductsWithSupplierDebt(products: any[]) {
  try {
    const { data: invoices, error: invoicesError } = await supabase
      .from('purchase_invoices')
      .select('supplier_id, total_amount, paid_amount')
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled');

    if (invoicesError) return products;

    const debtMap = (invoices || []).reduce((acc: any, inv) => {
      const debt = (inv.total_amount || 0) - (inv.paid_amount || 0);
      acc[inv.supplier_id] = (acc[inv.supplier_id] || 0) + debt;
      return acc;
    }, {});

    products.forEach(p => {
      if (!p) return;
      if (p.suppliers) {
        const isHutang = p.suppliers.payment_method?.toLowerCase() === 'hutang';
        p.suppliers.total_debt = isHutang ? (debtMap[p.suppliers.id] || 0) : 0;
      }
    });
    return products;
  } catch (e) {
    console.error('Error enriching products with debt:', e);
    return products;
  }
}

// Product Services
export const productService = {
  async getAll() {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          warehouses (id, name),
          suppliers (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return await enrichProductsWithSupplierDebt(products || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          warehouses (id, name),
          suppliers (*)
        `)
        .order('created_at', { ascending: false });

      if (error) return [];
      return data || [];
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          warehouses (id, name),
          suppliers (id, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('suppliers') || error.code === 'PGRST116') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('*, product_categories (id, name), warehouses (id, name)')
            .eq('id', id)
            .single();
          if (fallbackError) throw fallbackError;
          return fallbackData;
        }
        throw error;
      }
      const enriched = await enrichProductsWithSupplierDebt([data]);
      return enriched[0];
    } catch (err) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  },

  async getByCategory(categoryId: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          warehouses (id, name),
          suppliers (id, name)
        `)
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (error) {
        if (error.message?.toLowerCase().includes('suppliers') || error.code === 'PGRST116') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('*, product_categories (id, name), warehouses (id, name)')
            .eq('category_id', categoryId)
            .order('name', { ascending: true });
          if (fallbackError) throw fallbackError;
          return fallbackData || [];
        }
        throw error;
      }
      return await enrichProductsWithSupplierDebt(data || []);
    } catch (err) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  },

  async getLowStock() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          warehouses (id, name),
          suppliers (id, name)
        `)
        .eq('status', 'active')
        .order('stock', { ascending: true });

      if (error) {
        if (error.message?.toLowerCase().includes('suppliers') || error.code === 'PGRST116') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('*, product_categories (id, name), warehouses (id, name)')
            .eq('status', 'active')
            .order('stock', { ascending: true });

          if (fallbackError) throw fallbackError;
          return (fallbackData || []).filter(product => product.stock <= product.min_stock);
        }
        throw error;
      }
      const lowStock = (data || []).filter(product => product.stock <= product.min_stock);
      return await enrichProductsWithSupplierDebt(lowStock);
    } catch (err) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('stock', { ascending: true });
      if (error) return [];
      return (data || []).filter(product => product.stock <= product.min_stock);
    }
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating product:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Save product error (catch):', JSON.stringify(err, null, 2));
      throw err;
    }
  },

  async update(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating product:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Update product error (catch):', JSON.stringify(err, null, 2));
      throw err;
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set') {
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
          sku,
          price,
          cost,
          unit,
          volume,
          category_id,
          product_categories (name),
          supplier_id,
          suppliers (name)
        ),
        warehouses (
          id,
          name
        ),
        unit_price,
        reference,
        reference_type,
        payment_method_id,
        payment_methods (id, name),
        project_location,
        movement_category
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
          sku,
          price,
          cost,
          unit,
          volume,
          category_id,
          product_categories (name),
          supplier_id,
          suppliers (name)
        ),
        warehouses (
          id,
          name
        ),
        unit_price,
        reference,
        reference_type,
        payment_method_id,
        payment_methods (id, name),
        project_location,
        movement_category
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getBySupplier(supplierId: string) {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('supplier_id', supplierId);

    if (!products || products.length === 0) return [];

    const productIds = products.map(p => p.id);

    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          unit,
          supplier_id,
          suppliers (name)
        ),
        warehouses (id, name),
        payment_methods (id, name)
      `)
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) {
    const { data: movementData, error: movementError } = await supabase
      .from('stock_movements')
      .insert(movement)
      .select(`
        *,
        products (id, name, sku, price, cost),
        warehouses (id, name),
        unit_price,
        payment_method_id,
        payment_methods (id, name),
        project_location,
        movement_category
      `)
      .single()

    if (movementError) throw movementError

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

    if (movement.payment_method_id && movement.movement_type === 'in') {
      const { data: pm } = await supabase
        .from('payment_methods')
        .select('name')
        .eq('id', movement.payment_method_id)
        .single();

      if (pm?.name?.toLowerCase().includes('deposit')) {
        const { data: prod } = await supabase
          .from('products')
          .select('supplier_id, name')
          .eq('id', movement.product_id)
          .single();

        if (prod?.supplier_id) {
          // Fallback to product cost if unit_price is 0 or missing
          const price = movement.unit_price || (prod as any).cost || 0;
          const totalUsageValue = movement.quantity * price;
          
          if (totalUsageValue > 0) {
            console.log(`Recording deposit usage for supplier ${prod.supplier_id}: ${totalUsageValue}`);
            // Ensure no duplicate exists for this reference
            await supabase.from('supplier_deposits').delete().eq('reference_id', movementData.id).eq('type', 'usage');

            // Insert into supplier_deposits (usage record)
            const { error: depositError } = await supabase.from('supplier_deposits').insert({
              supplier_id: prod.supplier_id,
              amount: totalUsageValue,
              type: 'usage',
              description: `Belanja Material: ${prod.name} x ${movement.quantity} (Ref: ${movement.reference || 'Manual'})`,
              reference_id: movementData.id
            });

            if (depositError) {
              console.error('Error recording deposit usage:', depositError);
            } else {
              console.log('Deposit usage recorded successfully');
            }
          }
        }
      }
    }

    // NEW: Handle 'Hutang' (Debt) payment method for material purchases
    if (movement.movement_type === 'in' && movement.payment_method_id) {
      try {
        const { data: pm } = await supabase
          .from('payment_methods')
          .select('name')
          .eq('id', movement.payment_method_id)
          .single();

        const pmName = pm?.name?.toLowerCase() || '';
        const isHutang = pmName.includes('hutang') || pmName.includes('tempo') || pmName.includes('kredit');
        
        if (isHutang) {
          const { data: prod } = await supabase
            .from('products')
            .select('supplier_id, name, sku, cost')
            .eq('id', movement.product_id)
            .single();

          if (prod?.supplier_id) {
            const price = movement.unit_price || (prod as any).cost || 0;
            const totalAmount = movement.quantity * price;
            
            if (totalAmount > 0) {
              console.log(`[Inventory] Creating auto-invoice for '${pmName}' purchase. Supplier: ${prod.supplier_id}`);
              
              // 1. Create the purchase invoice
              const invoiceNumber = `INV-AUTO-${Date.now().toString().slice(-6)}`;
              const { data: invoiceData, error: invoiceError } = await supabase
                .from('purchase_invoices')
                .insert({
                  supplier_id: prod.supplier_id,
                  invoice_number: invoiceNumber,
                  invoice_date: new Date().toISOString().split('T')[0],
                  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
                  status: 'received',
                  payment_status: 'unpaid',
                  subtotal: totalAmount,
                  tax_amount: 0,
                  discount_amount: 0,
                  total_amount: totalAmount,
                  paid_amount: 0,
                  notes: `Auto-generated from Material Purchase: ${prod.name}. Ref: ${movement.reference || 'None'}`,
                  created_by: (movement as any).created_by || 'system'
                })
                .select()
                .single();

              if (!invoiceError && invoiceData) {
                // 2. Create the invoice item
                await supabase.from('purchase_invoice_items').insert({
                  purchase_invoice_id: invoiceData.id,
                  product_id: movement.product_id,
                  quantity: movement.quantity,
                  unit_price: price,
                  discount_percentage: 0,
                  line_total: totalAmount,
                  notes: `Linked to Stock Movement: ${movementData.id}`
                });

                // 3. Update stock movement reference if it was empty or manual prefix
                if (!movement.reference || movement.reference.startsWith('MSK')) {
                  await supabase
                    .from('stock_movements')
                    .update({ reference: invoiceNumber })
                    .eq('id', movementData.id);
                  
                  // Update local returned data
                  movementData.reference = invoiceNumber;
                }
                console.log(`[Inventory] Auto-invoice ${invoiceNumber} created successfully.`);
              } else if (invoiceError) {
                console.error('[Inventory] Error creating auto-invoice:', invoiceError);
              }
            }
          } else {
            console.warn(`[Inventory] Skip auto-invoice: Product '${prod?.name}' has no supplier_id assigned.`);
          }
        }
      } catch (err) {
        console.error('[Inventory] Fatal error in auto-invoice logic:', err);
      }
    }

    return movementData
  },

  async update(id: string, updates: Partial<StockMovement>) {
    const { data: oldMovement, error: fetchError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { data: movementData, error: updateError } = await supabase
      .from('stock_movements')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        products (id, name, sku, price, cost),
        warehouses (id, name),
        unit_price,
        payment_method_id,
        payment_methods (id, name),
        project_location,
        movement_category
      `)
      .single()

    if (updateError) throw updateError

    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', oldMovement.product_id)
      .single()

    if (product) {
      let currentStock = product.stock || 0
      if (oldMovement.movement_type === 'in' || oldMovement.movement_type === 'adjustment') {
        currentStock -= oldMovement.quantity
      } else if (oldMovement.movement_type === 'out') {
        currentStock += oldMovement.quantity
      }

      const finalMovement = { ...oldMovement, ...updates }
      if (finalMovement.movement_type === 'in' || finalMovement.movement_type === 'adjustment') {
        currentStock += finalMovement.quantity
      } else if (finalMovement.movement_type === 'out') {
        currentStock = Math.max(0, currentStock - finalMovement.quantity)
      }

      await supabase
        .from('products')
        .update({ stock: currentStock })
        .eq('id', oldMovement.product_id)
    }


    await supabase.from('supplier_deposits').delete().eq('reference_id', id).eq('type', 'usage');
    const finalMov = { ...oldMovement, ...updates };
    if (finalMov.payment_method_id && finalMov.movement_type === 'in') {
      const { data: pm } = await supabase
        .from('payment_methods')
        .select('name')
        .eq('id', finalMov.payment_method_id)
        .single();

      if (pm?.name?.toLowerCase().includes('deposit')) {
        const { data: prod } = await supabase
          .from('products')
          .select('supplier_id, name')
          .eq('id', finalMov.product_id)
          .single();

        if (prod?.supplier_id) {
          const price = finalMov.unit_price || (prod as any).cost || 0;
          const totalUsageValue = finalMov.quantity * price;

          if (totalUsageValue > 0) {
            console.log(`Updating deposit usage for supplier ${prod.supplier_id}: ${totalUsageValue}`);
            const { error: depositError } = await supabase.from('supplier_deposits').insert({
              supplier_id: prod.supplier_id,
              amount: totalUsageValue,
              type: 'usage',
              description: `Pembelian produk: ${prod.name} (Ref: ${finalMov.reference || '-'})`,
              reference_id: id
            });

            if (depositError) {
              console.error('Error updating deposit usage:', depositError);
            } else {
              console.log('Deposit usage updated successfully');
            }
          }
        }
      }
    }

    return movementData
  },

  async delete(id: string) {
    console.log(`[InventoryService] Attempting to delete stock movement: ${id}`);
    
    // 1. Fetch the movement
    const { data: movement, error: fetchError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error(`[InventoryService] Error fetching movement ${id}:`, fetchError);
      throw new Error(`Data mutasi stok tidak ditemukan: ${fetchError.message}`);
    }

    // 2. Revert product stock
    const { data: product, error: productFetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', movement.product_id)
      .single()

    if (productFetchError) {
      console.warn(`[InventoryService] Could not find product ${movement.product_id} to revert stock`);
    } else if (product) {
      let currentStock = product.stock || 0
      if (movement.movement_type === 'in' || movement.movement_type === 'adjustment') {
        currentStock -= movement.quantity
      } else if (movement.movement_type === 'out') {
        currentStock += movement.quantity
      }

      console.log(`[InventoryService] Reverting stock for product ${movement.product_id}: ${product.stock} -> ${currentStock}`);
      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({ stock: currentStock })
        .eq('id', movement.product_id)
      
      if (stockUpdateError) {
        console.error(`[InventoryService] Failed to revert stock:`, stockUpdateError);
        throw new Error(`Gagal menyesuaikan stok barang: ${stockUpdateError.message}`);
      }
    }

    // 3. Delete associated supplier deposits (usage records)
    const { error: depositDeleteError } = await supabase
      .from('supplier_deposits')
      .delete()
      .eq('reference_id', id)
      .eq('type', 'usage');
    
    if (depositDeleteError) {
      console.warn(`[InventoryService] Error deleting related supplier deposits:`, depositDeleteError);
    }
    
    // 4. Cleanup auto-generated invoices if applicable
    if (movement.reference && movement.reference.startsWith('INV-AUTO-')) {
      console.log(`[InventoryService] Checking for auto-generated invoice: ${movement.reference}`);
      const { data: invoice, error: invoiceFetchError } = await supabase
        .from('purchase_invoices')
        .select('id')
        .eq('invoice_number', movement.reference)
        .maybeSingle();
      
      if (invoiceFetchError) {
        console.warn(`[InventoryService] Error fetching invoice ${movement.reference}:`, invoiceFetchError);
      } else if (invoice) {
        // 4a. Check for payments linked to this invoice
        const { data: payments, error: paymentsFetchError } = await supabase
          .from('purchase_payments')
          .select('id')
          .eq('invoice_id', invoice.id);
        
        if (paymentsFetchError) {
          console.error(`[InventoryService] Error checking for payments:`, paymentsFetchError);
        } else if (payments && payments.length > 0) {
          throw new Error(`Tidak dapat menghapus: Transaksi ini sudah memiliki ${payments.length} pembayaran pada invoice ${movement.reference}. Hapus pembayaran terlebih dahulu melalui modul Keuangan.`);
        }

        console.log(`[InventoryService] Deleting invoice ${invoice.id} and its items`);
        // Note: purchase_invoice_items should have ON DELETE CASCADE on purchase_invoice_id
        // But we explicitly delete items first for safety.
        await supabase
          .from('purchase_invoice_items')
          .delete()
          .eq('purchase_invoice_id', invoice.id);

        const { error: invoiceDeleteError } = await supabase
          .from('purchase_invoices')
          .delete()
          .eq('id', invoice.id);
        
        if (invoiceDeleteError) {
          console.error(`[InventoryService] Error deleting invoice:`, invoiceDeleteError);
          throw new Error(`Gagal menghapus invoice otomatis: ${invoiceDeleteError.message}`);
        }
      }
    }

    // 5. Finally, delete the movement record itself
    const { error: movementDeleteError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', id)
    
    if (movementDeleteError) {
      console.error(`[InventoryService] Error deleting movement record:`, movementDeleteError);
      throw new Error(`Gagal menghapus mutasi stok: ${movementDeleteError.message}`);
    }

    console.log(`[InventoryService] Successfully deleted movement ${id}`);
  }
}
