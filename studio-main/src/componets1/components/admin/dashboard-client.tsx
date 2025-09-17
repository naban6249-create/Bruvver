"use client";

import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuManagement } from "./menu/menu-management";
import { useToast } from "@/hooks/use-toast";
import { DailySalesBreakdown } from "./dashboard/daily-sales-breakdown";
import { resetDailySales } from "@/lib/sales-service";
import { DailyExpenses } from "./expenses/daily-expenses";
import { BranchManagement } from "./branches/branch-management";
import { ReportsDashboard } from "./reports/reports-dashboard";
import { WorkerDashboard } from './dashboard/worker-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Sheet } from 'lucide-react';

export function DashboardClient() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const role = searchParams.get('role');
    const branchId = searchParams.get('branchId');

    const handleEndOfDay = async () => {
        if (!branchId) {
            toast({ title: "Error", description: "Please select a branch first.", variant: "destructive"});
            return;
        }
        toast({
            title: "Processing End of Day",
            description: "Resetting daily sales data...",
        });

        try {
            await resetDailySales(branchId);
            toast({
                title: "End of Day Complete!",
                description: "Daily sales have been reset for the selected branch.",
            });
            window.location.reload();
        } catch (error) {
            console.error("End of day process failed:", error);
            toast({
                title: "Error",
                description: "Could not complete the end-of-day process.",
                variant: "destructive",
            });
        }
    };

    if (role === 'worker') {
        return <WorkerDashboard />;
    }

    // Admin View
    return (
        <Tabs defaultValue="dashboard">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                    <TabsTrigger value="expenses">Daily Expenses</TabsTrigger>
                    <TabsTrigger value="branches">Branches</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>
                <div className="ml-auto flex items-center gap-2">
                    <Button onClick={handleEndOfDay}>End of Day Process</Button>
                </div>
            </div>
            <TabsContent value="dashboard">
                <DailySalesBreakdown />
                 <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Data Export</CardTitle>
                            <CardDescription>Daily sales and ingredient usage are automatically exported at the end of each day.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <Sheet className="h-8 w-8 text-green-600"/>
                            <div>
                                <p className="font-semibold">Google Sheets</p>
                                <p className="text-sm text-muted-foreground">Cloud backup enabled</p>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Email Reports</CardTitle>
                            <CardDescription>A summary report is automatically sent to the admin email address at the end of each day.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <Mail className="h-8 w-8 text-blue-600"/>
                            <div>
                                <p className="font-semibold">Daily Summary Email</p>
                                <p className="text-sm text-muted-foreground">Reports enabled</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="menu">
                <MenuManagement />
            </TabsContent>
            <TabsContent value="expenses">
                <DailyExpenses />
            </TabsContent>
            <TabsContent value="branches">
                <BranchManagement />
            </TabsContent>
            <TabsContent value="reports">
                <ReportsDashboard />
            </TabsContent>
        </Tabs>
    );
}
