"use client";

import * as React from "react";
import Image from "next/image";
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
import { MENU_ITEMS } from "@/lib/data";
import type { MenuItem } from "@/lib/types";
import { MenuItemDialog } from "./menu-item-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

export function MenuManagement() {
  const [items, setItems] = React.useState<MenuItem[]>(MENU_ITEMS);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = React.useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);

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

  const confirmDeleteItem = () => {
    if(selectedItem){
        setItems(items.filter(item => item.id !== selectedItem.id));
    }
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
  }

  const handleSaveItem = (item: MenuItem) => {
    if(selectedItem && !isNewItemDialogOpen) { // Editing existing item
        setItems(items.map(i => i.id === item.id ? item : i));
    } else { // Adding new item
        setItems([...items, {...item, id: (Math.random() * 10000).toString()}]);
    }
    setIsNewItemDialogOpen(false);
    setIsEditItemDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Menu Items</CardTitle>
                <CardDescription>
                    Add, update, or delete menu items.
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden md:table-cell">Ingredients</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={item.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={item.imageUrl}
                      width="64"
                      data-ai-hint="coffee drink"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>₹{item.price.toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                        {item.ingredients.map(ing => (
                            <Badge variant="outline" key={ing.name}>{ing.name}</Badge>
                        ))}
                    </div>
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
