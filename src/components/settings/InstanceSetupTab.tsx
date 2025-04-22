
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetupGuide } from './SetupGuide';

export function InstanceSetupTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Self-hosting Configuration</CardTitle>
          <CardDescription>
            Complete guide to set up your own instance of this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup-guide" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup-guide">Setup Guide</TabsTrigger>
              <TabsTrigger value="about">About Self-Hosting</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup-guide" className="space-y-4">
              <SetupGuide />
            </TabsContent>
            
            <TabsContent value="about" className="space-y-4">
              <Alert>
                <AlertTitle>Self-hosting information</AlertTitle>
                <AlertDescription>
                  This application can be self-hosted on your own infrastructure. The guide in the "Setup Guide" tab provides all the necessary steps and code to set up your own instance.
                </AlertDescription>
              </Alert>
              
              <div className="prose max-w-none">
                <h3>Requirements</h3>
                <ul>
                  <li>A Supabase account or self-hosted Supabase instance</li>
                  <li>Node.js and npm/yarn for running the frontend</li>
                  <li>A Fortnox account for invoicing integration</li>
                </ul>
                
                <h3>Architecture</h3>
                <p>
                  The application consists of a React frontend and a Supabase backend. The backend includes:
                </p>
                <ul>
                  <li>PostgreSQL database with RLS policies</li>
                  <li>Authentication system</li>
                  <li>Edge functions for API integrations</li>
                  <li>Storage buckets for files</li>
                </ul>
                
                <h3>Getting Support</h3>
                <p>
                  If you need assistance with the self-hosting setup, please contact the development team.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
