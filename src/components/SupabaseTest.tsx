import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Database, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: any;
}

export function SupabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest = { name, status, message, details };
      
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Environment Variables
    updateTest('Environment Variables', 'loading', 'Checking environment variables...');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase') || supabaseKey.includes('your_supabase')) {
      updateTest('Environment Variables', 'error', 'Environment variables not configured properly', {
        url: supabaseUrl,
        keyLength: supabaseKey?.length || 0
      });
    } else {
      updateTest('Environment Variables', 'success', 'Environment variables configured', {
        url: supabaseUrl,
        keyLength: supabaseKey.length
      });
    }

    // Test 2: Supabase Client Connection
    updateTest('Supabase Connection', 'loading', 'Testing Supabase client connection...');
    
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('count')
        .limit(1);

      if (error) {
        updateTest('Supabase Connection', 'error', `Connection failed: ${error.message}`, error);
      } else {
        updateTest('Supabase Connection', 'success', 'Successfully connected to Supabase');
      }
    } catch (error) {
      updateTest('Supabase Connection', 'error', `Connection error: ${error}`, error);
    }

    // Test 3: Database Tables
    updateTest('Database Tables', 'loading', 'Checking database tables...');
    
    try {
      const tables = ['departments', 'employees', 'leave_requests', 'attendance', 'payroll', 'rewards', 'notifications'];
      const tableResults = [];

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            tableResults.push({ table, status: 'error', error: error.message });
          } else {
            tableResults.push({ table, status: 'success', count: data?.length || 0 });
          }
        } catch (err) {
          tableResults.push({ table, status: 'error', error: String(err) });
        }
      }

      const failedTables = tableResults.filter(t => t.status === 'error');
      
      if (failedTables.length > 0) {
        updateTest('Database Tables', 'error', `${failedTables.length} tables missing or inaccessible`, tableResults);
      } else {
        updateTest('Database Tables', 'success', `All ${tables.length} tables accessible`, tableResults);
      }
    } catch (error) {
      updateTest('Database Tables', 'error', `Table check failed: ${error}`, error);
    }

    // Test 4: Departments Data
    updateTest('Sample Data', 'loading', 'Checking sample data...');
    
    try {
      const { data: departments, error } = await supabase
        .from('departments')
        .select('*');

      if (error) {
        updateTest('Sample Data', 'error', `Failed to fetch departments: ${error.message}`, error);
      } else if (!departments || departments.length === 0) {
        updateTest('Sample Data', 'error', 'No departments found. Run the schema SQL to seed initial data.', { count: 0 });
      } else {
        updateTest('Sample Data', 'success', `Found ${departments.length} departments`, departments);
      }
    } catch (error) {
      updateTest('Sample Data', 'error', `Sample data check failed: ${error}`, error);
    }

    // Test 5: Row Level Security
    updateTest('RLS Policies', 'loading', 'Checking Row Level Security policies...');
    
    try {
      // Try to insert a test record to check RLS
      const { error } = await supabase
        .from('departments')
        .insert({ name: 'TEST_DEPT_' + Date.now(), description: 'Test department' })
        .select();

      if (error) {
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          updateTest('RLS Policies', 'error', 'RLS policies may be blocking access. Check policies in Supabase dashboard.', error);
        } else {
          updateTest('RLS Policies', 'success', 'RLS policies configured correctly');
        }
      } else {
        updateTest('RLS Policies', 'success', 'RLS policies allow proper access');
        
        // Clean up test record
        await supabase
          .from('departments')
          .delete()
          .like('name', 'TEST_DEPT_%');
      }
    } catch (error) {
      updateTest('RLS Policies', 'error', `RLS check failed: ${error}`, error);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'loading':
        return <Badge variant="secondary">Testing...</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <CardTitle>Supabase Connection Test</CardTitle>
          </div>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRunning ? 'Testing...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tests.length === 0 && !isRunning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Click "Run Tests" to diagnose Supabase connection issues.
            </AlertDescription>
          </Alert>
        )}

        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(test.status)}
                <h3 className="font-medium">{test.name}</h3>
              </div>
              {getStatusBadge(test.status)}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
            
            {test.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Show Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}

        {tests.length > 0 && !isRunning && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {tests.some(t => t.status === 'error') ? (
                <>
                  <li>• Fix the errors shown above</li>
                  <li>• Make sure you've run the schema SQL in Supabase SQL Editor</li>
                  <li>• Check RLS policies in Supabase Dashboard → Authentication → Policies</li>
                  <li>• Verify your API keys are correct in Settings → API</li>
                </>
              ) : (
                <>
                  <li>• ✅ All tests passed! Supabase is configured correctly</li>
                  <li>• You can now use the HRD module with Supabase</li>
                  <li>• Try adding a new employee to test the full functionality</li>
                </>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}