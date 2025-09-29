"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Edit2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllUserPermissions, assignBranchPermission, revokeBranchPermission, grantAllBranchesFullAccess, limitToSingleBranch } from "@/lib/permission-service";
import type { UserPermissionSummary, Branch, UserBranchPermission } from "@/lib/types";
import { getBranches } from "@/lib/branch-service"; 
import { AssignPermissionDialog } from "./assign-permission-dialog";
import { CreateWorkerDialog } from "./create-worker-dialog";
import { createWorker, deactivateUser, updateUser, setUserPassword, getAllUsers } from "@/lib/user-service";
import { EditUserDialog, type EditUserPayload } from "./edit-user-dialog";

interface PermissionRowProps {
  permission: UserBranchPermission;
  branches: Branch[];
  onRevoke: (permission: UserBranchPermission) => void;
}

function PermissionRow({ permission, branches, onRevoke }: PermissionRowProps) {
  const branch = branches.find(b => b.id === permission.branch_id);
  
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <div className="flex-1">
        <div className="font-semibold">{branch?.name || `Branch ${permission.branch_id}`}</div>
        <div className="text-sm text-muted-foreground">{branch?.location}</div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRevoke(permission)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PermissionManagement() {
  const [users, setUsers] = useState<UserPermissionSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPermissionSummary | null>(null);
  const [userEmailMap, setUserEmailMap] = useState<Record<number, { email: string; username: string }>>({});
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersData, branchesData, fullUsers] = await Promise.all([
        getAllUserPermissions(),
        getBranches(),
        getAllUsers(),
      ]);
      setUsers(usersData as UserPermissionSummary[]);
      setBranches(branchesData);
      // Build a map of user_id -> { email, username } for accurate edit prefill
      const map: Record<number, { email: string; username: string }> = {};
      (fullUsers || []).forEach((u: any) => {
        if (u && typeof u.id === 'number') {
          map[u.id] = { email: u.email || '', username: u.username || '' };
        }
      });
      setUserEmailMap(map);
    } catch (error) {
      console.error('Error fetching permissions data:', error);
      toast({ 
        title: "Error", 
        description: "Could not fetch permissions data.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // No per-branch level toggling anymore

  const handleRevoke = async (permission: UserBranchPermission) => {
    if (!confirm("Are you sure you want to revoke this permission?")) return;
    
    try {
      await revokeBranchPermission(permission.user_id, permission.branch_id);
      toast({ 
        title: "Success", 
        description: "Permission has been revoked." 
      });
      fetchData();
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({ 
        title: "Error", 
        description: "Failed to revoke permission.", 
        variant: "destructive" 
      });
    }
  };

  const handleAssignSuccess = () => {
    fetchData();
    toast({ 
      title: 'Permission Assigned', 
      description: 'The permission has been successfully assigned.' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>Loading permissions data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              User Permissions Management
            </CardTitle>
            <CardDescription>
              Manage worker access permissions to different branches. You can assign view-only or full access permissions.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto justify-center sm:justify-start"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Worker
            </Button>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="w-full sm:w-auto justify-center sm:justify-start"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Assign Permission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-10">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Workers Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create worker accounts first to assign branch permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.map((user: UserPermissionSummary) => (
                <Card key={user.user_id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{user.full_name}</CardTitle>
                        <CardDescription className="text-sm">{user.username}</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <Badge variant="outline" className="self-start">
                          {user.branches.length} branch{user.branches.length !== 1 ? 'es' : ''}
                        </Badge>
                        {/* Admin actions - responsive layout */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                            onClick={async () => {
                              try {
                                await grantAllBranchesFullAccess(user.user_id);
                                toast({ title: 'Granted', description: 'Worker now has full access on all branches.' });
                                fetchData();
                              } catch (e) {
                                toast({ title: 'Error', description: 'Failed to grant full access.', variant: 'destructive' });
                              }
                            }}
                          >
                            Full Access (All)
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                            onClick={() => { setEditingUser(user); setIsEditOpen(true); }}
                          >
                            <Edit2 className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                            onClick={async () => {
                              if (!confirm(`Deactivate ${user.full_name}? They won't be able to log in.`)) return;
                              try {
                                await deactivateUser(user.user_id);
                                toast({ title: 'Deactivated', description: 'User has been deactivated.' });
                                fetchData();
                              } catch (e: any) {
                                toast({ title: 'Error', description: e?.message || 'Failed to deactivate user.', variant: 'destructive' });
                              }
                            }}
                          >
                            Deactivate
                          </Button>
                        </div>
                        <Select 
                          onValueChange={async (val) => {
                            try {
                              await limitToSingleBranch(user.user_id, parseInt(val));
                              toast({ title: 'Limited', description: 'Worker limited to selected branch.' });
                              fetchData();
                            } catch (e) {
                              toast({ title: 'Error', description: 'Failed to limit to single branch.', variant: 'destructive' });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-48 h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue placeholder="Limit to branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                Limit to: {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {user.branches.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No branch permissions assigned</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2" 
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Assign First Permission
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {user.branches.map((permission: UserBranchPermission) => (
                          <PermissionRow
                            key={`${permission.user_id}-${permission.branch_id}`}
                            permission={permission}
                            branches={branches}
                            onRevoke={handleRevoke}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AssignPermissionDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        users={users.map(u => ({ 
          id: u.user_id, 
          full_name: u.full_name, 
          username: u.username,
          role: 'worker'
        }))}
        branches={branches}
        onAssigned={handleAssignSuccess}
      />

      <CreateWorkerDialog
        isOpen={isCreateOpen}
        setIsOpen={setIsCreateOpen}
        branches={branches}
        onCreated={async (payload: { full_name: string; username: string; email: string; password: string; branchIds: (number|string)[] }) => {
          try {
            const user = await createWorker({
              full_name: payload.full_name,
              username: payload.username,
              email: payload.email,
              password: payload.password,
            });
            // Assign selected branches with full access
            for (const bId of payload.branchIds) {
              await assignBranchPermission({
                user_id: user.id,
                branch_id: Number(bId),
                permission_level: 'full_access'
              });
            }
            toast({ title: 'Worker Created', description: 'Account created and permissions assigned.' });
            fetchData();
          } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Failed to create worker.', variant: 'destructive' });
          }
        }}
      />

      {editingUser && (
        <EditUserDialog
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
          user={{
            id: editingUser.user_id,
            full_name: editingUser.full_name,
            username: editingUser.username,
            email: userEmailMap[editingUser.user_id]?.email || '',
          }}
          onSave={async (data: EditUserPayload) => {
            try {
              await updateUser(data.id, {
                full_name: data.full_name,
                username: data.username,
                // email is immutable in UI; we won't send it for update
              });
              if (data.newPassword && data.newPassword.length >= 4) {
                await setUserPassword(data.id, data.newPassword);
              }
              toast({ title: 'Updated', description: 'User details have been updated.' });
              setIsEditOpen(false);
              setEditingUser(null);
              fetchData();
            } catch (e: any) {
              toast({ title: 'Error', description: e?.message || 'Failed to update user.', variant: 'destructive' });
            }
          }}
        />
      )}
    </>
  );
}
