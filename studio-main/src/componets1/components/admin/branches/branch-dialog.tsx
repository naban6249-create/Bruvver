"use client";

import React, { useState, useEffect } from 'react';
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
import type { Branch } from '@/lib/types';

interface BranchDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (branch: Branch) => void;
  branch: Branch | null;
}

export function BranchDialog({ isOpen, setIsOpen, onSave, branch }: BranchDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setLocation(branch.location);
    } else {
      setName('');
      setLocation('');
    }
  }, [branch, isOpen]);

  const handleSave = () => {
    const newBranch: Branch = {
      id: branch?.id || '',
      name,
      location,
    };
    onSave(newBranch);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{branch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          <DialogDescription>
            {branch ? 'Make changes to the branch details.' : 'Add a new branch.'} Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
