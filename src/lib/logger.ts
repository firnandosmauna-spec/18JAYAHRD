
export interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    data?: any;
}

class Logger {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];

    addLog(message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info', data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            message,
            type,
            data
        };

        this.logs.unshift(entry); // Add to beginning

        // Keep max 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }

        this.notifyListeners();

        // Also log to console for devtools
        console.log(`[${type.toUpperCase()}] ${message}`, data || '');
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        this.notifyListeners();
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.logs));
    }
}

export const logger = new Logger();
