import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNotifications } from '@/hooks/useSupabase';

interface NotificationContextType {
    notifications: any[];
    unreadCount: number;
    addNotification: (notification: any) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotificationsContext() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotificationsContext must be used within a NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const {
        notifications,
        unreadCount,
        addNotification: addSupabaseNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications();

    const addNotification = async (notification: any) => {
        try {
            await addSupabaseNotification({
                title: notification.title,
                message: notification.message,
                type: notification.type,
                module: notification.module,
                user_id: notification.user_id || null, // System notification if not specified
                read: false,
            });
        } catch (error) {
            console.error('Failed to add notification:', error);
        }
    };

    const clearNotification = async (id: string) => {
        try {
            await deleteNotification(id);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearNotification
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
