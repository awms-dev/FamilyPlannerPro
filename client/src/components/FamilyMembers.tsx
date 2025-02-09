import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FamilyMember, InsertFamilyMember } from "@shared/schema";
import { Loader2, UserPlus, X } from "lucide-react";

export function FamilyMembers({ familyId }: { familyId: number }) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery<FamilyMember[]>({
    queryKey: [`/api/families/${familyId}/members`],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InsertFamilyMember) => {
      const res = await apiRequest(
        "POST",
        `/api/families/${familyId}/members`,
        { ...data, role: "member" }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/families/${familyId}/members`] });
      setEmail("");
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ inviteEmail: email });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family Members</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <Input
            type="email"
            placeholder="Enter email to invite"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            <span className="ml-2">Invite</span>
          </Button>
        </form>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium">{member.inviteEmail}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {member.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
