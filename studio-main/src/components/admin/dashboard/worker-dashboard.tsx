"use client";

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailySalesBreakdown } from "./daily-sales-breakdown";
import { WorkerExpenses } from "../expenses/worker-expenses";
import { MenuManagement } from "../menu/menu-management";
import { DailyBalanceDashboard } from "./daily-balance-dashboard";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, Eye, Edit } from "lucide-react";

export function WorkerDashboard() {
    const { user, hasPermission, getUserBranches } = useAuth();
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    
    const currentBranchId = branchId ? parseInt(branchId) : null;
    const userBranches = getUserBranches();
    const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
    const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

    // Find current branch details
    const currentBranch = userBranches.find((b: any) => b.id === currentBranchId);

    if (!user) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <p>Loading user information...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!currentBranchId) {
        return (
            <div className="container mx-auto p-6">
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
            <div className="container mx-auto p-6">
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
        <div className="container mx-auto p-6">
            {/* Access Level Indicator */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-headline">
                            Worker Dashboard - {currentBranch?.name}
                        </h1>
                        <p className="text-muted-foreground">
                            {currentBranch?.location && `Location: ${currentBranch.location}`}
                        </p>
                    </div>
                    <Badge 
                        variant={hasFullAccess ? 'default' : 'secondary'}
                        className="flex items-center gap-1"
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
                <div className="flex items-center mb-6">
                    <TabsList>
                        <TabsTrigger value="dashboard">Daily Sales</TabsTrigger>
                        <TabsTrigger value="balance">Daily Balance</TabsTrigger>
                        <TabsTrigger value="expenses">Daily Supplies</TabsTrigger>
                        <TabsTrigger value="menu">Menu</TabsTrigger>
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
                        <DailySalesBreakdown />
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
                        <DailyBalanceDashboard />
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
                
                <TabsContent value="menu">
                    <div className="space-y-6">
                        {!hasFullAccess && (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800">
                                            You can view the menu but cannot make changes to items or ingredients.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <MenuManagement />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}