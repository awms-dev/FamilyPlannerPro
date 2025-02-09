import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertActivitySchema, insertFamilySchema, insertFamilyMemberSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

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
    const parsed = insertFamilyMemberSchema.omit({ inviteToken: true }).parse(req.body);

    // Check if member already exists
    const existingMembers = await storage.getFamilyMembers(familyId);
    const memberExists = existingMembers.some(member => member.inviteEmail === parsed.inviteEmail);

    if (memberExists) {
      return res.status(400).json({ error: "Member already exists in this family" });
    }

    const inviteToken = generateInviteToken();
    const existingUser = await storage.getUserByEmail(parsed.inviteEmail);

    const member = await storage.inviteFamilyMember({
      ...parsed,
      inviteToken,
      familyId,
      userId: existingUser?.id,
      status: existingUser ? "active" : "pending",
    });

    // Generate invite URL
    const appUrl = process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:3000';
    const inviteUrl = `${appUrl}/auth?invite=${inviteToken}`;

    res.status(201).json({
      ...member,
      inviteUrl
    });
  });

  // Add this route before the activities routes
  app.get("/api/invites/:token", async (req, res) => {
    const { token } = req.params;
    try {
      const members = await storage.getFamilyMembersByInviteToken(token);
      if (!members || members.length === 0) {
        return res.status(404).json({ error: "Invalid or expired invite token" });
      }
      const member = members[0];

      // If the member is already active, return an error
      if (member.status === "active") {
        return res.status(400).json({ error: "This invitation has already been used" });
      }

      res.json({ familyId: member.familyId });
    } catch (error) {
      console.error("Error verifying invite:", error);
      res.status(500).json({ error: "Failed to verify invite" });
    }
  });

  // Add this route to handle post-registration family joining
  app.post("/api/invites/:token/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { token } = req.params;
    try {
      const members = await storage.getFamilyMembersByInviteToken(token);
      if (!members || members.length === 0) {
        return res.status(404).json({ error: "Invalid or expired invite token" });
      }

      const member = members[0];
      if (member.status === "active") {
        return res.status(400).json({ error: "This invitation has already been used" });
      }

      // Update the member record with the user's ID and mark as active
      const updatedMember = await storage.updateFamilyMember(member.id, {
        userId: req.user.id,
        status: "active"
      });

      res.json(updatedMember);
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
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