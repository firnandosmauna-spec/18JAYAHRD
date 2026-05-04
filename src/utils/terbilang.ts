/**
 * Utility to convert numbers to Indonesian words (Terbilang)
 */
export function terbilang(n: number): string {
    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    let result = '';

    if (n < 12) {
        result = units[n];
    } else if (n < 20) {
        result = terbilang(n - 10) + ' belas';
    } else if (n < 100) {
        result = terbilang(Math.floor(n / 10)) + ' puluh ' + terbilang(n % 10);
    } else if (n < 200) {
        result = 'seratus ' + terbilang(n - 100);
    } else if (n < 1000) {
        result = terbilang(Math.floor(n / 100)) + ' ratus ' + terbilang(n % 100);
    } else if (n < 2000) {
        result = 'seribu ' + terbilang(n - 1000);
    } else if (n < 1000000) {
        result = terbilang(Math.floor(n / 1000)) + ' ribu ' + terbilang(n % 1000);
    } else if (n < 1000000000) {
        result = terbilang(Math.floor(n / 1000000)) + ' juta ' + terbilang(n % 1000000);
    } else if (n < 1000000000000) {
        result = terbilang(Math.floor(n / 1000000000)) + ' milyar ' + terbilang(n % 1000000000);
    } else if (n < 1000000000000000) {
        result = terbilang(Math.floor(n / 1000000000000)) + ' triliun ' + terbilang(n % 1000000000000);
    }

    return result.replace(/\s+/g, ' ').trim();
}

export function formatTerbilang(n: number): string {
    if (n === 0) return 'nol rupiah';
    return (terbilang(n) + ' rupiah').toUpperCase();
}
