import { Express } from "express";
import {
  getProgram,
  getProgramGraph,
  getProgramModule,
  listElectiveSlots,
  listModules,
  listProgramSemesters,
  listSpecializations,
  listTags,
  parseGraphFilters,
  parseModuleFilters,
} from "./curriculum.service";

const AIN_PROGRAM_CODE = "AIN";

function queryValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function registerCurriculumRoutes(app: Express) {
  app.get("/api/curriculum/programs/ain", async (_request, response) => {
    response.json(await getProgram(AIN_PROGRAM_CODE));
  });

  app.get("/api/curriculum/programs/ain/semesters", async (_request, response) => {
    response.json(await listProgramSemesters(AIN_PROGRAM_CODE));
  });

  app.get("/api/curriculum/graph", async (request, response) => {
    response.json(
      await getProgramGraph(
        AIN_PROGRAM_CODE,
        parseGraphFilters({
          includeTags: queryValue(request.query.includeTags),
          semester: queryValue(request.query.semester),
          specialization: queryValue(request.query.specialization),
        }),
      ),
    );
  });

  app.get("/api/curriculum/modules", async (request, response) => {
    response.json(
      await listModules(
        AIN_PROGRAM_CODE,
        parseModuleFilters({
          area: queryValue(request.query.area),
          assessmentType: queryValue(request.query.assessmentType),
          credits: queryValue(request.query.credits),
          language: queryValue(request.query.language),
          semester: queryValue(request.query.semester),
          specialization: queryValue(request.query.specialization),
          tag: queryValue(request.query.tag),
        }),
      ),
    );
  });

  app.get("/api/curriculum/modules/:id", async (request, response) => {
    response.json(await getProgramModule(AIN_PROGRAM_CODE, request.params.id));
  });

  app.get("/api/curriculum/specializations", async (_request, response) => {
    response.json(await listSpecializations(AIN_PROGRAM_CODE));
  });

  app.get("/api/curriculum/elective-slots", async (_request, response) => {
    response.json(await listElectiveSlots(AIN_PROGRAM_CODE));
  });

  app.get("/api/curriculum/tags", async (_request, response) => {
    response.json(await listTags(AIN_PROGRAM_CODE));
  });
}
