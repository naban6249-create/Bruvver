// src/componets1/components/admin/delete-confirmation-dialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- FIX: Updated the props to be more flexible ---
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose?: () => void;      // Optional; will default to no-op
  onConfirm: () => void;
  title?: string;            // Made title optional and available
  description?: string;      // Made description optional and available
}

export function DeleteConfirmationDialog({ 
  isOpen, 
  onClose,
  onConfirm, 
  title = "Are you absolutely sure?", // Default title
  description = "This action cannot be undone. This will permanently delete the item." // Default description
}: DeleteConfirmationDialogProps) {
  const handleClose = onClose ?? (() => {});
  return (
    // --- FIX: Use onOpenChange to call the new onClose function ---
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* AlertDialogCancel will now correctly trigger the onClose */}
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}