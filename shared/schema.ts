import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdBy: integer("created_by").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  completed: boolean("completed").default(false),
  isAllDay: boolean("is_all_day").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertActivitySchema = createInsertSchema(activities)
  .pick({
    title: true,
    description: true,
    category: true,
    startDate: true,
    endDate: true,
    assignedTo: true,
    isAllDay: true,
  })
  .transform((data) => {
    // Ensure dates are properly transformed to Date objects
    const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
    const endDate = data.endDate ? (data.endDate instanceof Date ? data.endDate : new Date(data.endDate)) : undefined;

    return {
      ...data,
      startDate,
      endDate,
    };
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;