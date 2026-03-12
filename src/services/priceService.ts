import { supabase } from '@/lib/supabase';

export interface PriceAdjustmentData {
    productId: string;
    oldCost?: number;
    newCost?: number;
    oldPrice?: number;
    newPrice?: number;
    adjustmentType: 'percentage' | 'fixed';
    adjustmentValue: number;
    targetField: 'cost' | 'price' | 'both';
    notes?: string;
}

export const priceService = {
    async getPriceHistory(productId?: string) {
        let query = supabase
            .from('product_price_history')
            .select(`
        *,
        products (name, sku)
      `)
            .order('created_at', { ascending: false });

        if (productId) {
            query = query.eq('product_id', productId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async applyBulkAdjustment(
        productIds: string[],
        adjustment: {
            type: 'percentage' | 'fixed';
            value: number;
            target: 'cost' | 'price' | 'both';
            direction: 'increase' | 'decrease';
            notes?: string;
        }
    ) {
        // ... (previous implementation remains for backward compatibility if needed, 
        // but we'll focus on the new granular one)
        const granularUpdates = await Promise.all(productIds.map(async id => {
            const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
            if (!p) return null;

            const multiplier = adjustment.direction === 'increase' ? 1 : -1;
            const val = adjustment.value * multiplier;

            let newCost = p.cost || 0;
            let newPrice = p.price || 0;

            if (adjustment.target === 'cost' || adjustment.target === 'both') {
                newCost = adjustment.type === 'percentage' ? newCost * (1 + val / 100) : newCost + val;
            }
            if (adjustment.target === 'price' || adjustment.target === 'both') {
                newPrice = adjustment.type === 'percentage' ? newPrice * (1 + val / 100) : newPrice + val;
            }

            return {
                productId: id,
                initialCost: p.initial_cost || p.cost || 0,
                currentCost: newCost,
                initialPrice: p.initial_price || p.price || 0,
                currentPrice: newPrice,
                notes: adjustment.notes
            };
        }));

        const validUpdates = granularUpdates.filter(u => u !== null) as any[];
        return this.applyGranularAdjustments(validUpdates);
    },

    async applyGranularAdjustments(updates: {
        productId: string;
        initialCost: number;
        currentCost: number;
        initialPrice: number;
        currentPrice: number;
        notes?: string;
    }[]) {
        for (const update of updates) {
            // Build update payload - only update if > 0 to avoid overwriting with empty UI values
            const productUpdate: any = {};
            if (update.currentCost > 0) productUpdate.cost = update.currentCost;
            if (update.currentPrice > 0) productUpdate.price = update.currentPrice;

            if (Object.keys(productUpdate).length === 0) continue;

            const initialData = {
                initial_cost: update.initialCost,
                initial_price: update.initialPrice
            };

            // Attempt to update with initial values (might fail if columns missing)
            try {
                const { error: prodError } = await supabase
                    .from('products')
                    .update({
                        ...productUpdate,
                        ...initialData
                    })
                    .eq('id', update.productId);

                if (prodError) {
                    // If it's a "column not found" error (common for 400), try fallback
                    const errMsg = (prodError as any).message?.toLowerCase() || '';
                    if (errMsg.includes('initial_') || prodError.code === 'PGRST204') {
                        const { error: fallbackError } = await supabase
                            .from('products')
                            .update(productUpdate)
                            .eq('id', update.productId);
                        if (fallbackError) throw fallbackError;
                    } else {
                        throw prodError;
                    }
                }
            } catch (err) {
                // Final fallback for any unexpected catastrophic failures related to schema mismatch
                const { error: finalFallbackError } = await supabase
                    .from('products')
                    .update(productUpdate)
                    .eq('id', update.productId);
                if (finalFallbackError) throw finalFallbackError;
            }

            // 2. Log to history
            const historyData: any = {
                product_id: update.productId,
                adjustment_type: 'fixed',
                adjustment_value: 0,
                target_field: 'both',
                notes: update.notes || 'Penyesuaian manual spreadsheet'
            };

            // Only log changes that actually happened
            if (update.currentCost > 0) {
                historyData.old_cost = update.initialCost;
                historyData.new_cost = update.currentCost;
            }
            if (update.currentPrice > 0) {
                historyData.old_price = update.initialPrice;
                historyData.new_price = update.currentPrice;
            }

            const { error: histError } = await supabase
                .from('product_price_history')
                .insert(historyData);

            if (histError) {
                console.error('History log error:', histError);
                // Don't throw here to avoid blocking other product updates in the batch
            }
        }
        return updates;
    },

    async deletePriceHistory(id: string) {
        const { error, count } = await supabase
            .from('product_price_history')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error('Error deleting price history:', error);
            throw error;
        }

        if (count === 0) {
            throw new Error('Data tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya.');
        }

        return true;
    },

    async updatePriceHistory(id: string, updates: { notes?: string }) {
        const { error } = await supabase
            .from('product_price_history')
            .update(updates)
            .eq('id', id);
        if (error) {
            console.error('Error updating price history:', error);
            throw error;
        }
    },

    async createManualHistoryEntry(entry: {
        productId: string;
        oldCost: number;
        newCost: number;
        oldPrice: number;
        newPrice: number;
        notes: string;
    }) {
        const { error } = await supabase
            .from('product_price_history')
            .insert({
                product_id: entry.productId,
                old_cost: entry.oldCost,
                new_cost: entry.newCost,
                old_price: entry.oldPrice,
                new_price: entry.newPrice,
                adjustment_type: 'fixed',
                adjustment_value: 0,
                target_field: 'both',
                notes: entry.notes
            });
        if (error) {
            console.error('Error creating manual history entry:', error);
            throw error;
        }
    }
};
