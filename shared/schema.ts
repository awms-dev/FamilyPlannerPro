import { pgTable, text, serial, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
});

export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // "admin", "member"
  status: text("status").notNull(), // "pending", "active"
  inviteEmail: text("invite_email").notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  assignedTo: integer("assigned_to").notNull().references(() => users.id),
  familyId: integer("family_id").notNull().references(() => families.id),
  completed: boolean("completed").default(false),
  isAllDay: boolean("is_all_day").default(false),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    displayName: true,
  })
  .extend({
    email: z.string().email(),
  });

export const insertFamilySchema = createInsertSchema(families).pick({
  name: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers)
  .pick({
    inviteEmail: true,
  })
  .extend({
    role: z.enum(["admin", "member"]),
  });

// Custom validation for dates
const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return arg;
}, z.date());

export const insertActivitySchema = createInsertSchema(activities)
  .pick({
    title: true,
    description: true,
    category: true,
    assignedTo: true,
    isAllDay: true,
    familyId: true,
  })
  .extend({
    startDate: dateSchema,
    endDate: dateSchema.nullable().optional(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;