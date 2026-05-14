import { prisma } from "../../prisma";

type StudyInfoWriteData = {
  category: string;
  content: string;
  encryptedKey: string | null;
  encryptedPayload: string | null;
  encryptionIv: string | null;
  sortOrder: number;
  title: string;
};

export const studyInfoRepository = {
  listVisible(userId: number | null) {
    const ownerFilter = { OR: [{ ownerId: null }, ...(userId ? [{ ownerId: userId }] : [])] };

    return Promise.all([
      prisma.studyInfo.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        where: ownerFilter,
      }),
      prisma.studyModule.findMany({
        orderBy: { title: "asc" },
        where: ownerFilter,
      }),
    ]);
  },

  createForOwner(ownerId: number, data: StudyInfoWriteData) {
    return prisma.studyInfo.create({
      data: {
        ...data,
        ownerId,
      },
    });
  },
};
