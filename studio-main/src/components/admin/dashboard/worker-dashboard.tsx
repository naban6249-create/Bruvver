"use client";

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailySalesBreakdown } from "./daily-sales-breakdown";
import { WorkerExpenses } from "../expenses/worker-expenses";
import { DailyBalanceDashboard } from "./daily-balance-dashboard";
import { useAuth } from "@/components/admin/contexts/auth-provider";
import { AlertCircle, Eye, Edit } from "lucide-react";
import React from 'react';

export function WorkerDashboard() {
    const { user, hasPermission, getUserBranches } = useAuth();
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const [balanceKey, setBalanceKey] = React.useState(0);

    const currentBranchId = branchId ? parseInt(branchId) : null;
    const userBranches = getUserBranches();
    const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
    const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

    const currentBranch = userBranches.find((b: any) => b.id === currentBranchId);

    // Callback to refresh balance when sales change
    const handleSaleChange = React.useCallback(() => {
        setBalanceKey(prev => prev + 1);
    }, []);

    if (!user) {
        return (
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <Card>
                    <CardContent className="p-4 sm:p-6">
                        <p>Loading user information...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!currentBranchId) {
        return (
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            No Branch Selected
                        </CardTitle>
                        <CardDescription>
                            Please select a branch from the header to view your dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p>You have access to the following branches:</p>
                            <div className="flex flex-wrap gap-2">
                                {userBranches.map(branch => (
                                    <Badge
                                        key={branch.id}
                                        variant={branch.permission === 'full_access' ? 'default' : 'secondary'}
                                    >
                                        {branch.name} - {branch.permission === 'full_access' ? 'Full Access' : 'View Only'}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!hasViewAccess) {
        return (
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You don't have permission to access this branch.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold font-headline truncate">
                            Worker Dashboard - {currentBranch?.name}
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base truncate">
                            {currentBranch?.location && `Location: ${currentBranch.location}`}
                        </p>
                    </div>
                    <Badge
                        variant={hasFullAccess ? 'default' : 'secondary'}
                        className="flex items-center gap-1 w-fit"
                    >
                        {hasFullAccess ? (
                            <>
                                <Edit className="h-3 w-3" />
                                Full Access
                            </>
                        ) : (
                            <>
                                <Eye className="h-3 w-3" />
                                View Only
                            </>
                        )}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="dashboard">
                <div className="flex items-center mb-4 sm:mb-6">
                    <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
                        <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3">Sales</TabsTrigger>
                        <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 sm:px-3">Expenses</TabsTrigger>
                        <TabsTrigger value="balance" className="text-xs sm:text-sm px-2 sm:px-3">Balance</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="dashboard">
                    <div className="space-y-6">
                        {!hasFullAccess && (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800">
                                            You have view-only access to this branch. You can see data but cannot make changes.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <DailySalesBreakdown onSaleChange={handleSaleChange} />
                    </div>
                </TabsContent>

                <TabsContent value="expenses">
                    <div className="space-y-6">
                        {!hasFullAccess && (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800">
                                            You can view expenses but cannot add, edit, or delete them.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <WorkerExpenses />
                    </div>
                </TabsContent>

                <TabsContent value="balance">
                    <div className="space-y-6">
                        {!hasFullAccess && (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800">
                                            You can view balance data but cannot edit opening balance.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <DailyBalanceDashboard key={balanceKey} isWorkerView={true} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
