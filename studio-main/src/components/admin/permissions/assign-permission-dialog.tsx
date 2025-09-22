"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch, User } from "@/lib/types";
import { assignBranchPermission } from "@/lib/permission-service";

interface AssignPermissionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  users: Array<{ id: number; full_name: string; username: string; role?: string }>;
  branches: Branch[];
  onAssigned: () => void;
}

export function AssignPermissionDialog({ isOpen, setIsOpen, users, branches, onAssigned }: AssignPermissionDialogProps) {
  const [userId, setUserId] = React.useState<string>("");
  const [branchId, setBranchId] = React.useState<string>("");
  const [level, setLevel] = React.useState<"view_only" | "full_access">("view_only");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setUserId("");
      setBranchId("");
      setLevel("view_only");
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!userId || !branchId) return;
    setIsSubmitting(true);
    try {
      await assignBranchPermission({
        user_id: Number(userId),
        branch_id: Number(branchId),
        permission_level: level,
      });
      onAssigned();
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to assign permission', e);
      alert('Failed to assign permission. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Assign Branch Permission</DialogTitle>
          <DialogDescription>
            Select a worker, a branch, and a permission level.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Worker</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => (u as any).role ? (u as any).role === 'worker' : true).map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.full_name || u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Permission Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view_only">View Only</SelectItem>
                <SelectItem value="full_access">Full Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !userId || !branchId}>
            {isSubmitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
