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
import { insertActivitySchema, type Activity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, CheckCircle, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";


const categories = [
  "Groceries",
  "Sports",
  "School",
  "Chores",
  "Other"
];

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const form = useForm({
    resolver: zodResolver(insertActivitySchema),
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });

  const completeActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/activities/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold">Activities</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Activity</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit((data) => createActivityMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" {...form.register("title")} />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...form.register("description")} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select onValueChange={(value) => form.setValue("category", value)}>
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
                            !form.watch("startDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("startDate") ? format(form.watch("startDate"), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("startDate")}
                          onSelect={(date) => form.setValue("startDate", date)}
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
                            !form.watch("endDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("endDate") ? format(form.watch("endDate"), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("endDate")}
                          onSelect={(date) => form.setValue("endDate", date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>All Day Event</Label>
                    <Switch 
                      checked={form.watch("isAllDay")}
                      onCheckedChange={(checked) => form.setValue("isAllDay", checked)}
                    />
                  </div>
                  <div>
                    <Label>Assign To</Label>
                    <Select onValueChange={(value) => form.setValue("assignedTo", parseInt(value))}>
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
                    disabled={activity.completed}
                  >
                    <CheckCircle className={cn("h-5 w-5", activity.completed ? "text-primary" : "text-muted-foreground")} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{activity.category}</span>
                  {activity.dueDate && (
                    <span className="text-muted-foreground">
                      Due: {format(new Date(activity.dueDate), "PP")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}