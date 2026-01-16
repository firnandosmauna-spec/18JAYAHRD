import { SupabaseTest } from '@/components/SupabaseTest';

export default function SupabaseTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supabase Diagnostic Tool</h1>
          <p className="text-gray-600">
            Test your Supabase connection and diagnose any configuration issues
          </p>
        </div>
        
        <SupabaseTest />
        
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Common Issues & Solutions</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-medium text-red-800">Error: "relation does not exist"</h3>
                <p className="text-sm text-red-600 mt-1">
                  Solution: Run the schema SQL in Supabase SQL Editor. Copy content from <code>supabase/schema.sql</code>
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-medium text-orange-800">Error: "Invalid API key"</h3>
                <p className="text-sm text-orange-600 mt-1">
                  Solution: Check your API key in Settings → API. Use the <strong>anon public</strong> key, not service_role.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-blue-800">Error: "Row Level Security"</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Solution: The schema includes RLS policies. If still having issues, check Authentication → Policies in Supabase dashboard.
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-green-800">All tests pass but still issues?</h3>
                <p className="text-sm text-green-600 mt-1">
                  Try refreshing the page, clearing browser cache, or check browser console for JavaScript errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}