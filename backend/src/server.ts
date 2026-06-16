import { app, port, startMaintenanceTasks } from "./app";
import { prisma } from "./prisma";

const server = app.listen(port, () => {
  console.log(`StudentGo backend listening on http://localhost:${port}`);
  startMaintenanceTasks();
});

let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
