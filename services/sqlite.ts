import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

class SQLiteService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      
      // Create and open the database
      this.db = await this.sqlite.createConnection('gasja_db', false, 'no-encryption', 1, false);
      await this.db.open();

      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      console.log('SQLite Initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite:', error);
      // Fallback to localStorage for web preview if SQLite fails
      this.isInitialized = true; 
    }
  }

  private async createTables() {
    if (!this.db) return;

    const queries = [
      `CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS depots (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS banners (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS billing (
        id TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS deposit_requests (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of queries) {
      await this.db.execute(query);
    }
  }

  // Generic methods to save and get data
  async saveData(table: string, id: string, data: any) {
    const jsonStr = JSON.stringify(data);
    
    if (Capacitor.getPlatform() === 'web' || !this.db) {
      localStorage.setItem(`${table}_${id}`, jsonStr);
      return;
    }

    try {
      const query = `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`;
      await this.db.run(query, [id, jsonStr]);
    } catch (error) {
      console.error(`Error saving to ${table}:`, error);
      localStorage.setItem(`${table}_${id}`, jsonStr);
    }
  }

  async getData(table: string, id: string): Promise<any | null> {
    if (Capacitor.getPlatform() === 'web' || !this.db) {
      const data = localStorage.getItem(`${table}_${id}`);
      return data ? JSON.parse(data) : null;
    }

    try {
      const query = `SELECT data FROM ${table} WHERE id = ?`;
      const result = await this.db.query(query, [id]);
      if (result.values && result.values.length > 0) {
        return JSON.parse(result.values[0].data);
      }
      return null;
    } catch (error) {
      console.error(`Error getting from ${table}:`, error);
      const data = localStorage.getItem(`${table}_${id}`);
      return data ? JSON.parse(data) : null;
    }
  }

  async getAllFromTable(table: string): Promise<any[]> {
    if (Capacitor.getPlatform() === 'web' || !this.db) {
      const items: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${table}_`)) {
          const data = localStorage.getItem(key);
          if (data) items.push(JSON.parse(data));
        }
      }
      return items;
    }

    try {
      // Check if table has created_at column
      let query = `SELECT data FROM ${table}`;
      if (['orders', 'transactions', 'deposit_requests', 'notifications'].includes(table)) {
        query += ` ORDER BY created_at DESC`;
      }
      const result = await this.db.query(query);
      return result.values ? result.values.map(v => JSON.parse(v.data)) : [];
    } catch (error) {
      console.error(`Error getting all from ${table}:`, error);
      return [];
    }
  }

  async deleteData(table: string, id: string) {
    if (Capacitor.getPlatform() === 'web' || !this.db) {
      localStorage.removeItem(`${table}_${id}`);
      return;
    }

    try {
      const query = `DELETE FROM ${table} WHERE id = ?`;
      await this.db.run(query, [id]);
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      localStorage.removeItem(`${table}_${id}`);
    }
  }
}

export const sqliteService = new SQLiteService();
