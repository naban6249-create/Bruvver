"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Branch } from "@/lib/types";
import { BranchDialog } from "./branch-dialog";
import { DeleteConfirmationDialog } from "@/components/admin/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { getBranches, addBranch, updateBranch, deleteBranch } from '@/lib/branch-service';

export function BranchManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const { toast } = useToast();

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (error) {
      toast({
        title: "Error fetching branches",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSave = async (branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at'> | Branch) => {
    try {
      if ('id' in branchData && branchData.id) {
        await updateBranch(branchData.id, branchData);
        toast({ title: "Success", description: "Branch updated successfully." });
      } else {
        await addBranch(branchData as Omit<Branch, 'id' | 'created_at' | 'updated_at'>);
        toast({ title: "Success", description: "Branch created successfully." });
      }
      setIsDialogOpen(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (error) {
      toast({
        title: "Error saving branch",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranch(branchToDelete.id);
      toast({ title: "Success", description: "Branch deleted successfully." });
      setBranchToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchBranches();
    } catch (error) {
      toast({
        title: "Error deleting branch",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedBranch(null);
    setIsDialogOpen(true);
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Branch Management</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchBranches} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-10">
              <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Branches Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by adding your first branch.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.location}</TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? "default" : "secondary"}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(branch)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- FIX: The props being passed now match the dialog's definition --- */}
      <BranchDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        branch={selectedBranch}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Branch"
        description={`Are you sure you want to delete the "${branchToDelete?.name}" branch? This action cannot be undone.`}
      />
    </>
  );
}