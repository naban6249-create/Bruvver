"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesSummary } from "./sales-summary";
import { ExpensesSummary } from "./expenses-summary";

export function ReportsDashboard() {

  return (
    <Card className="mt-8">
        <CardHeader>
            <CardTitle className="font-headline">Reports</CardTitle>
            <CardDescription>A summary of sales and expenses over different time periods.</CardDescription>
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
