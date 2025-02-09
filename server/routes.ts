import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertActivitySchema, insertFamilySchema, insertFamilyMemberSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Family management routes
  app.post("/api/families", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Ensure user has an email
      if (!req.user?.email) {
        throw new Error("User email is required");
      }

      console.log('POST /api/families - Request body:', req.body);
      const parsed = insertFamilySchema.parse(req.body);
      console.log('POST /api/families - Parsed data:', parsed);

      const family = await storage.createFamily({
        ...parsed,
        createdBy: req.user.id,
      });

      // Create initial family member record for the creator
      await storage.inviteFamilyMember({
        familyId: family.id,
        userId: req.user.id,
        role: "admin",
        status: "active",
        inviteEmail: req.user.email // Explicitly set the inviteEmail
      });

      console.log('POST /api/families - Created family:', family);
      res.status(201).json(family);
    } catch (error) {
      console.error('POST /api/families - Error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.get("/api/families", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const families = await storage.getFamiliesByUserId(req.user.id);
    res.json(families);
  });

  // Family member management routes
  app.get("/api/families/:familyId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { familyId } = z.object({ familyId: z.coerce.number() }).parse(req.params);
    const members = await storage.getFamilyMembers(familyId);
    res.json(members);
  });

  app.post("/api/families/:familyId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { familyId } = z.object({ familyId: z.coerce.number() }).parse(req.params);
    const parsed = insertFamilyMemberSchema.parse(req.body);

    const existingUser = await storage.getUserByEmail(parsed.inviteEmail);

    const member = await storage.inviteFamilyMember({
      ...parsed,
      familyId,
      userId: existingUser?.id,
      status: existingUser ? "active" : "pending",
    });
    res.status(201).json(member);
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { familyId } = z.object({ familyId: z.coerce.number() }).parse(req.query);

      // Check if user is a member of this family
      const members = await storage.getFamilyMembers(familyId);
      const userIsMember = members.some(member => member.userId === req.user?.id);

      if (!userIsMember) {
        return res.status(403).json({ error: "User is not a member of this family" });
      }

      const activities = await storage.getActivities(familyId);
      res.json(activities);
    } catch (error) {
      console.error('GET /api/activities - Error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: 'An unknown error occurred' });
      }
    }
  });

  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertActivitySchema.parse(req.body);
    const activity = await storage.createActivity({
      ...parsed,
      createdBy: req.user.id,
    });
    res.status(201).json(activity);
  });

  app.patch("/api/activities/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const activity = await storage.completeActivity(id);
    res.json(activity);
  });

  const httpServer = createServer(app);
  return httpServer;
}