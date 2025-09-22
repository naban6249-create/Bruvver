"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch } from "@/lib/types";

export interface CreateWorkerPayload {
  full_name: string;
  username: string;
  email: string;
  password: string;
  branchIds: (number | string)[];
}

interface CreateWorkerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  branches: Branch[];
  onCreated: (payload: CreateWorkerPayload) => Promise<void> | void;
}

export function CreateWorkerDialog({ isOpen, setIsOpen, branches, onCreated }: CreateWorkerDialogProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSelectedBranches([]);
      setSubmitting(false);
    }
  }, [isOpen]);

  const canSubmit = useMemo(() => {
    return fullName.trim() && username.trim() && email.trim() && password.length >= 4 && selectedBranches.length > 0;
  }, [fullName, username, email, password, selectedBranches]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onCreated({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        branchIds: selectedBranches,
      });
      setIsOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Create Worker</DialogTitle>
          <DialogDescription>Provide worker details and select branches to grant full access.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Worker full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., worker1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="worker@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 4 characters" />
          </div>
          
          <div className="space-y-2">
            <Label>Branches (Full Access)</Label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {branches.map((b) => {
                const idStr = String(b.id);
                const checked = selectedBranches.includes(idStr);
                return (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedBranches((prev) =>
                          e.target.checked ? [...prev, idStr] : prev.filter((v) => v !== idStr)
                        );
                      }}
                    />
                    <span>{b.name}{b.location ? ` (${b.location})` : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Creating…' : 'Create Worker'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
