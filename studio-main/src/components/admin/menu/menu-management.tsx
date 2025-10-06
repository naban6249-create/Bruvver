"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getMenuItems, updateMenuItem, deleteMenuItem } from '@/lib/menu-service';
import { useAuth } from '@/lib/auth-context';
import { MenuItemDialog } from './menu-item-dialog';
import type { MenuItem } from '@/lib/types';
import Image from 'next/image';

export function MenuManagement() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);

  const currentBranchId = branchId ? parseInt(branchId) : null;
  const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
  const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

  const fetchMenu = React.useCallback(async () => {
    if (!branchId || !hasViewAccess) {
      setMenuItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const items = await getMenuItems(branchId);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      toast({
        title: 'Error',
        description: 'Could not load menu data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [branchId, hasViewAccess, toast]);

  React.useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Fixed handleDelete function with correct argument order
  const handleDelete = async (itemToDelete: MenuItem) => {
    if (!branchId || !hasFullAccess) return;

    // Soft delete by setting is_available to false
    const formData = new FormData();
    formData.append('name', itemToDelete.name);
    formData.append('price', String(itemToDelete.price));
    formData.append('category', itemToDelete.category);
    formData.append('description', itemToDelete.description || '');
    formData.append('is_available', 'false');
    formData.append('ingredients', JSON.stringify(itemToDelete.ingredients || []));
    if (itemToDelete.image_url) {
      formData.append('image_url', itemToDelete.image_url);
    }

    try {
      // Correct signature: updateMenuItem(formData, itemId, branchId)
      await updateMenuItem(formData, String(itemToDelete.id), branchId);
      toast({
        title: 'Item Deactivated',
        description: `${itemToDelete.name} has been hidden from the menu.`,
      });
      fetchMenu();
    } catch (error) {
       console.error('Failed to deactivate menu item:', error);
       toast({
         title: 'Error',
         description: `Could not deactivate item. It may have sales data associated with it.`,
         variant: 'destructive',
       });
    }
  };

  const handleEdit = (item: MenuItem) => {
    if (!hasFullAccess) return;
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    if (!hasFullAccess) return;
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setIsDialogOpen(false);
    await fetchMenu();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-headline">Menu Management</CardTitle>
              <CardDescription>Add, edit, or remove items from the menu.</CardDescription>
            </div>
            {hasFullAccess && (
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="flex flex-row items-start gap-4">
                    {item.image_url && <Image src={item.image_url} alt={item.name} width={64} height={64} className="rounded-md" />}
                    <div className="flex-1">
                      <CardTitle>{item.name}</CardTitle>
                      {!item.is_available && <Badge variant="destructive">Unavailable</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="font-bold mt-2">₹{item.price.toFixed(2)}</div>
                  </CardContent>
                  {hasFullAccess && (
                    <div className="flex justify-end gap-2 p-6 pt-0">
                       <Button variant="outline" size="sm" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                      <Button size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-10 text-muted-foreground">No menu items found for this branch.</div>
          )}
        </CardContent>
      </Card>
      
      {isDialogOpen && (
        <MenuItemDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSave={handleSave}
          item={selectedItem}
        />
      )}
    </>
  );
}
