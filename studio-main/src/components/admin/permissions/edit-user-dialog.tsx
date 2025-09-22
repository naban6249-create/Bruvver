"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
 

export interface EditUserPayload {
  id: number;
  full_name: string;
  username: string;
  email: string;
  newPassword?: string;
}

interface EditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: { id: number; full_name: string; username: string; email: string };
  onSave: (data: EditUserPayload) => Promise<void> | void;
}

export function EditUserDialog({ isOpen, setIsOpen, user, onSave }: EditUserDialogProps) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user.full_name || "");
    setUsername(user.username || "");
    setEmail(user.email || "");
    setNewPassword("");
  }, [user, isOpen]);

  const canSave = useMemo(() => {
    return fullName.trim() && username.trim() && email.trim();
  }, [fullName, username, email]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        id: user.id,
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        newPassword: newPassword.trim() ? newPassword : undefined,
      });
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit User</DialogTitle>
          <DialogDescription>Update user details. Leave password blank to keep unchanged.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} readOnly disabled />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
