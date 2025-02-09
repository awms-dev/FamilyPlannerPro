import { users, activities, families, familyMembers, type User, type InsertUser, type Activity, type InsertActivity, type Family, type InsertFamily, type FamilyMember, type InsertFamilyMember } from "@shared/schema";
import { db } from "./db";
import { eq, or, and } from "drizzle-orm";
import session from "express-session";
import memorystore from "memorystore";

// Create memory store with proper type
const MemoryStore = memorystore(session);
const sessionStore = new MemoryStore({
  checkPeriod: 86400000, // Prune expired entries every 24h
  max: 10000, // Maximum number of sessions to store
});

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  sessionStore: session.Store;

  // Family related methods
  createFamily(family: InsertFamily & { createdBy: number }): Promise<Family>;
  getFamilyById(id: number): Promise<Family | undefined>;
  getFamiliesByUserId(userId: number): Promise<Family[]>;

  // Family member related methods
  inviteFamilyMember(member: InsertFamilyMember & { familyId: number; userId?: number; status: "pending" | "active" }): Promise<FamilyMember>;
  getFamilyMembers(familyId: number): Promise<FamilyMember[]>;
  getFamilyMembersByEmail(email: string): Promise<FamilyMember[]>;
  updateFamilyMemberStatus(id: number, status: "pending" | "active"): Promise<FamilyMember>;

  // Activity methods
  getActivities(familyId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity>;
  completeActivity(id: number): Promise<Activity>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = sessionStore;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createFamily(family: InsertFamily & { createdBy: number }): Promise<Family> {
    const [newFamily] = await db.insert(families).values(family).returning();

    // Make the creator an admin member
    const user = await this.getUser(family.createdBy);
    if (!user) throw new Error("User not found");

    await this.inviteFamilyMember({
      familyId: newFamily.id,
      userId: user.id,
      inviteEmail: user.email,
      role: "admin",
      status: "active"
    });

    return newFamily;
  }

  async getFamilyById(id: number): Promise<Family | undefined> {
    const result = await db
      .select()
      .from(families)
      .where(eq(families.id, id));
    return result[0];
  }

  async getFamiliesByUserId(userId: number): Promise<Family[]> {
    const members = await db
      .select({
        familyId: familyMembers.familyId,
      })
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const familyIds = members.map(m => m.familyId);

    if (familyIds.length === 0) return [];

    return db
      .select()
      .from(families)
      .where(or(...familyIds.map(id => eq(families.id, id))));
  }

  async inviteFamilyMember(member: InsertFamilyMember & { familyId: number; userId?: number; status: "pending" | "active" }): Promise<FamilyMember> {
    const [newMember] = await db.insert(familyMembers).values(member).returning();
    return newMember;
  }

  async getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    return db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
  }

  async getFamilyMembersByEmail(email: string): Promise<FamilyMember[]> {
    return db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.inviteEmail, email));
  }

  async updateFamilyMemberStatus(id: number, status: "pending" | "active"): Promise<FamilyMember> {
    const [member] = await db
      .update(familyMembers)
      .set({ status })
      .where(eq(familyMembers.id, id))
      .returning();
    return member;
  }

  async getActivities(familyId: number): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.familyId, familyId))
      .limit(100);
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