import assert from "node:assert/strict";
import test from "node:test";
import legacySeedData from "../../prisma/curriculum-spo-legacy-data";
import curriculumSeedData from "../../prisma/curriculum-seed-data";
import { validateCurriculumSnapshot } from "../src/modules/curriculum/curriculum.validation";

const { legacyCurriculumSeeds } = legacySeedData;
const { curriculumSeed } = curriculumSeedData;

test("validates the seeded AIN curriculum snapshots", () => {
  const snapshots = [
    {
      electiveSlots: curriculumSeed.electiveSlots,
      modules: curriculumSeed.modules,
      semesters: curriculumSeed.semesters,
      version: "SPO14",
    },
    ...legacyCurriculumSeeds.map((seed) => ({
      electiveSlots: seed.electiveSlots,
      modules: seed.modules,
      semesters: seed.semesters,
      version: seed.spoVersion.code,
    })),
  ];

  for (const snapshot of snapshots) {
    assert.doesNotThrow(
      () =>
        validateCurriculumSnapshot({
          electiveSlots: snapshot.electiveSlots,
          modules: snapshot.modules.map((module) => ({
            credits: module.credits,
            id: module.id,
            semesterNumber: module.semesterNumber,
            sourceRefs: module.sourceRefs,
          })),
          program: curriculumSeed.program,
          semesters: snapshot.semesters,
        }),
      snapshot.version,
    );
  }
});
