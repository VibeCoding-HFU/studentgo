import { app, port, startMaintenanceTasks } from "./app";
import { prisma } from "./prisma";

const server = app.listen(port, () => {
  console.log(`StudentGo backend listening on http://localhost:${port}`);
  startMaintenanceTasks();
});

process.on("SIGINT", async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
