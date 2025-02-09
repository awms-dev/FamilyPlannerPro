import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "@shared/schema";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const { data: families = [] } = useQuery({
    queryKey: ["/api/families"],
  });

  const defaultFamilyId = families[0]?.id;

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", defaultFamilyId],
    queryFn: async () => {
      if (!defaultFamilyId) return [];
      const response = await fetch(`/api/activities?familyId=${defaultFamilyId}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!defaultFamilyId,
  });

  // Get dates that have activities
  const datesWithActivities = activities.map(
    (activity) => new Date(activity.startDate)
  );

  // Get activities for the selected date
  const activitiesForSelectedDate = selectedDate
    ? activities.filter(
        (activity) =>
          format(new Date(activity.startDate), "yyyy-MM-dd") ===
          format(selectedDate, "yyyy-MM-dd")
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Family Calendar</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasActivity: datesWithActivities,
                }}
                modifiersStyles={{
                  hasActivity: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                  },
                }}
              />
            </CardContent>
          </Card>

          <div>
            {selectedDate && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Activities for {format(selectedDate, "MMMM d, yyyy")}
                </h2>
                <div className="space-y-4">
                  {activitiesForSelectedDate.map((activity) => (
                    <Card
                      key={activity.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <CardContent className="pt-6">
                        <h3 className="font-semibold">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(activity.startDate), "h:mm a")}
                          {activity.endDate &&
                            ` - ${format(new Date(activity.endDate), "h:mm a")}`}
                        </p>
                        {activity.description && (
                          <p className="mt-2 text-sm">{activity.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {activitiesForSelectedDate.length === 0 && (
                    <p className="text-muted-foreground">
                      No activities scheduled for this day
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={!!selectedActivity}
          onOpenChange={() => setSelectedActivity(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedActivity?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {selectedActivity &&
                    format(new Date(selectedActivity.startDate), "PPp")}
                  {selectedActivity?.endDate &&
                    ` - ${format(new Date(selectedActivity.endDate), "PPp")}`}
                </p>
              </div>
              {selectedActivity?.description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedActivity.description}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm text-muted-foreground">
                  {selectedActivity?.category}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {selectedActivity?.completed ? "Completed" : "Pending"}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
