"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import type { Branch } from "@/lib/types";
import { BranchDialog } from "./branch-dialog";
import { DeleteConfirmationDialog } from "@/components/admin/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { BRANCHES_DATA } from "@/lib/data";
import { v4 as uuidv4 } from 'uuid';

export function BranchManagement() {
  const [branches, setBranches] = React.useState<Branch[]>(BRANCHES_DATA);
  const [isNewBranchDialogOpen, setIsNewBranchDialogOpen] = React.useState(false);
  const [isEditBranchDialogOpen, setIsEditBranchDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const { toast } = useToast();

  const handleAddNewBranch = () => {
    setSelectedBranch(null);
    setIsNewBranchDialogOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsEditBranchDialogOpen(true);
  };

  const handleDeleteBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBranch = async () => {
    if (!selectedBranch) return;
    setBranches(branches.filter(b => b.id !== selectedBranch.id));
    toast({ title: "Success", description: "Branch deleted." });
    setIsDeleteDialogOpen(false);
    setSelectedBranch(null);
  };

  const handleSaveBranch = async (branch: Branch) => {
    const isNew = !branch.id;
    if (isNew) {
      const newBranch = { ...branch, id: uuidv4() };
      setBranches([...branches, newBranch]);
      toast({ title: "Success", description: "Branch added." });
    } else {
      setBranches(branches.map(b => b.id === branch.id ? branch : b));
      toast({ title: "Success", description: "Branch updated." });
    }
    setIsNewBranchDialogOpen(false);
    setIsEditBranchDialogOpen(false);
    setSelectedBranch(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline">Branch Management</CardTitle>
              <CardDescription>
                Add, update, or delete branches. Each branch will have its own unique data.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleAddNewBranch}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Branch
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.location}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditBranch(branch)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteBranch(branch)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      <BranchDialog
        isOpen={isNewBranchDialogOpen || isEditBranchDialogOpen}
        setIsOpen={isNewBranchDialogOpen ? setIsNewBranchDialogOpen : setIsEditBranchDialogOpen}
        onSave={handleSaveBranch}
        branch={selectedBranch}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteBranch}
        itemName={selectedBranch?.name}
      />
    </>
  );
}
