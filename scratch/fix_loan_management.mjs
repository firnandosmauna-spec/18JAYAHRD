import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/hrd/LoanManagement.tsx';
let content = readFileSync(path, 'utf8');

// ===== CHANGE 1: Lock "Bayar Cicilan" to admin only =====
// The button appears inside the 'approved' block - wrap it with isOnlyAdmin check
const old1 = `{loan.status === 'approved' && (
                                                          <>
                                                              <Button size="icon" variant="ghost" title="Bayar Cicilan" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handlePaymentClick(loan)}>
                                                                  <Receipt className="w-4 h-4" />
                                                              </Button>
                                                              <Button size="icon" variant="ghost" title="Riwayat Cicilan" className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" onClick={() => handleShowHistory(loan)}>
                                                                  <History className="w-4 h-4" />
                                                              </Button>
                                                          </>
                                                      )}`;

const new1 = `{loan.status === 'approved' && (
                                                          <>
                                                              {isOnlyAdmin && (
                                                                  <Button size="icon" variant="ghost" title="Bayar Cicilan" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handlePaymentClick(loan)}>
                                                                      <Receipt className="w-4 h-4" />
                                                                  </Button>
                                                              )}
                                                              <Button size="icon" variant="ghost" title="Riwayat Cicilan" className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" onClick={() => handleShowHistory(loan)}>
                                                                  <History className="w-4 h-4" />
                                                              </Button>
                                                          </>
                                                      )}`;

if (content.includes(old1)) {
  content = content.replace(old1, new1);
  console.log('✅ Change 1: Wrapped Bayar Cicilan button with isOnlyAdmin check.');
} else {
  // Try CRLF variant
  const old1crlf = old1.replace(/\n/g, '\r\n');
  const new1crlf = new1.replace(/\n/g, '\r\n');
  if (content.includes(old1crlf)) {
    content = content.replace(old1crlf, new1crlf);
    console.log('✅ Change 1 (CRLF): Wrapped Bayar Cicilan button with isOnlyAdmin check.');
  } else {
    console.log('❌ Change 1 NOT FOUND - searching for partial match...');
    const idx = content.indexOf('Bayar Cicilan');
    console.log('Index of Bayar Cicilan:', idx);
    if (idx >= 0) {
      console.log('Context before:', JSON.stringify(content.substring(idx - 300, idx)));
      console.log('Context after:', JSON.stringify(content.substring(idx, idx + 400)));
    }
  }
}

writeFileSync(path, content, 'utf8');
console.log('Done writing file.');
