export type TransactionFilterType = 'all' | 'in' | 'out';
export type SortOrder = 'desc' | 'asc';
export type DatePreset = 'today' | '7days' | 'month' | 'year' | 'all';

function formatDateInput(date: Date) {
    return date.toLocaleDateString('en-CA');
}

export function getDatePresetRange(preset: Exclude<DatePreset, 'all'>) {
    const now = new Date();
    const end = formatDateInput(now);

    if (preset === 'today') {
        return { startDate: end, endDate: end };
    }

    if (preset === '7days') {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return { startDate: formatDateInput(start), endDate: end };
    }

    if (preset === 'month') {
        return {
            startDate: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
            endDate: end,
        };
    }

    return {
        startDate: formatDateInput(new Date(now.getFullYear(), 0, 1)),
        endDate: end,
    };
}

export function getDateRangeLabel(startDate: string, endDate: string) {
    if (startDate && endDate) {
        return `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`;
    }

    if (startDate) {
        return `Sejak ${new Date(startDate).toLocaleDateString('id-ID')}`;
    }

    if (endDate) {
        return `Sampai ${new Date(endDate).toLocaleDateString('id-ID')}`;
    }

    return 'Semua tanggal';
}
