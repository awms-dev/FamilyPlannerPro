import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FamilyMember, InsertFamilyMember } from "@shared/schema";
import { Loader2, UserPlus, X, Copy, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FamilyMembers({ familyId }: { familyId: number }) {
  const [email, setEmail] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery<FamilyMember[]>({
    queryKey: [`/api/families/${familyId}/members`],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { inviteEmail: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/families/${familyId}/members`,
        { ...data, role: "member" } as InsertFamilyMember
      );
      const result = await res.json();
      if (res.ok) {
        return result;
      } else {
        throw new Error(result.error || "Failed to send invitation");
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/families/${familyId}/members`] });
      setEmail("");
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        setShowInviteDialog(true);
      }
      toast({
        title: "Success",
        description: "Invitation created successfully",
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <>
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

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invitation Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the person you want to invite:
            </p>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="flex-1 text-sm break-all">{inviteUrl}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setShowInviteDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}