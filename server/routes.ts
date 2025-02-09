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
    const parsed = insertFamilySchema.parse(req.body);
    const family = await storage.createFamily({
      ...parsed,
      createdBy: req.user.id,
    });
    res.status(201).json(family);
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

    // Check if the invited user already exists
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
    const { familyId } = z.object({ familyId: z.coerce.number() }).parse(req.query);
    const activities = await storage.getActivities(familyId);
    res.json(activities);
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