// src/components/admin/worker_dashboard.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { 
  Package, 
  IndianRupee, 
  TrendingUp, 
  Calendar,
  User,
  LogOut,
  Building
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
// --- MODIFICATION ---
// We REMOVE the old DailyExpenses and import the new one
import { SimpleExpenseTracker } from '../../../components/admin/simple-expense-tracker';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  branch_id: number;
  branch?: {
    id: number;
    name: string;
    location: string;
  } | null;
}

interface SalesData {
  totalItemsSold: number;
  totalRevenue: number;
  salesByItem: Array<{
    item_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

export function WorkerDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [todaySales, setTodaySales] = useState<SalesData>({
    totalItemsSold: 0,
    totalRevenue: 0,
    salesByItem: []
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (currentUser?.branch_id) {
      fetchSalesData();
    }
  }, [selectedDate, currentUser]);

  const initializeDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userStr);
      
      if (user.role !== 'worker') {
        router.push('/admin/dashboard');
        return;
      }

      // If branch data is missing, fetch it from the API
      if (!user.branch && user.branch_id) {
        await fetchUserWithBranch(token);
      } else {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserWithBranch = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user with branch:', error);
      router.push('/login');
    }
  };

  const fetchSalesData = async () => {
    if (!currentUser?.branch_id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/sales/summary?branch_id=${currentUser.branch_id}&date=${selectedDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTodaySales({
          totalItemsSold: data.total_items_sold || 0,
          totalRevenue: data.total_revenue || 0,
          salesByItem: data.sales_by_item || []
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }
  
  const getBranchName = () => {
    if (currentUser?.branch?.name) {
      return currentUser.branch.name;
    }
    return `Branch ${currentUser?.branch_id || 'Unknown'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <Badge variant="secondary" className="text-sm">
                <Building className="h-4 w-4 mr-2"/>
                {getBranchName()}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{currentUser.full_name || currentUser.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Date Selector */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Daily Operations</h2>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Sales Overview */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Sales Overview
                </CardTitle>
                <CardDescription>
                  Sales performance for {new Date(selectedDate).toLocaleDateString('en-IN')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Total Items Sold */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Items Sold</p>
                        <p className="text-2xl font-bold text-blue-900">{todaySales.totalItemsSold}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Total Revenue */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(todaySales.totalRevenue)}
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <IndianRupee className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Selling Items */}
                {todaySales.salesByItem.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Top Selling Items</h4>
                    <div className="space-y-2">
                      {todaySales.salesByItem.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{item.item_name}</p>
                            <p className="text-xs text-gray-600">{item.quantity_sold} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(item.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {todaySales.salesByItem.length === 0 && (
                  <div className="mt-6 text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No sales data available for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- MODIFICATION --- */}
          {/* Daily Expenses Section - NOW USES THE NEW COMPONENT */}
          {currentUser.branch_id && (
            <div className="mb-8">
              <SimpleExpenseTracker 
                branchId={currentUser.branch_id} 
              />
            </div>
          )}

          {/* REMOVED Quick Stats and Help Section */}

        </div>
      </main>
    </div>
  );
}