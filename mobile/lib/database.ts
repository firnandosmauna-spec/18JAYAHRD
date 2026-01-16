import * as SQLite from 'expo-sqlite';

// Initialize database
let db: SQLite.SQLiteDatabase;

export const getDB = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('hrd_local.db');
    }
    return db;
};

// Initialize Tables
export const initDatabase = async () => {
    const database = await getDB();

    await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- In real app, hash this!
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      modules TEXT NOT NULL DEFAULT '[]' -- JSON string
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      department_id TEXT,
      status TEXT DEFAULT 'active',
      join_date TEXT NOT NULL,
      salary REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert Default Admin if not exists
    INSERT OR IGNORE INTO profiles (id, email, password, name, role, modules)
    VALUES (
      'admin-1', 
      'admin@company.com', 
      'admin123', 
      'Admin System', 
      'admin', 
      '["hrd","accounting","inventory","sales","purchase","customer","project"]'
    );
  `);

    console.log('Database initialized successfully');
};
