"use client";

import * as React from "react";
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DailyBalanceDashboard } from "./dashboard/daily-balance-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Wrench } from 'lucide-react'; // Added for the Tools icon
import { useAuth } from "./contexts/auth-provider";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DailySalesBreakdown } from "./dashboard/daily-sales-breakdown";
import { BranchManagement } from "./branches/branch-management";
import { ReportsDashboard } from "./reports/reports-dashboard";
import { useToast } from "../../hooks/use-toast";
import { MenuManagement } from "./menu/menu-management";
import { WorkerDashboard } from './dashboard/worker-dashboard';
import { PermissionManagement } from './permissions/permission-management';
import { BalanceDashboardClient } from "./dashboard/balance-dashboard-client";
import { ExpensesDashboardClient } from "./expenses/expenses-dashboard-client";
import { ApiClient } from "@/lib/api-client"; // Added to call the cleanup endpoint

export function DashboardClient() {
    const { toast } = useToast();
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = user?.role;
    const branchId = searchParams.get('branchId');
    
    // Get tab from URL or default to 'dashboard'
    const activeTab = searchParams.get('tab') || 'dashboard';

    // Function to update URL when tab changes
    const handleTabChange = (newTab: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', newTab);
        router.push(`?${params.toString()}`);
    };

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/admin/login');
        }
    }, [isLoading, user, router]);

    // === START: IMAGE CLEANUP FUNCTION ===
    const cleanupImages = async () => {
        try {
          const response = await ApiClient.post('/admin/cleanup-images');
          toast({
            title: 'Image Cleanup Successful',
            description: `Cleared ${response.total_cleared} total URLs (${response.local_images_cleared} local, ${response.unsplash_images_cleared} Unsplash).`,
          });
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to clean up images. This is an admin-only action.',
            variant: 'destructive',
          });
        }
    };
    // === END: IMAGE CLEANUP FUNCTION ===

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (!user) {
        return null; 
    };
    
    if (role === 'worker') {
        return (
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <Suspense fallback={<div>Loading worker dashboard...</div>}>
                    <WorkerDashboard />
                </Suspense>
            </div>
        );
    }
    
    // Main Admin/Manager Dashboard
    if (!branchId) {
        return (
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                 <BranchManagement />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5 md:grid-cols-8 h-auto p-1 gap-1">
                        <TabsTrigger value="dashboard">Sales</TabsTrigger>
                        <TabsTrigger value="balance">Balance</TabsTrigger>
                        <TabsTrigger value="menu">Menu</TabsTrigger>
                        <TabsTrigger value="expenses">Expenses</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        {role === 'admin' && <TabsTrigger value="branches">Branches</TabsTrigger>}
                        {role === 'admin' && <TabsTrigger value="permissions">Users</TabsTrigger>}
                        {role === 'admin' && <TabsTrigger value="tools">Tools</TabsTrigger>}
                    </TabsList>
                </div>
                
                <TabsContent value="dashboard">
                    <Suspense fallback={<div>Loading sales data...</div>}>
                        <DailySalesBreakdown />
                    </Suspense>
                </TabsContent>
                
                <TabsContent value="balance">
                    <Suspense fallback={<div>Loading balance data...</div>}>
                        <BalanceDashboardClient />
                    </Suspense>
                </TabsContent>
                
                <TabsContent value="menu">
                    <MenuManagement />
                </TabsContent>
                
                <TabsContent value="expenses">
                    <Suspense fallback={<div>Loading expenses data...</div>}>
                        <ExpensesDashboardClient />
                    </Suspense>
                </TabsContent>

                <TabsContent value="reports">
                    <ReportsDashboard />
                </TabsContent>
                
                {role === 'admin' && (
                    <TabsContent value="branches">
                        <BranchManagement />
                    </TabsContent>
                )}

                {role === 'admin' && (
                    <TabsContent value="permissions">
                        <PermissionManagement />
                    </TabsContent>
                )}

                {/* === START: NEW TOOLS TAB CONTENT === */}
                {role === 'admin' && (
                    <TabsContent value="tools">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Tools</CardTitle>
                                <CardDescription>
                                Perform administrative actions to maintain the application's data integrity.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                <Button onClick={cleanupImages} variant="outline">
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Clean Up All Broken Image URLs
                                </Button>
                                <p className="text-sm text-muted-foreground">
                                    Removes old local URLs and broken Unsplash links from all menu items.
                                </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                {/* === END: NEW TOOLS TAB CONTENT === */}
            </Tabs>
        </div>
    );
}
