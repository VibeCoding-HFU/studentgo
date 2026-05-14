import { prisma } from "../../prisma";

type ContactWriteData = {
  email: string;
  name: string;
  phone: string | null;
  role: string;
  room: string | null;
};

export const contactRepository = {
  listVisible(userId: number | null) {
    return prisma.contact.findMany({
      orderBy: { name: "asc" },
      where: {
        OR: [{ ownerId: null }, ...(userId ? [{ ownerId: userId }] : [])],
      },
    });
  },

  createForOwner(ownerId: number, data: ContactWriteData) {
    return prisma.contact.create({
      data: {
        ...data,
        ownerId,
      },
    });
  },
};
