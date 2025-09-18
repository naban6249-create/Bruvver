"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from "react";
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
import { PermissionManagement } from './permissions/permission-management';
import { AdminHeader } from './admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Sheet } from 'lucide-react';
import { useAuth } from "@/lib/auth-context";

export function DashboardClient() {
    const { toast } = useToast();
    const { user, hasPermission } = useAuth();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || user?.role;
    const branchId = searchParams.get('branchId');

    const handleEndOfDay = async () => {
        if (!branchId) {
            toast({ 
                title: "Error", 
                description: "Please select a branch first.", 
                variant: "destructive"
            });
            return;
        }

        // Check if user has full access to this branch
        if (!hasPermission(parseInt(branchId), 'full_access')) {
            toast({
                title: "Access Denied",
                description: "You need full access to perform end-of-day operations.",
                variant: "destructive"
            });
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

    // Show worker dashboard for workers
    if (role === 'worker') {
        return (
            <>
                
                <div className="container mx-auto p-6">
                    <WorkerDashboard />
                </div>
            </>
        );
    }

    // Admin dashboard
    return (
        <>
            
            <div className="container mx-auto p-6">
                <Tabs defaultValue="dashboard">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList>
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                            <TabsTrigger value="menu">Menu</TabsTrigger>
                            <TabsTrigger value="expenses">Daily Expenses</TabsTrigger>
                            <TabsTrigger value="branches">Branches</TabsTrigger>
                            <TabsTrigger value="permissions">User Permissions</TabsTrigger>
                            <TabsTrigger value="reports">Reports</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                            {branchId && hasPermission(parseInt(branchId), 'full_access') && (
                                <Button onClick={handleEndOfDay}>End of Day Process</Button>
                            )}
                        </div>
                    </div>
                    
                    <TabsContent value="dashboard">
                        <DailySalesBreakdown />
                        <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Data Export</CardTitle>
                                    <CardDescription>
                                        Daily sales and ingredient usage are automatically exported at the end of each day.
                                    </CardDescription>
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
                                    <CardDescription>
                                        A summary report is automatically sent to the admin email address at the end of each day.
                                    </CardDescription>
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
                    
                    <TabsContent value="permissions">
                        <PermissionManagement />
                    </TabsContent>
                    
                    <TabsContent value="reports">
                        <ReportsDashboard />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}