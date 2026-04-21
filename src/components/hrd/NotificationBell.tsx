import { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    Bell,
    CheckCircle,
    X,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationsContext } from '@/contexts/NotificationContext';

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
    } = useNotificationsContext();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Bell className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-mono text-xs text-white">
                        {unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-50 w-[360px] rounded-lg border bg-background p-4 shadow-lg">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-display text-base font-semibold">Notifikasi</h3>
                            <p className="font-body text-sm text-muted-foreground">
                                {unreadCount > 0
                                    ? `${unreadCount} notifikasi belum dibaca`
                                    : 'Semua notifikasi telah dibaca'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="font-body text-xs text-hrd"
                                >
                                    Tandai semua dibaca
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                        {notifications.length === 0 && (
                            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                Tidak ada notifikasi saat ini.
                            </div>
                        )}

                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                    notification.read
                                        ? 'border-gray-200 bg-gray-50'
                                        : 'border-hrd/20 bg-hrd/5'
                                }`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p
                                                className={`text-sm font-body ${
                                                    notification.read
                                                        ? 'text-gray-600'
                                                        : 'font-medium text-[#1C1C1E]'
                                                }`}
                                            >
                                                {notification.title}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    clearNotification(notification.id);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="mt-0.5 font-body text-xs text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                                            {new Date(notification.created_at).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
