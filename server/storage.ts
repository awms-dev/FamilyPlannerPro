import { users, activities, type User, type InsertUser, type Activity, type InsertActivity } from "@shared/schema";
import { db } from "./db";
import { eq, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getActivities(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity>;
  completeActivity(id: number): Promise<Activity>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getActivities(userId: number): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(
        or(
          eq(activities.createdBy, userId),
          eq(activities.assignedTo, userId)
        )
      );
  }

  async createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async completeActivity(id: number): Promise<Activity> {
    const [activity] = await db
      .update(activities)
      .set({ completed: true })
      .where(eq(activities.id, id))
      .returning();

    if (!activity) {
      throw new Error("Activity not found");
    }

    return activity;
  }
}

export const storage = new DatabaseStorage();