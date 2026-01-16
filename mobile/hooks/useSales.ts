import { useState, useEffect } from 'react';
import { SalesService } from '../services/salesService';
import type {
    Customer,
    Product,
    SalesOrder,
    SalesInvoice,
    SalesStats
} from '../types/sales';

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await SalesService.getCustomers();
            setCustomers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newCustomer = await SalesService.createCustomer(customer);
            setCustomers(prev => [newCustomer, ...prev]);
            return newCustomer;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateCustomer = async (id: string, updates: Partial<Customer>) => {
        try {
            const updatedCustomer = await SalesService.updateCustomer(id, updates);
            setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
            return updatedCustomer;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteCustomer = async (id: string) => {
        try {
            await SalesService.deleteCustomer(id);
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        customers,
        loading,
        error,
        refetch: fetchCustomers,
        createCustomer,
        updateCustomer,
        deleteCustomer
    };
}

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await SalesService.getProducts();
            setProducts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newProduct = await SalesService.createProduct(product);
            setProducts(prev => [newProduct, ...prev]);
            return newProduct;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            const updatedProduct = await SalesService.updateProduct(id, updates);
            setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
            return updatedProduct;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            await SalesService.deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        products,
        loading,
        error,
        refetch: fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct
    };
}

export function useSalesOrders() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await SalesService.getSalesOrders();
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
        order: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at' | 'items'>,
        items: any[]
    ) => {
        try {
            const newOrder = await SalesService.createSalesOrder(order, items);
            setOrders(prev => [newOrder, ...prev]);
            return newOrder;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateOrder = async (id: string, updates: Partial<SalesOrder>) => {
        try {
            const updatedOrder = await SalesService.updateSalesOrder(id, updates);
            setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
            return updatedOrder;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            await SalesService.deleteSalesOrder(id);
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

export function useSalesInvoices() {
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await SalesService.getSalesInvoices();
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
        invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
        items: any[]
    ) => {
        try {
            const newInvoice = await SalesService.createSalesInvoice(invoice, items);
            setInvoices(prev => [newInvoice, ...prev]);
            return newInvoice;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateInvoice = async (id: string, updates: Partial<SalesInvoice>) => {
        try {
            const updatedInvoice = await SalesService.updateSalesInvoice(id, updates);
            setInvoices(prev => prev.map(i => i.id === id ? updatedInvoice : i));
            return updatedInvoice;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteInvoice = async (id: string) => {
        try {
            await SalesService.deleteSalesInvoice(id);
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

export function useSalesStats() {
    const [stats, setStats] = useState<SalesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await SalesService.getSalesStats();
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
