"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import type { Branch } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// --- FIX: Corrected and simplified the props interface ---
interface BranchDialogProps {
  isOpen: boolean;
  onClose: () => void; // Use a simple onClose function
  onSave: (branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at'> | Branch) => void;
  branch: Branch | null;
}

export function BranchDialog({ isOpen, onClose, onSave, branch }: BranchDialogProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // FIX: Handle null or undefined values gracefully
    setName(branch?.name || "");
    setLocation(branch?.location || "");
    setAddress(branch?.address || "");
    setPhone(branch?.phone || "");
    setEmail(branch?.email || "");
    setIsActive(branch?.is_active ?? true);
  }, [branch, isOpen]);

  const handleSave = () => {
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Branch name is required.",
        variant: "destructive",
      });
      return;
    }

    const branchData = {
      name,
      location,
      address,
      phone,
      email,
      is_active: isActive,
    };

    if (branch?.id) {
      onSave({ ...branchData, id: branch.id });
    } else {
      onSave(branchData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          <DialogDescription>
            {branch ? "Update the details for this branch." : "Fill in the details for the new branch."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}