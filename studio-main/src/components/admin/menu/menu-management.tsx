"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MenuItem } from "@/lib/types";
import { MenuItemDialog } from "./menu-item-dialog";
import { DeleteConfirmationDialog } from "@/components/admin/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/menu-service";

export function MenuManagement() {
  const { user } = useAuth();
  const role = user?.role;
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = React.useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
  const { toast } = useToast();

  const fetchMenuItems = React.useCallback(async () => {
    if (!branchId) {
      setItems([]);
      return;
    }
    try {
      const menuItems = await getMenuItems(branchId);
      setItems(menuItems);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load menu items.",
        variant: "destructive"
      });
    }
  }, [branchId, toast]);

  React.useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleAddNewItem = () => {
    if (!branchId) {
      toast({ title: "Error", description: "Please select a branch first.", variant: "destructive"});
      return;
    }
    setSelectedItem(null);
    setIsNewItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsEditItemDialogOpen(true);
  };
  
  const handleDeleteItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if(!selectedItem || !branchId) return;
    try {
      await deleteMenuItem(selectedItem.id, branchId);
      await fetchMenuItems();
      toast({ title: "Success", description: "Menu item deleted." });
    } catch (error) {
       toast({ title: "Error", description: "Could not delete menu item.", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSaveItem = async (formData: FormData) => {
  if (!branchId) {
    toast({ 
      title: "Error", 
      description: "Please select a branch first.", 
      variant: "destructive"
    });
    return;
  }
  
  try {
    const itemId = formData.get('id') as string;
    
    if (!itemId) {
      // Create new item - pass branchId as parameter
      await addMenuItem(formData, branchId);
      toast({ title: "Success", description: "Menu item created." });
    } else {
      // Update existing item - pass branchId as parameter
      await updateMenuItem(formData, itemId, branchId);
      toast({ title: "Success", description: "Menu item updated." });
    }
    
    await fetchMenuItems();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    toast({ 
      title: "Error", 
      description: `Could not save menu item: ${errorMessage}`, 
      variant: "destructive" 
    });
  } finally {
    setIsNewItemDialogOpen(false);
    setIsEditItemDialogOpen(false);
    setSelectedItem(null);
  }
};

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Menu Items</CardTitle>
                <CardDescription>
                    {role === 'admin' ? 'Add, update, or delete menu items for the selected branch.' : 'View the menu items for the selected branch.'}
                </CardDescription>
            </div>
            {role === 'admin' && (
              <Button size="sm" className="gap-1" onClick={handleAddNewItem}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Add Item
                  </span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Ingredients</TableHead>
                {role === 'admin' && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="hidden sm:table-cell">
                    {(() => {
                      const imgSrc = item.imageUrl && item.imageUrl.trim().length > 0
                        ? item.imageUrl
                        : 'https://picsum.photos/64/64';
                      const isRemote = !imgSrc.startsWith('/');
                      return (
                        <Image
                          alt={item.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={imgSrc}
                          width="64"
                          unoptimized={isRemote}
                          data-ai-hint="coffee drink"
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                        {item.ingredients.map(ing => (
                            <Badge variant="outline" key={ing.name}>{ing.name}</Badge>
                        ))}
                    </div>
                  </TableCell>
                  {role === 'admin' && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                              <Pencil className="mr-2 h-4 w-4"/> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteItem(item)}>
                              <Trash2 className="mr-2 h-4 w-4"/> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {role === 'admin' && (
        <>
          <MenuItemDialog 
            isOpen={isNewItemDialogOpen || isEditItemDialogOpen}
            setIsOpen={isNewItemDialogOpen ? setIsNewItemDialogOpen : setIsEditItemDialogOpen}
            onSave={handleSaveItem}
            item={selectedItem}
          />
          <DeleteConfirmationDialog 
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={confirmDeleteItem}
            title={`Delete ${selectedItem?.name ?? 'item'}?`}
            description="This action cannot be undone."
          />
        </>
      )}
    </>
  );
}
