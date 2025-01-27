'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SLAPolicyManager } from './SLAPolicyManager'

export function SettingsClient() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage system-wide configurations</p>
      </div>

      <Tabs defaultValue="sla" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sla">SLA Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>SLA Policies</CardTitle>
              <CardDescription>
                Configure Service Level Agreement policies for different ticket priorities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SLAPolicyManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 