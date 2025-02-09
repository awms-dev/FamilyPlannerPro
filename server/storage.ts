import { users, activities, type User, type InsertUser, type Activity, type InsertActivity } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getActivities(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity>;
  completeActivity(id: number): Promise<Activity>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private activities: Map<number, Activity>;
  currentId: number;
  activityId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.currentId = 1;
    this.activityId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getActivities(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      (activity) => activity.createdBy === userId || activity.assignedTo === userId
    );
  }

  async createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity> {
    const id = this.activityId++;
    const newActivity: Activity = {
      ...activity,
      id,
      completed: false,
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async completeActivity(id: number): Promise<Activity> {
    const activity = this.activities.get(id);
    if (!activity) {
      throw new Error("Activity not found");
    }
    const updatedActivity = { ...activity, completed: true };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }
}

export const storage = new MemStorage();