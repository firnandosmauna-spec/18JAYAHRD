import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MCPSupabasePanel } from '@/components/MCPSupabasePanel';
import { MCPStatus } from '@/components/MCPStatus';

export default function MCPSupabasePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MCP Supabase Integration</h1>
          <p className="text-gray-600">
            Model Context Protocol integration for HRD JAYATEMPO Supabase database
          </p>
        </div>
        
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="status">Setup & Status</TabsTrigger>
            <TabsTrigger value="integration">MCP Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <MCPStatus />
          </TabsContent>

          <TabsContent value="integration">
            <MCPSupabasePanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}