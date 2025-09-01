"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesSummary } from "./sales-summary";
import { MenuManagement } from "./menu-management";
import { Sheet, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DailySalesBreakdown } from "./daily-sales-breakdown";

export function DashboardClient() {
    const { toast } = useToast();

    const handleEndOfDay = () => {
        // Simulate end-of-day process
        toast({
            title: "Processing End of Day",
            description: "Exporting data to Google Sheets and sending email report...",
        });
        setTimeout(() => {
            toast({
                title: "End of Day Complete!",
                description: "Daily sales have been reset and reports sent.",
            });
        }, 2000);
    };


    return (
        <Tabs defaultValue="dashboard">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="menu">Menu Management</TabsTrigger>
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
            <TabsContent value="reports">
                <SalesSummary />
            </TabsContent>
        </Tabs>
    )
}
