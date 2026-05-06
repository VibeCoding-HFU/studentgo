import "dotenv/config";
import { prisma } from "../backend/src/prisma";

async function main() {
  await prisma.managementChangeRequest.deleteMany();
  await prisma.pendingAccount.deleteMany();
  await prisma.session.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.scheduleDay.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.canteen.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.studyInfo.deleteMany();
  await prisma.studyModule.deleteMany();
  await prisma.userPublicKey.deleteMany();
  await prisma.contact.deleteMany();

  console.log("Cleared StudentGo sample data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
