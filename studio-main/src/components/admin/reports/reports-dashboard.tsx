"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { exportToSheets } from "@/lib/reports-service";
import { SalesSummary } from "./sales-summary";
import { ExpensesSummary } from "./expenses-summary";

export function ReportsDashboard() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') || undefined;
  const [exportDate, setExportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const onManualExport = async () => {
    try {
      const res = await exportToSheets(exportDate, branchId);
      toast({ title: 'Exported', description: `Exported ${exportDate}${branchId ? ` for branch ${branchId}` : ' for ALL branches'}.` });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <Card className="mt-8">
        <CardHeader>
            <CardTitle className="font-headline">Reports</CardTitle>
            <CardDescription>A summary of sales and expenses over different time periods.</CardDescription>
            {/* Manual export controls */}
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Export Date</div>
                <Input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)} className="w-48" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Branch</div>
                <Input value={branchId || ''} readOnly placeholder="All branches" className="w-48" />
              </div>
              <Button onClick={onManualExport} className="md:ml-2 w-fit">Export to Google Sheets</Button>
            </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sales">Sales Summary</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses Summary</TabsTrigger>
                </TabsList>
                <TabsContent value="sales">
                    <SalesSummary />
                </TabsContent>
                <TabsContent value="expenses">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                        <ExpensesSummary />
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
