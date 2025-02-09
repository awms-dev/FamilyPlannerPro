import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema, insertFamilySchema, type Activity, type Family } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, CheckCircle, CalendarDays, Users, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FamilyMembers } from "@/components/FamilyMembers";
import { useState } from "react";

const categories = [
  "Groceries",
  "Sports",
  "School",
  "Chores",
  "Other"
];

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [createFamilyDialogOpen, setCreateFamilyDialogOpen] = useState(false);
  const activityForm = useForm({
    resolver: zodResolver(insertActivitySchema),
    defaultValues: {
      isAllDay: false,
    },
  });

  const familyForm = useForm({
    resolver: zodResolver(insertFamilySchema),
  });

  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);

  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ["/api/families"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { familyId: selectedFamilyId }],
    enabled: !!selectedFamilyId,
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Starting mutation with data:', data);
      const res = await apiRequest("POST", "/api/families", data);
      const result = await res.json();
      console.log('Mutation completed with result:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      toast({
        title: "Success",
        description: "Family created successfully",
      });
      familyForm.reset();
      setCreateFamilyDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateFamily = async (data: any) => {
    console.log('Form submitted with data:', data);
    try {
      await createFamilyMutation.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        await apiRequest("POST", "/api/activities", {
          ...data,
          familyId: selectedFamilyId,
          assignedTo: Number(data.assignedTo),
        });
      } catch (error) {
        console.error("Failed to create activity:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", { familyId: selectedFamilyId }] });
      toast({
        title: "Success",
        description: "Activity created successfully",
      });
      activityForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/activities/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", { familyId: selectedFamilyId }] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Family Activities</h1>
            <nav className="flex gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Activities
              </Link>
              <Link href="/calendar" className="text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Welcome, {user?.displayName}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Family Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Families</h2>
              <Dialog open={createFamilyDialogOpen} onOpenChange={setCreateFamilyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Users className="mr-2 h-4 w-4" />
                    Create Family
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Family</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={familyForm.handleSubmit(onCreateFamily)}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Family Name</Label>
                        <Input id="name" {...familyForm.register("name")} />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createFamilyMutation.isPending}
                      >
                        {createFamilyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Family"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {families.map((family) => (
                <Card
                  key={family.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedFamilyId === family.id
                      ? "border-primary"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedFamilyId(family.id)}
                >
                  <CardHeader>
                    <CardTitle>{family.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {selectedFamilyId && (
              <div className="mb-8">
                <FamilyMembers familyId={selectedFamilyId} />
              </div>
            )}
          </section>

          {/* Activities Section */}
          {selectedFamilyId && (
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold">Activities</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Activity</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={activityForm.handleSubmit((data) => createActivityMutation.mutate(data))}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" {...activityForm.register("title")} />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" {...activityForm.register("description")} />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select onValueChange={(value) => activityForm.setValue("category", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !activityForm.watch("startDate") && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {activityForm.watch("startDate") ? format(activityForm.watch("startDate"), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={activityForm.watch("startDate")}
                                onSelect={(date) => activityForm.setValue("startDate", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !activityForm.watch("endDate") && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {activityForm.watch("endDate") ? format(activityForm.watch("endDate"), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={activityForm.watch("endDate")}
                                onSelect={(date) => activityForm.setValue("endDate", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>All Day Event</Label>
                          <Switch
                            checked={activityForm.watch("isAllDay")}
                            onCheckedChange={(checked) => activityForm.setValue("isAllDay", checked)}
                          />
                        </div>
                        <div>
                          <Label>Assign To</Label>
                          <Select onValueChange={(value) => activityForm.setValue("assignedTo", parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select family member" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={user!.id.toString()}>{user!.displayName}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={createActivityMutation.isPending}>
                          Create Activity
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>{activity.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => completeActivityMutation.mutate(activity.id)}
                          disabled={activity.completed || false}
                        >
                          <CheckCircle className={cn("h-5 w-5", activity.completed ? "text-primary" : "text-muted-foreground")} />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mb-4">{activity.description}</p>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-primary font-medium">{activity.category}</span>
                          {activity.isAllDay ? (
                            <span className="text-muted-foreground">All day event</span>
                          ) : null}
                        </div>
                        <div className="text-muted-foreground">
                          <p>Starts: {format(new Date(activity.startDate), "PPp")}</p>
                          {activity.endDate && (
                            <p>Ends: {format(new Date(activity.endDate), "PPp")}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}