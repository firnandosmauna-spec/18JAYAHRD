# Design Document - Accounting Module

## Overview

The Accounting Module is a comprehensive financial management system that provides complete transaction tracking, standard financial reporting, and real-time financial analytics. The system follows double-entry accounting principles and integrates seamlessly with existing HRD modules to provide unified business management capabilities.

## Architecture

### System Architecture
The accounting module follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  │  Reports  │  Transactions  │  Configuration   │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Transaction  │  Reporting  │  Integration  │  Audit        │
│  Engine       │  Engine     │  Services     │  Services     │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Supabase Database  │  HRD Integration  │  External APIs    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL database, real-time subscriptions)
- **State Management**: React hooks with custom Supabase hooks
- **UI Components**: Shadcn/ui component library
- **Charts/Analytics**: Recharts or Chart.js for financial visualizations
- **Export**: jsPDF for PDF generation, xlsx for Excel exports

## Components and Interfaces

### Core Components

#### 1. AccountingDashboard
- **Purpose**: Main dashboard with financial KPIs and overview
- **Features**: Cash position, revenue trends, expense analysis, quick actions
- **Props**: `dateRange`, `refreshInterval`, `userRole`

#### 2. TransactionManager
- **Purpose**: Create, edit, and manage financial transactions
- **Features**: Journal entries, transaction validation, account selection
- **Props**: `transactionId?`, `mode: 'create' | 'edit' | 'view'`

#### 3. FinancialReports
- **Purpose**: Generate and display standard financial reports
- **Features**: Income Statement, Balance Sheet, Cash Flow, custom reports
- **Props**: `reportType`, `dateRange`, `filters`, `exportFormat?`

#### 4. ChartOfAccounts
- **Purpose**: Manage account structure and hierarchy
- **Features**: Account creation, categorization, balance tracking
- **Props**: `accountType?`, `editable: boolean`

#### 5. GeneralLedger
- **Purpose**: Display complete transaction history by account
- **Features**: Transaction listing, filtering, drill-down capabilities
- **Props**: `accountId?`, `dateRange`, `searchQuery`

### Interface Definitions

```typescript
interface Transaction {
  id: string;
  date: string;
  description: string;
  reference?: string;
  entries: JournalEntry[];
  status: 'draft' | 'posted' | 'reversed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_active: boolean;
  balance: number;
  created_at: string;
}

interface FinancialReport {
  type: 'income_statement' | 'balance_sheet' | 'cash_flow';
  period_start: string;
  period_end: string;
  data: ReportSection[];
  totals: ReportTotals;
}
```

## Data Models

### Database Schema

#### Accounts Table
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type account_type NOT NULL,
  parent_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE account_type AS ENUM (
  'asset', 'liability', 'equity', 'revenue', 'expense'
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(100),
  status transaction_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE transaction_status AS ENUM ('draft', 'posted', 'reversed');
```

#### Journal Entries Table
```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Account Balances View
```sql
CREATE VIEW account_balances AS
SELECT 
  a.id,
  a.code,
  a.name,
  a.type,
  COALESCE(SUM(
    CASE 
      WHEN a.type IN ('asset', 'expense') THEN je.debit_amount - je.credit_amount
      ELSE je.credit_amount - je.debit_amount
    END
  ), 0) as balance
FROM accounts a
LEFT JOIN journal_entries je ON a.id = je.account_id
LEFT JOIN transactions t ON je.transaction_id = t.id
WHERE t.status = 'posted' OR t.status IS NULL
GROUP BY a.id, a.code, a.name, a.type;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Double-Entry Accounting Balance
*For any* transaction, the sum of all debit amounts must equal the sum of all credit amounts
**Validates: Requirements 2.1, 2.2**

### Property 2: Account Balance Consistency
*For any* account, the calculated balance from journal entries must match the balance shown in reports
**Validates: Requirements 1.2, 1.3**

### Property 3: Transaction Immutability
*For any* posted transaction, modification attempts should be rejected and the original transaction data preserved
**Validates: Requirements 7.4**

### Property 4: Report Data Integrity
*For any* financial report, all displayed figures must be derivable from the underlying transaction data
**Validates: Requirements 1.1, 3.1**

### Property 5: HRD Integration Consistency
*For any* payroll transaction from HRD, corresponding accounting entries must be created with matching amounts
**Validates: Requirements 6.1, 6.3**

### Property 6: Audit Trail Completeness
*For any* transaction modification, an audit record must be created with timestamp, user, and change details
**Validates: Requirements 7.1, 7.2**

### Property 7: Chart of Accounts Hierarchy
*For any* account with child accounts, deletion should be prevented if child accounts exist or have transactions
**Validates: Requirements 5.4**

### Property 8: Period-Based Filtering
*For any* date range filter, only transactions within the specified period should appear in reports
**Validates: Requirements 1.5, 3.2**

## Error Handling

### Transaction Validation Errors
- **Unbalanced Entries**: Display clear error message showing debit/credit difference
- **Invalid Account**: Prevent selection of inactive or non-existent accounts
- **Date Validation**: Ensure transaction dates are within valid fiscal periods
- **Duplicate References**: Warn users of potential duplicate transaction references

### Report Generation Errors
- **No Data**: Display appropriate message when no transactions exist for selected period
- **Export Failures**: Provide retry mechanism and error details for failed exports
- **Large Dataset**: Implement pagination and loading states for large reports
- **Permission Errors**: Show appropriate access denied messages based on user role

### Integration Errors
- **HRD Sync Failures**: Log errors and provide manual reconciliation tools
- **Database Connectivity**: Implement offline mode with sync when connection restored
- **Concurrent Modifications**: Handle optimistic locking conflicts gracefully

## Testing Strategy

### Unit Testing
- **Transaction Engine**: Test double-entry validation, balance calculations
- **Report Generation**: Verify report accuracy with known test data
- **Account Management**: Test account hierarchy and validation rules
- **Integration Services**: Mock HRD integration and test data flow

### Property-Based Testing
The system will use **Hypothesis** (Python) or **fast-check** (JavaScript) for property-based testing with a minimum of 100 iterations per property.

Each property-based test will be tagged with the format: **Feature: accounting-module, Property {number}: {property_text}**

- **Property 1 Test**: Generate random transactions and verify debit/credit balance
- **Property 2 Test**: Create random journal entries and verify account balance calculations
- **Property 3 Test**: Attempt to modify posted transactions and verify immutability
- **Property 4 Test**: Generate reports from random transaction data and verify consistency
- **Property 5 Test**: Create HRD payroll data and verify accounting entry generation
- **Property 6 Test**: Modify transactions and verify audit trail creation
- **Property 7 Test**: Create account hierarchies and test deletion constraints
- **Property 8 Test**: Filter transactions by random date ranges and verify results

### Integration Testing
- **End-to-End Workflows**: Test complete transaction-to-report workflows
- **HRD Module Integration**: Verify payroll data flows correctly to accounting
- **User Role Testing**: Ensure proper access control across all features
- **Export Functionality**: Test PDF and Excel generation with various data sets

### Performance Testing
- **Large Dataset Handling**: Test with 10,000+ transactions
- **Report Generation Speed**: Ensure reports generate within 5 seconds
- **Real-time Updates**: Verify dashboard updates within 2 seconds of data changes
- **Concurrent User Load**: Test system with multiple simultaneous users