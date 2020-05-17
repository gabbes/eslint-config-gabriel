import * as path from "path";
import { migratorosaurus } from "migratorosaurus";
import { pool } from "./database";
import { app } from "./app";

(async () => {
  const env = process.env.NODE_ENV || "production";
  const host = process.env.HOST || "0.0.0.0";
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  await migratorosaurus(pool, {
    directory: path.resolve("migrations"),
    log: console.log,
  });

  app.listen(port, host, () => {
    console.log(`🚀  Running ${env} build @ ${host}:${port}`);
  });
})();
