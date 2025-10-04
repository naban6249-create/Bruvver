"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, AlertCircle, Wallet, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuItem, DailySale } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getMenuItems } from "@/lib/menu-service";
import { getDailySales, createSale, deleteLastSale } from "@/lib/sales-service";
import { useAuth } from "@/lib/auth-context";

interface MenuItemWithSales extends MenuItem {
  quantitySold: number;
  cashCount: number;
  gpayCount: number;
}

// ---------------- PAYMENT METHOD DIALOG ----------------
function PaymentMethodDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: "cash" | "gpay") => void;
  itemName: string;
}) {
  const [selectedPayment, setSelectedPayment] =
    React.useState<"cash" | "gpay">("cash");

  const handleConfirm = () => {
    onConfirm(selectedPayment);
    setSelectedPayment("cash");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>
            How was this sale paid for? <br />
            <span className="font-medium">{itemName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant={selectedPayment === "cash" ? "default" : "outline"}
            className="h-24 flex flex-col gap-2"
            onClick={() => setSelectedPayment("cash")}
          >
            <Wallet className="h-8 w-8" />
            <span>Cash</span>
          </Button>
          <Button
            variant={selectedPayment === "gpay" ? "default" : "outline"}
            className="h-24 flex flex-col gap-2"
            onClick={() => setSelectedPayment("gpay")}
          >
            <Smartphone className="h-8 w-8" />
            <span>GPay / UPI</span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- DAILY SALES BREAKDOWN ----------------
export default function DailySalesBreakdown({
  onSaleChange,
}: {
  onSaleChange?: () => void;
}) {
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const { user, hasPermission } = useAuth();

  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [salesTransactions, setSalesTransactions] = React.useState<DailySale[]>(
    []
  );
  const [itemsWithSales, setItemsWithSales] = React.useState<
    MenuItemWithSales[]
  >([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<{
    action: "add";
    itemId: string;
    itemName: string;
  } | null>(null);
  const [currentDate, setCurrentDate] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalRevenue, setTotalRevenue] = React.useState(0);
  const { toast } = useToast();

  const currentBranchId = branchId ? parseInt(branchId) : null;
  const hasViewAccess = currentBranchId
    ? hasPermission(currentBranchId, "view_only")
    : false;
  const hasFullAccess = currentBranchId
    ? hasPermission(currentBranchId, "full_access")
    : false;

  React.useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(today.toLocaleDateString("en-US", options));
  }, []);

  const calculateItemSales = React.useCallback(
    (menuItems: MenuItem[], transactions: DailySale[]): MenuItemWithSales[] => {
      return menuItems.map((item) => {
        const itemTransactions = transactions.filter(
          (t) => String(t.itemId) === String(item.id)
        );
        const totalQuantity = itemTransactions.reduce(
          (sum, t) => sum + t.quantity,
          0
        );
        const cashCount = itemTransactions
          .filter((t) => t.paymentMethod === "cash")
          .reduce((sum, t) => sum + t.quantity, 0);
        const gpayCount = itemTransactions
          .filter((t) => t.paymentMethod === "gpay")
          .reduce((sum, t) => sum + t.quantity, 0);

        return {
          ...item,
          quantitySold: totalQuantity,
          cashCount,
          gpayCount,
        };
      });
    },
    []
  );

  const fetchSalesData = React.useCallback(async () => {
    if (!branchId || !hasViewAccess) {
      setItemsWithSales([]);
      setTotalRevenue(0);
      return;
    }

    setIsLoading(true);
    try {
      const [menuData, salesData] = await Promise.all([
        getMenuItems(branchId),
        getDailySales(branchId),
      ]);

      setMenuItems(menuData);
      setSalesTransactions(salesData);

      const aggregated = calculateItemSales(menuData, salesData);
      setItemsWithSales(aggregated);

      const revenue = salesData.reduce((sum, sale) => sum + sale.revenue, 0);
      setTotalRevenue(revenue);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      toast({
        title: "Error",
        description: "Could not load today's sales data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [branchId, hasViewAccess, toast, calculateItemSales]);

  React.useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const handleAddSale = (itemId: string, itemName: string) => {
    if (!hasFullAccess || !branchId) return;
    setPendingAction({ action: "add", itemId, itemName });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentMethodSelected = async (
    paymentMethod: "cash" | "gpay"
  ) => {
    if (!pendingAction || !branchId) return;
    setIsPaymentDialogOpen(false);

    try {
      await createSale(parseInt(branchId), pendingAction.itemId, 1, paymentMethod);
      toast({
        title: "Sale Recorded",
        description: `${pendingAction.itemName} - ${
          paymentMethod === "cash" ? "Cash" : "GPay"
        }`,
      });
      await fetchSalesData();
      onSaleChange?.();
    } catch (error) {
      console.error("Failed to create sale:", error);
      toast({
        title: "Error",
        description: (error as Error)?.message || "Could not record sale.",
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveSale = async (itemId: string, itemName: string) => {
    if (!hasFullAccess || !branchId) return;
    const itemSales = salesTransactions.filter(
      (t) => String(t.itemId) === String(itemId)
    );
    if (itemSales.length === 0) {
      toast({
        title: "No Sales",
        description: `No sales found for ${itemName} to remove.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteLastSale(parseInt(branchId), itemId);
      toast({
        title: "Sale Removed",
        description: `Last sale of ${itemName} has been removed.`,
      });
      await fetchSalesData();
      onSaleChange?.();
    } catch (error) {
      console.error("Failed to delete sale:", error);
      toast({
        title: "Error",
        description: (error as Error)?.message || "Could not remove sale.",
        variant: "destructive",
      });
    }
  };

  const getImageUrl = (item: MenuItem): string => {
    const url = item.imageUrl || (item as any).image_url || "";
    return url.trim() || "https://placehold.co/64x64/png?text=N/A";
  };

  const overallTotalItemsSold = itemsWithSales.reduce(
    (acc, item) => acc + item.quantitySold,
    0
  );

  // ------------------ UI RENDERING ------------------
  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (!branchId) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            No Branch Selected
          </CardTitle>
          <CardDescription>
            Please select a branch from the header to view daily sales.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasViewAccess) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to view sales data for this branch.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline">Daily Sales Breakdown</CardTitle>
              <CardDescription>
                Track sales transactions in real-time. Each click records a new sale.
                {!hasFullAccess && (
                  <Badge variant="secondary" className="ml-2">
                    View Only
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg text-foreground/90">
                {currentDate.split(",")[0]}
              </p>
              <p className="font-medium text-foreground/80">
                {currentDate.split(",").slice(1).join(",")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {itemsWithSales.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No menu items found for this branch.
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {itemsWithSales.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Image
                        alt={item.name}
                        className="aspect-square rounded-md object-cover"
                        height="48"
                        width="48"
                        src={getImageUrl(item)}
                        unoptimized
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/48x48/png?text=N/A";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span>₹{item.price.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Quantity:
                            </span>
                            {hasFullAccess ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleRemoveSale(String(item.id), item.name)
                                  }
                                  disabled={item.quantitySold === 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <div className="text-sm font-medium min-w-[3rem] text-center">
                                  <div>{item.quantitySold}</div>
                                  <div className="text-xs text-muted-foreground">
                                    💵{item.cashCount} 📱{item.gpayCount}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleAddSale(String(item.id), item.name)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-center">
                                <div>{item.quantitySold}</div>
                                <div className="text-xs text-muted-foreground">
                                  💵{item.cashCount} 📱{item.gpayCount}
                                </div>
                              </div>
                            )}
                          </div>

                          {user?.role === "admin" && (
                            <div className="flex justify-between text-sm font-medium">
                              <span>Revenue:</span>
                              <span className="text-green-600">
                                ₹{(item.price * item.quantitySold).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Image</TableHead>
                      <TableHead>Menu Item</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="w-[200px] text-right">
                        Quantity Sold
                      </TableHead>
                      {user?.role === "admin" && (
                        <TableHead className="text-right">Revenue</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithSales.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Image
                            alt={item.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            width="64"
                            src={getImageUrl(item)}
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/64x64/png?text=N/A";
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasFullAccess ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleRemoveSale(String(item.id), item.name)
                                  }
                                  disabled={item.quantitySold === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="text-center w-16 font-medium">
                                  <div>{item.quantitySold}</div>
                                  <div className="text-xs text-muted-foreground">
                                    💵{item.cashCount} 📱{item.gpayCount}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleAddSale(String(item.id), item.name)
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <div className="text-center font-medium">
                                <div>{item.quantitySold}</div>
                                <div className="text-xs text-muted-foreground">
                                  💵{item.cashCount} 📱{item.gpayCount}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell className="text-right font-medium">
                            ₹{(item.price * item.quantitySold).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between items-center border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Total Items Sold:{" "}
            <span className="font-semibold text-foreground">
              {overallTotalItemsSold}
            </span>
          </div>
          {user?.role === "admin" && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Total Revenue:{" "}
                <span className="font-semibold text-green-600">
                  ₹{totalRevenue.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </CardFooter>
      </Card>

      {pendingAction && (
        <PaymentMethodDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          onConfirm={handlePaymentMethodSelected}
          itemName={pendingAction.itemName}
        />
      )}
    </>
  );
}
