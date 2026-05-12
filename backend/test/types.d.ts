declare module "better-sqlite3" {
  class Database {
    constructor(path: string);
    close(): void;
    exec(sql: string): void;
  }

  export default Database;
}

