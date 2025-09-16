"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  MapPin, 
  Phone, 
  Mail,
  Edit,
  Trash2,
  Check
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Branch {
  id: number;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

interface BranchSelectorProps {
  currentUser: any;
  onBranchChange?: (branchId: number) => void;
}

export function BranchSelector({ currentUser, onBranchChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
    // Set default branch if user has one assigned
    if (currentUser?.branch_id) {
      const userBranch = branches.find(b => b.id === currentUser.branch_id);
      if (userBranch) {
        setSelectedBranch(userBranch);
      }
    }
  }, [currentUser]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/branches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const branchData = await response.json();
        setBranches(branchData);
        
        // Set first branch as default if none selected
        if (branchData.length > 0 && !selectedBranch) {
          setSelectedBranch(branchData[0]);
          onBranchChange?.(branchData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    }
  };

  const handleCreateBranch = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newBranch = await response.json();
        setBranches([...branches, newBranch]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast({
          title: "Success",
          description: "Branch created successfully",
        });
      } else {
        throw new Error('Failed to create branch');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create branch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedBranch = await response.json();
        setBranches(branches.map(b => b.id === updatedBranch.id ? updatedBranch : b));
        setIsEditDialogOpen(false);
        setEditingBranch(null);
        resetForm();
        toast({
          title: "Success",
          description: "Branch updated successfully",
        });
      } else {
        throw new Error('Failed to update branch');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update branch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: number) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setBranches(branches.filter(b => b.id !== branchId));
        if (selectedBranch?.id === branchId) {
          setSelectedBranch(branches[0] || null);
        }
        toast({
          title: "Success",
          description: "Branch deleted successfully",
        });
      } else {
        throw new Error('Failed to delete branch');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive",
      });
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    onBranchChange?.(branch.id);
    toast({
      title: "Branch Selected",
      description: `Switched to ${branch.name}`,
    });
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      location: branch.location || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      address: '',
      phone: '',
      email: '',
      is_active: true
    });
  };

  // Only show if user is admin
  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>{selectedBranch?.name || 'Select Branch'}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px]" align="start">
          <DropdownMenuLabel>Branch Management</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              className="flex items-center justify-between p-3"
            >
              <div 
                className="flex items-center space-x-3 flex-1 cursor-pointer"
                onClick={() => handleBranchSelect(branch)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{branch.name}</span>
                    {selectedBranch?.id === branch.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {!branch.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  {branch.location && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{branch.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(branch);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBranch(branch.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Branch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Branch Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Add a new branch location to your coffee shop network.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Downtown Branch"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-location">Location</Label>
              <Input
                id="branch-location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Downtown, City Center"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch-address">Address</Label>
              <Textarea
                id="branch-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Full address..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch-phone">Phone</Label>
                <Input
                  id="branch-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch-email">Email</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="branch@coffee.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBranch}
              disabled={!formData.name.trim() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update branch information.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-branch-name">Branch Name *</Label>
              <Input
                id="edit-branch-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Downtown Branch"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-branch-location">Location</Label>
              <Input
                id="edit-branch-location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Downtown, City Center"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-branch-address">Address</Label>
              <Textarea
                id="edit-branch-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Full address..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-branch-phone">Phone</Label>
                <Input
                  id="edit-branch-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-branch-email">Email</Label>
                <Input
                  id="edit-branch-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="branch@coffee.com"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-branch-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-branch-active">Branch is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateBranch}
              disabled={!formData.name.trim() || isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}