import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  Code, 
  BarChart3, 
  Copy, 
  ExternalLink,
  CheckCircle,
  Info
} from 'lucide-react';
import { mcpSupabaseService, MCP_COMMANDS, SCHEMA_DOCS, ANALYTICS_QUERIES } from '@/services/mcpSupabaseService';

export function MCPSupabasePanel() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const projectInfo = mcpSupabaseService.getProjectInfo();

  const copyToClipboard = async (text: string, commandName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandName);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CommandCard = ({ title, command, description }: { title: string; command: string; description?: string }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(command, title)}
            className="h-8 px-2"
          >
            {copiedCommand === title ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <code className="text-xs bg-gray-100 p-2 rounded block font-mono break-all">
          {command}
        </code>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle>MCP Supabase Integration</CardTitle>
            </div>
            <Badge variant="secondary">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Reference</p>
              <p className="font-mono text-sm">{projectInfo.projectRef}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">MCP URL</p>
              <p className="font-mono text-xs break-all">{projectInfo.mcpUrl}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(projectInfo.dashboardUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Supabase Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(projectInfo.apiUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              API Endpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="commands" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="commands">MCP Commands</TabsTrigger>
          <TabsTrigger value="schema">Database Schema</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Queries</TabsTrigger>
        </TabsList>

        {/* MCP Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Ready-to-Use MCP Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Table Operations</h3>
                  <CommandCard
                    title="List All Tables"
                    command={MCP_COMMANDS.listTables}
                    description="Get list of all tables in the database"
                  />
                  <CommandCard
                    title="Describe Employees Table"
                    command={MCP_COMMANDS.describeEmployees}
                    description="Get structure and details of employees table"
                  />
                  <CommandCard
                    title="Describe Departments Table"
                    command={MCP_COMMANDS.describeDepartments}
                    description="Get structure and details of departments table"
                  />

                  <h3 className="font-medium text-sm text-muted-foreground mb-3 mt-6">Data Queries</h3>
                  <CommandCard
                    title="Get All Employees"
                    command={MCP_COMMANDS.getAllEmployees}
                    description="Retrieve all employee records ordered by creation date"
                  />
                  <CommandCard
                    title="Get All Departments"
                    command={MCP_COMMANDS.getAllDepartments}
                    description="Retrieve all departments ordered by name"
                  />
                  <CommandCard
                    title="Get Active Employees Only"
                    command={MCP_COMMANDS.getActiveEmployees}
                    description="Retrieve only employees with active status"
                  />

                  <h3 className="font-medium text-sm text-muted-foreground mb-3 mt-6">Analytics</h3>
                  <CommandCard
                    title="Employee Statistics by Department"
                    command={MCP_COMMANDS.getEmployeeStats}
                    description="Count employees grouped by department"
                  />
                  <CommandCard
                    title="Salary Statistics"
                    command={MCP_COMMANDS.getSalaryStats}
                    description="Get average, minimum, and maximum salary"
                  />

                  <h3 className="font-medium text-sm text-muted-foreground mb-3 mt-6">Recent Data</h3>
                  <CommandCard
                    title="Recent Employees (Last 7 Days)"
                    command={MCP_COMMANDS.getRecentEmployees}
                    description="Get employees added in the last 7 days"
                  />
                  <CommandCard
                    title="Recent Notifications (Last 24 Hours)"
                    command={MCP_COMMANDS.getRecentNotifications}
                    description="Get notifications from the last 24 hours"
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Schema Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(SCHEMA_DOCS.tables).map(([tableName, tableInfo]) => (
                    <div key={tableName} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-medium">{tableName}</h3>
                        <Badge variant="outline">{tableInfo.primaryKey}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{tableInfo.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-1">Important Fields:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {tableInfo.importantFields.map((field, idx) => (
                              <li key={idx} className="font-mono text-xs">{field}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {'foreignKeys' in tableInfo && tableInfo.foreignKeys && (
                          <div>
                            <p className="font-medium mb-1">Foreign Keys:</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {tableInfo.foreignKeys.map((fk, idx) => (
                                <li key={idx} className="font-mono text-xs">{fk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="border rounded-lg p-4 mt-6">
                    <h3 className="font-medium mb-3">Table Relationships</h3>
                    <div className="space-y-2">
                      {Object.entries(SCHEMA_DOCS.relationships).map(([rel, desc]) => (
                        <div key={rel} className="flex items-center gap-2 text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{rel}</code>
                          <span className="text-muted-foreground">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics SQL Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {Object.entries(ANALYTICS_QUERIES).map(([queryName, query]) => (
                    <Card key={queryName} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{queryName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`select_data "${query.trim()}"`, queryName)}
                            className="h-8 px-2"
                          >
                            {copiedCommand === queryName ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto font-mono">
                          <code>{query.trim()}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">How to Use MCP Commands</p>
              <p className="text-blue-700">
                Copy any command above and use it in your MCP-enabled environment. 
                The commands are pre-configured for your HRD JAYATEMPO Supabase project.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}