import assert from "node:assert/strict";
import test from "node:test";
import { curriculumSeed } from "../../prisma/curriculum-seed-data";
import { validateCurriculumSnapshot } from "../src/modules/curriculum/curriculum.validation";

test("validates the seeded AIN curriculum snapshot", () => {
  assert.doesNotThrow(() =>
    validateCurriculumSnapshot({
      electiveSlots: curriculumSeed.electiveSlots,
      modules: curriculumSeed.modules.map((module) => ({
        credits: module.credits,
        id: module.id,
        semesterNumber: module.semesterNumber,
        sourceRefs: module.sourceRefs,
      })),
      program: curriculumSeed.program,
      semesters: curriculumSeed.semesters,
    }),
  );
});
