"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailySalesBreakdown } from "./daily-sales-breakdown";
import { WorkerExpenses } from "../expenses/worker-expenses";
import { MenuManagement } from "../menu/menu-management";

export function WorkerDashboard() {
    return (
        <Tabs defaultValue="dashboard">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="dashboard">Daily Sales</TabsTrigger>
                    <TabsTrigger value="expenses">Daily Supplies</TabsTrigger>
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="dashboard">
                <DailySalesBreakdown />
            </TabsContent>
            <TabsContent value="expenses">
                <WorkerExpenses />
            </TabsContent>
            <TabsContent value="menu">
                <MenuManagement />
            </TabsContent>
        </Tabs>
    )
}
