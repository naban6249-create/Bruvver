"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MenuCard } from "@/components/menu-card";
import { MenuItemDialog } from "@/components/admin/menu-item-dialog";
import { DeleteConfirmationDialog } from "@/components/admin/delete-confirmation-dialog";
import type { MenuItem } from "@/lib/types";
import { getMenuItems, updateMenuItem, deleteMenuItem } from "@/lib/menu-service";
import { useToast } from "@/hooks/use-toast";
import { UnifiedAuth } from "@/lib/unified-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

export function MainPageMenu({ initialItems }: { initialItems: MenuItem[] }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the user is logged in when the component mounts on the client
    setIsLoggedIn(UnifiedAuth.isAuthenticated());
  }, []);

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };
  
  const handleSaveMenuItem = (savedItem: MenuItem) => {
    // This function updates the specific item in our list after saving.
    setMenuItems(prevItems => {
      const itemIndex = prevItems.findIndex(item => item.id === savedItem.id);
      if (itemIndex > -1) {
        // Construct the full image URL for display
        const finalItem = {
          ...savedItem,
          imageUrl: savedItem.imageUrl && !savedItem.imageUrl.startsWith('http')
            ? `${API_BASE}${savedItem.imageUrl}`
            : savedItem.imageUrl,
        };
        const updatedItems = [...prevItems];
        updatedItems[itemIndex] = finalItem;
        return updatedItems;
      }
      return prevItems;
    });
    toast({
        title: "Success",
        description: "Menu item updated successfully."
    });
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-6">
        {menuItems.map((item) => (
          <MenuCard 
            key={item.id} 
            item={item} 
            allowEditing={isLoggedIn} // Only allow editing if logged in
            onEdit={() => handleEdit(item)}
          />
        ))}
      </div>

      <MenuItemDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        item={selectedItem}
        onSave={handleSaveMenuItem}
      />
    </>
  );
}