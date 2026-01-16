import { useState, useEffect } from 'react';
import { PurchaseService } from '@/services/purchaseService';
import type { 
  Supplier, 
  PurchaseOrder, 
  PurchaseInvoice, 
  PurchaseStats 
} from '@/types/purchase';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PurchaseService.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSupplier = await PurchaseService.createSupplier(supplier);
      setSuppliers(prev => [newSupplier, ...prev]);
      return newSupplier;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const updatedSupplier = await PurchaseService.updateSupplier(id, updates);
      setSuppliers(prev => prev.map(s => s.id === id ? updatedSupplier : s));
      return updatedSupplier;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      await PurchaseService.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    suppliers,
    loading,
    error,
    refetch: fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier
  };
}

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PurchaseService.getPurchaseOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const createOrder = async (
    order: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: any[]
  ) => {
    try {
      const newOrder = await PurchaseService.createPurchaseOrder(order, items);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      const updatedOrder = await PurchaseService.updatePurchaseOrder(id, updates);
      setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
      return updatedOrder;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await PurchaseService.deletePurchaseOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder
  };
}

export function usePurchaseInvoices() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PurchaseService.getPurchaseInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const createInvoice = async (
    invoice: Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: any[]
  ) => {
    try {
      const newInvoice = await PurchaseService.createPurchaseInvoice(invoice, items);
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<PurchaseInvoice>) => {
    try {
      const updatedInvoice = await PurchaseService.updatePurchaseInvoice(id, updates);
      setInvoices(prev => prev.map(i => i.id === id ? updatedInvoice : i));
      return updatedInvoice;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await PurchaseService.deletePurchaseInvoice(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice
  };
}

export function usePurchaseStats() {
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PurchaseService.getPurchaseStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}