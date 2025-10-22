import { type User, type InsertUser, type World, type InsertWorld } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // World operations
  getWorld(id: string): Promise<World | undefined>;
  getWorldsByUser(userId: string): Promise<World[]>;
  createWorld(world: InsertWorld): Promise<World>;
  updateWorld(id: string, updates: Partial<World>): Promise<World | undefined>;
  deleteWorld(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private worlds: Map<string, World>;

  constructor() {
    this.users = new Map();
    this.worlds = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWorld(id: string): Promise<World | undefined> {
    return this.worlds.get(id);
  }

  async getWorldsByUser(userId: string): Promise<World[]> {
    return Array.from(this.worlds.values()).filter(
      (world) => world.userId === userId,
    );
  }

  async createWorld(insertWorld: InsertWorld): Promise<World> {
    const id = randomUUID();
    const world: World = { 
      ...insertWorld, 
      id,
      createdAt: Date.now()
    };
    this.worlds.set(id, world);
    return world;
  }

  async updateWorld(id: string, updates: Partial<World>): Promise<World | undefined> {
    const world = this.worlds.get(id);
    if (!world) return undefined;
    
    const updatedWorld = { ...world, ...updates };
    this.worlds.set(id, updatedWorld);
    return updatedWorld;
  }

  async deleteWorld(id: string): Promise<boolean> {
    return this.worlds.delete(id);
  }
}

export const storage = new MemStorage();
