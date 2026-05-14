import { prisma } from "../../prisma";

type DeadlineWriteData = {
  date: Date;
  description: string | null;
  title: string;
};

export const deadlineRepository = {
  listAll() {
    return prisma.deadline.findMany({ orderBy: { date: "asc" } });
  },

  create(data: DeadlineWriteData) {
    return prisma.deadline.create({ data });
  },
};
