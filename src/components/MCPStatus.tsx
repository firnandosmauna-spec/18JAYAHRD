import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Settings
} from 'lucide-react';

export function MCPStatus() {
  const [mcpConfig, setMcpConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load MCP configuration
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';

    const config = {
      projectRef: projectRef,
      mcpUrl: `https://mcp.supabase.com/mcp?project_ref=${projectRef}`,
      configFiles: [
        { path: 'mcp.json', status: 'created' },
        { path: '.kiro/settings/mcp.json', status: 'created' },
        { path: '~/.kiro/settings/mcp.json', status: 'created' }
      ]
    };
    setMcpConfig(config);
  }, []);

  const copyConfig = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    const configText = `{"mcpServers": {"supabase": {"url": "https://mcp.supabase.com/mcp?project_ref=${projectRef}"}}}`;

    try {
      await navigator.clipboard.writeText(configText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!mcpConfig) {
    return <div>Loading MCP status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* MCP Server Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle>MCP Supabase Server Status</CardTitle>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pending Activation
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Reference</p>
              <p className="font-mono text-sm">{mcpConfig.projectRef}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">MCP URL</p>
              <p className="font-mono text-xs break-all">{mcpConfig.mcpUrl}</p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              MCP Supabase server belum aktif. Ikuti langkah-langkah di bawah untuk mengaktifkannya.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configuration Files Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mcpConfig.configFiles.map((file: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <code className="text-sm">{file.path}</code>
                </div>
                <Badge variant="secondary">Created</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activation Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Langkah Aktivasi MCP Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Restart Kiro IDE</h4>
                <p className="text-sm text-muted-foreground">
                  Tutup dan buka kembali Kiro IDE untuk memuat konfigurasi MCP yang baru
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Cek MCP Server View</h4>
                <p className="text-sm text-muted-foreground">
                  Buka sidebar Kiro → MCP Servers → Pastikan "supabase" server muncul
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Test MCP Commands</h4>
                <p className="text-sm text-muted-foreground">
                  Jalankan command: <code className="bg-gray-100 px-1 rounded">list_tables</code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <h4 className="font-medium">Gunakan MCP Integration Panel</h4>
                <p className="text-sm text-muted-foreground">
                  Akses panel lengkap di: <code className="bg-gray-100 px-1 rounded">/mcp-supabase</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={copyConfig}
              className="flex items-center gap-2"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy MCP Config
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/mcp-supabase', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              MCP Integration Panel
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/supabase-test', '_blank')}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Test Supabase Connection
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('https://supabase.com/dashboard/project/nmtxeyemetxuljrejnfd', '_blank')}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Supabase Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample MCP Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Sample MCP Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">List all tables:</p>
              <code className="text-xs">list_tables</code>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Get employees data:</p>
              <code className="text-xs">select_data "SELECT * FROM employees LIMIT 10"</code>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Employee statistics:</p>
              <code className="text-xs">select_data "SELECT d.name, COUNT(e.id) FROM departments d LEFT JOIN employees e ON d.id = e.department_id GROUP BY d.name"</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Butuh bantuan?</strong> Baca panduan lengkap di file <code>MCP_SETUP_GUIDE.md</code>
          atau buka MCP Integration Panel untuk commands yang siap pakai.
        </AlertDescription>
      </Alert>
    </div>
  );
}