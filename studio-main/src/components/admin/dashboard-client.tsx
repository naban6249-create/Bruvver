"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesSummary } from "./sales-summary";
import { MenuManagement } from "./menu-management";
import { Sheet, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DailySalesBreakdown } from "./daily-sales-breakdown";
// [THE FIX] Import the new, powerful DailyExpenses component
import { DailyExpenses } from "./daily-expenses"; 
import { resetDailySales } from "@/lib/sales-service";

export function DashboardClient() {
    const { toast } = useToast();

    // [THE FIX] Placeholder data for the new component.
    // You will need to replace these with the actual logged-in user's role and selected branch.
    const userRole = "admin"; // Example: "admin" or "staff"
    const selectedBranchId = 1; // Example: 1 for the main branch

    const handleEndOfDay = async () => {
        toast({
            title: "Processing End of Day",
            description: "Resetting daily sales data...",
        });

        try {
            await resetDailySales();
            toast({
                title: "End of Day Complete!",
                description: "Daily sales have been reset.",
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

    return (
        <Tabs defaultValue="dashboard">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="menu">Menu Management</TabsTrigger>
                    {/* [THE FIX] Updated tab trigger to match the new component */}
                    <TabsTrigger value="expenses">Daily Expenses</TabsTrigger>
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
            {/* [THE FIX] Updated tab content to use the new component and pass the required props */}
            <TabsContent value="expenses">
                <DailyExpenses selectedBranchId={selectedBranchId} userRole={userRole} />
            </TabsContent>
            <TabsContent value="reports">
                <SalesSummary />
            </TabsContent>
        </Tabs>
    );
}