import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const userSettingsSchema = z.object({
  email: z.string().email(),
  model: z.enum(["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]).default("gpt-3.5-turbo"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4000).default(2000),
  responseStyle: z.enum(["concise", "balanced", "detailed", "comprehensive", "bullet-points", "step-by-step"]).default("balanced"),
  conversationStyle: z.enum(["professional", "casual", "friendly", "technical", "enthusiastic", "witty", "empathetic", "academic", "socratic"]).default("friendly"),
  customPersonality: z.string().max(500).default(""),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

// World schema - separate chat contexts with their own AI settings
export const worldSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  model: z.enum(["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]).default("gpt-3.5-turbo"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4000).default(2000),
  responseStyle: z.enum(["concise", "balanced", "detailed", "comprehensive", "bullet-points", "step-by-step"]).default("balanced"),
  conversationStyle: z.enum(["professional", "casual", "friendly", "technical", "enthusiastic", "witty", "empathetic", "academic", "socratic"]).default("friendly"),
  customPersonality: z.string().max(500).default(""),
  createdAt: z.number().default(() => Date.now()),
});

export const insertWorldSchema = worldSchema.omit({ id: true, createdAt: true });

export type World = z.infer<typeof worldSchema>;
export type InsertWorld = z.infer<typeof insertWorldSchema>;
