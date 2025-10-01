"use client";

import * as React from "react";
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DailyBalanceDashboard } from "./dashboard/daily-balance-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Mail, Sheet } from 'lucide-react';
import { useAuth } from "../../lib/auth-context"; // Correctly import the hook
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DailySalesBreakdown } from "./dashboard/daily-sales-breakdown";
import { DailyExpenses } from "./expenses/daily-expenses";
import { BranchManagement } from "./branches/branch-management";
import { ReportsDashboard } from "./reports/reports-dashboard";
import { useToast } from "../../hooks/use-toast";
import { MenuManagement } from "./menu/menu-management";
import { WorkerDashboard } from './dashboard/worker-dashboard';
import { PermissionManagement } from './permissions/permission-management';
import { BalanceDashboardClient } from "./dashboard/balance-dashboard-client";
import { ExpensesDashboardClient } from "./expenses/expenses-dashboard-client";

export function DashboardClient() {
    const { toast } = useToast();
    const { user, hasPermission, isLoading } = useAuth(); // Use isLoading from context
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || user?.role;
    const branchId = searchParams.get('branchId');
    
    // Add state for controlled tabs
    const [activeTab, setActiveTab] = React.useState("dashboard");

    useEffect(() => {
        // Redirect to login if the auth check is done and there's no user
        if (!isLoading && !user) {
            router.push('/admin/login');
        }
    }, [isLoading, user, router]);

    // Show a loading spinner while the app confirms if the user is logged in
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    // Don't render anything if there's no user (the useEffect will redirect)
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
    
    return (
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto p-1 gap-1 sm:gap-0">
                        <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3">Sales</TabsTrigger>
                        <TabsTrigger value="balance" className="text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex">Balance</TabsTrigger>
                        <TabsTrigger value="menu" className="text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex">Menu</TabsTrigger>
                        <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 sm:px-3">Expenses</TabsTrigger>
                        <TabsTrigger value="branches" className="text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex">Branches</TabsTrigger>
                        <TabsTrigger value="permissions" className="text-xs sm:text-sm px-2 sm:px-3 hidden lg:inline-flex">Users</TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-3 hidden lg:inline-flex">Reports</TabsTrigger>
                    </TabsList>
                    
                    {/* Mobile Menu Button */}
                    <div className="sm:hidden ml-2">
                        <select 
                            className="text-sm border rounded-md px-2 py-1 bg-background"
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                        >
                            <option value="dashboard">Sales</option>
                            <option value="balance">Balance</option>
                            <option value="menu">Menu</option>
                            <option value="expenses">Expenses</option>
                            <option value="branches">Branches</option>
                            <option value="permissions">Users</option>
                            <option value="reports">Reports</option>
                        </select>
                    </div>
                </div>
                
                <TabsContent value="dashboard">
                    <Suspense fallback={<div>Loading sales data...</div>}>
                        <DailySalesBreakdown />
                    </Suspense>
                    <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2">
                        {/* Data Export & Email Reports Cards can be added here */}
                    </div>
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
    );
}
