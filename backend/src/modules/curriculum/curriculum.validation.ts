type CurriculumSnapshot = {
  electiveSlots: Array<{ credits: number; id: string; sourceRefs: Array<unknown> }>;
  modules: Array<{
    credits: number;
    id: string;
    semesterNumber: number;
    sourceRefs: Array<unknown>;
  }>;
  program: {
    basicStudySemesters: number;
    regularSemesters: number;
    totalCredits: number;
  };
  semesters: Array<{ credits: number; number: number }>;
};

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateCurriculumSnapshot(snapshot: CurriculumSnapshot) {
  const basicSemesterNumbers = new Set(
    Array.from({ length: snapshot.program.basicStudySemesters }, (_value, index) => index + 1),
  );
  const advancedSemesterNumbers = new Set(
    Array.from(
      { length: snapshot.program.regularSemesters - snapshot.program.basicStudySemesters },
      (_value, index) => snapshot.program.basicStudySemesters + index + 1,
    ),
  );

  const basicSemesterCredits = snapshot.semesters
    .filter((semester) => basicSemesterNumbers.has(semester.number))
    .reduce((sum, semester) => sum + semester.credits, 0);
  const advancedSemesterCredits = snapshot.semesters
    .filter((semester) => advancedSemesterNumbers.has(semester.number))
    .reduce((sum, semester) => sum + semester.credits, 0);
  const totalSemesterCredits = snapshot.semesters.reduce((sum, semester) => sum + semester.credits, 0);

  assertCondition(basicSemesterCredits === 60, `Expected 60 LP in basic study semesters, got ${basicSemesterCredits}.`);
  assertCondition(advancedSemesterCredits === 150, `Expected 150 LP in advanced study semesters, got ${advancedSemesterCredits}.`);
  assertCondition(totalSemesterCredits === snapshot.program.totalCredits, `Expected ${snapshot.program.totalCredits} LP overall, got ${totalSemesterCredits}.`);

  const internshipCredits = snapshot.modules
    .filter((module) => module.id.endsWith("praktisches-studiensemester"))
    .reduce((sum, module) => sum + module.credits, 0);
  const thesisCredits = snapshot.modules
    .filter((module) => module.id.endsWith("thesis"))
    .reduce((sum, module) => sum + module.credits, 0);

  assertCondition(internshipCredits === 30, `Expected 30 LP for the internship block, got ${internshipCredits}.`);
  assertCondition(thesisCredits === 18, `Expected 18 LP for the thesis block, got ${thesisCredits}.`);

  for (const module of snapshot.modules) {
    assertCondition(module.credits > 0, `Module ${module.id} is missing credits.`);
    assertCondition(module.sourceRefs.length > 0, `Module ${module.id} is missing source references.`);
  }

  for (const slot of snapshot.electiveSlots) {
    assertCondition(slot.credits === 6, `Elective slot ${slot.id} must have 6 LP, got ${slot.credits}.`);
    assertCondition(slot.sourceRefs.length > 0, `Elective slot ${slot.id} is missing source references.`);
  }
}
