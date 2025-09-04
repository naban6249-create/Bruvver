// Updated menu-management.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuItem } from "@/lib/types";
import { MenuItemDialog } from "./menu-item-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";

// API service functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function getMenuItems(): Promise<MenuItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/menu?available_only=false`);
  if (!response.ok) throw new Error('Failed to fetch menu items');
  return response.json();
}

async function addMenuItem(item: MenuItem & { imageFile?: File }): Promise<MenuItem> {
  const formData = new FormData();
  formData.append('name', item.name);
  formData.append('price', item.price.toString());
  formData.append('description', item.description || '');
  formData.append('category', item.category || '');
  formData.append('is_available', item.is_available.toString());
  formData.append('ingredients', JSON.stringify(item.ingredients || []));
  
  if (item.imageFile) {
    formData.append('image', item.imageFile);
  }

  const response = await fetch(`${API_BASE_URL}/api/menu`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to add menu item');
  return response.json();
}

async function updateMenuItem(item: MenuItem & { imageFile?: File }): Promise<MenuItem> {
  const formData = new FormData();
  formData.append('name', item.name);
  formData.append('price', item.price.toString());
  formData.append('description', item.description || '');
  formData.append('category', item.category || '');
  formData.append('is_available', item.is_available.toString());
  formData.append('ingredients', JSON.stringify(item.ingredients || []));
  
  if (item.imageFile) {
    formData.append('image', item.imageFile);
  }

  const response = await fetch(`${API_BASE_URL}/api/menu/${item.id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to update menu item');
  return response.json();
}

async function deleteMenuItem(itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/menu/${itemId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  
  if (!response.ok) throw new Error('Failed to delete menu item');
}

export function MenuManagement() {
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = React.useState<MenuItem[]>([]);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = React.useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string>('all');
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchMenuItems = React.useCallback(async () => {
    try {
      setLoading(true);
      const menuItems = await getMenuItems();
      
      // Transform backend data to frontend format
      const transformedItems = menuItems.map((item) => ({
        ...item,
        imageUrl: item.image_path ? `${API_BASE_URL}${item.image_path}` : undefined,
      }));
      
      setItems(transformedItems);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load menu items.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filter items based on search and filters
  React.useEffect(() => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(item => 
        availabilityFilter === 'available' ? item.is_available : !item.is_available
      );
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter, availabilityFilter]);

  React.useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleAddNewItem = () => {
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

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      const updatedItem = { ...item, is_available: !item.is_available };
      await updateMenuItem(updatedItem);
      await fetchMenuItems();
      toast({ 
        title: "Success", 
        description: `Item ${updatedItem.is_available ? 'enabled' : 'disabled'}.` 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update item availability.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      await deleteMenuItem(selectedItem.id);
      await fetchMenuItems();
      toast({ title: "Success", description: "Menu item deleted." });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete menu item.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSaveItem = async (item: MenuItem & { imageFile?: File }) => {
    const isNew = !item.id;

    try {
      if (isNew) {
        await addMenuItem(item);
      } else {
        await updateMenuItem(item);
      }
      await fetchMenuItems();
      toast({
        title: "Success",
        description: `Menu item ${isNew ? "added" : "updated"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Could not save menu item.`,
        variant: "destructive",
      });
    } finally {
      setIsNewItemDialogOpen(false);
      setIsEditItemDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
    return uniqueCategories;
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading menu items...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline">Menu Items</CardTitle>
              <CardDescription>
                Manage your coffee shop menu items. Add, edit, or remove items.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleAddNewItem}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Item
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="max-w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="max-w-48">
                <SelectValue placeholder="Filter by availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="unavailable">Unavailable Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {items.length === 0 ? 'No menu items found. Add your first item!' : 'No items match your filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                  <TableHead>Name & Details</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="hidden lg:table-cell">Ingredients</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        alt={item.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        width="64"
                        src={item.imageUrl || "https://placehold.co/64x64/EEE/31343C?text=No+Image"}
                        unoptimized
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {item.category?.charAt(0).toUpperCase() + item.category?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-48">
                        {item.ingredients?.slice(0, 3).map((ing, index) => (
                          <Badge variant="secondary" key={index} className="text-xs">
                            {ing.name}
                          </Badge>
                        ))}
                        {item.ingredients && item.ingredients.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.ingredients.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleItemAvailability(item)}>
                            {item.is_available ? (
                              <><EyeOff className="mr-2 h-4 w-4" /> Disable</>
                            ) : (
                              <><Eye className="mr-2 h-4 w-4" /> Enable</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MenuItemDialog
        isOpen={isNewItemDialogOpen || isEditItemDialogOpen}
        setIsOpen={isNewItemDialogOpen ? setIsNewItemDialogOpen : setIsEditItemDialogOpen}
        onSave={handleSaveItem}
        item={selectedItem}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteItem}
        itemName={selectedItem?.name}
      />
    </>
  );
}
