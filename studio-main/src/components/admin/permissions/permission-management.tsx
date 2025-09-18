"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllUserPermissions, assignBranchPermission, revokeBranchPermission } from "@/lib/permission-service";
import type { UserPermissionSummary, Branch } from "@/lib/types";
// You will need a service to fetch all available branches
import { getBranches } from "@/lib/branch-service"; 

// This would be your dialog/modal for assigning permissions
// import { AssignPermissionDialog } from "./assign-permission-dialog";

export function PermissionManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
  setIsLoading(true);
  try {
    const [usersData, branchesData] = await Promise.all([
      getAllUserPermissions(),
      getBranches()
    ]);
    setUsers(usersData);
    setBranches(branchesData);
  } catch (error) {
    toast({ title: "Error", description: "Could not fetch permissions data.", variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevoke = async (userId: number, branchId: number) => {
    if (!confirm("Are you sure you want to revoke this permission?")) return;
    try {
      await revokeBranchPermission(userId, branchId);
      toast({ title: "Success", description: "Permission has been revoked." });
      fetchData(); // Refresh the data
    } catch (error) {
      toast({ title: "Error", description: "Failed to revoke permission.", variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Permissions</CardTitle>
            <CardDescription>Assign and manage worker access to branches.</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Assign Permission
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Assigned Branches & Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.full_name}<br /><span className="text-sm text-muted-foreground">{user.username}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.branches.length > 0 ? user.branches.map((perm) => (
                          <div key={perm.branch_id} className="flex items-center gap-2 p-2 border rounded-md">
                            <span className="font-semibold">{branches.find(b => b.id === perm.branch_id)?.name || `Branch ${perm.branch_id}`}</span>
                            <Badge variant={perm.permission_level === 'full_access' ? 'default' : 'secondary'}>
                              {perm.permission_level.replace('_', ' ')}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRevoke(user.user_id, perm.branch_id)}>
                               <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )) : <span className="text-muted-foreground">No permissions assigned.</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* You would render your dialog for assigning permissions here.
        It would need the list of users and branches to populate its dropdowns.
        <AssignPermissionDialog 
            isOpen={isDialogOpen} 
            setIsOpen={setIsDialogOpen}
            users={users}
            branches={branches}
            onAssign={fetchData} 
        /> 
      */}
    </>
  );
}