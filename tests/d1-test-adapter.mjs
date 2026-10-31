import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

// Executa o SQL real e os triggers em SQLite. Em produção, D1 fornece batch transacional.
export class TestD1 {
  constructor(path = ":memory:", initialize = true) {
    this.sqlite = new DatabaseSync(path);
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    if (initialize) this.sqlite.exec(readFileSync(new URL("../backend/migrations/0001_round_robin.sql", import.meta.url), "utf8"));
  }
  prepare(sql) {
    const db = this;
    return {
      sql, params: [],
      bind(...params) { this.params = params; return this; },
      async first() { return db.sqlite.prepare(sql).get(...this.params) || null; },
      async all() { return { results: db.sqlite.prepare(sql).all(...this.params) }; },
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement, index) => {
        const result = { success: true, results: this.sqlite.prepare(statement.sql).all(...statement.params) };
        if (index === 0 && this.failAllocation && statement.sql.includes("INSERT INTO allocations")) throw new Error("Simulated transaction failure");
        return result;
      });
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
  state() { return this.sqlite.prepare("SELECT * FROM queue_state").get(); }
  rows(table) { return this.sqlite.prepare(`SELECT * FROM ${table}`).all(); }
  close() { this.sqlite.close(); }
}
