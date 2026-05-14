import { studyInfoData } from "../../shared/domain-data";
import { studyInfoRepository } from "./study-info.repository";

export async function listStudyInfo(userId: number | null) {
  const [spo, modules] = await studyInfoRepository.listVisible(userId);
  return { modules, spo };
}

export function createStudyInfo(userId: number, payload: Record<string, unknown>) {
  return studyInfoRepository.createForOwner(userId, studyInfoData(payload));
}
