import { prisma } from "../../../prisma";
import { getOrCreateCanteen, getOrCreateScheduleDay } from "../../../shared/db-helpers";
import {
  contactData,
  deadlineData,
  lessonData,
  mealData,
  parsePayload,
  studyInfoData,
} from "../../../shared/domain-data";
import { badRequest } from "../../../shared/http/http-error";
import { emitDomainEvent } from "../../../shared/events/domain-events";

export async function approveChangeRequest(input: { adminId: number; requestId: number }) {
  const changeRequest = await prisma.$transaction(async (transaction) => {
    const request = await transaction.managementChangeRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request || request.status !== "PENDING") {
      throw badRequest("Change request is not pending.");
    }

    const payload = parsePayload(request.payloadJson);

    if (request.entity === "CONTACT") {
      if (request.action === "CREATE") {
        await transaction.contact.create({ data: contactData(payload) });
      }

      if (request.action === "UPDATE" && request.targetId) {
        await transaction.contact.update({ data: contactData(payload), where: { id: request.targetId } });
      }

      if (request.action === "DELETE" && request.targetId) {
        await transaction.contact.delete({ where: { id: request.targetId } });
      }
    }

    if (request.entity === "DEADLINE") {
      if (request.action === "CREATE") {
        await transaction.deadline.create({ data: deadlineData(payload) });
      }

      if (request.action === "UPDATE" && request.targetId) {
        await transaction.deadline.update({ data: deadlineData(payload), where: { id: request.targetId } });
      }

      if (request.action === "DELETE" && request.targetId) {
        await transaction.deadline.delete({ where: { id: request.targetId } });
      }
    }

    if (request.entity === "STUDY_INFO") {
      if (request.action === "CREATE") {
        await transaction.studyInfo.create({ data: studyInfoData(payload) });
      }

      if (request.action === "UPDATE" && request.targetId) {
        await transaction.studyInfo.update({ data: studyInfoData(payload), where: { id: request.targetId } });
      }

      if (request.action === "DELETE" && request.targetId) {
        await transaction.studyInfo.delete({ where: { id: request.targetId } });
      }
    }

    if (request.entity === "MEAL") {
      const canteen = await getOrCreateCanteen(typeof payload.canteenName === "string" ? payload.canteenName : "Mensa", transaction as typeof prisma);

      if (request.action === "CREATE") {
        await transaction.mealPlan.create({ data: mealData(payload, canteen.id) });
      }

      if (request.action === "UPDATE" && request.targetId) {
        await transaction.mealPlan.update({ data: mealData(payload, canteen.id), where: { id: request.targetId } });
      }

      if (request.action === "DELETE" && request.targetId) {
        await transaction.mealPlan.delete({ where: { id: request.targetId } });
      }
    }

    if (request.entity === "LESSON") {
      const day = await getOrCreateScheduleDay(typeof payload.day === "string" ? payload.day : "Allgemein", transaction as typeof prisma);

      if (request.action === "CREATE") {
        await transaction.lesson.create({ data: lessonData(payload, day.id) });
      }

      if (request.action === "UPDATE" && request.targetId) {
        await transaction.lesson.update({ data: lessonData(payload, day.id), where: { id: request.targetId } });
      }

      if (request.action === "DELETE" && request.targetId) {
        await transaction.lesson.delete({ where: { id: request.targetId } });
      }
    }

    return transaction.managementChangeRequest.update({
      data: {
        reviewedAt: new Date(),
        reviewedById: input.adminId,
        status: "APPROVED",
      },
      where: { id: input.requestId },
    });
  });

  await emitDomainEvent({
    type: "change-request.approved",
    payload: { requestId: changeRequest.id, reviewedById: input.adminId },
  });

  return changeRequest;
}
