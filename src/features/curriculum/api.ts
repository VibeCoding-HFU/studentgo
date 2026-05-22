import { apiJson } from '@/src/shared/api/client';
import type {
  CurriculumGraph,
  CurriculumModule,
  CurriculumProgram,
  CurriculumSemester,
  CurriculumSpecialization,
  CurriculumTag,
} from './types';

function graphQuery(params: { includeTags: boolean; semester?: number | null; specialization?: string | null }) {
  const search = new URLSearchParams();

  if (params.includeTags) {
    search.set('includeTags', 'true');
  }

  if (typeof params.semester === 'number') {
    search.set('semester', String(params.semester));
  }

  if (params.specialization) {
    search.set('specialization', params.specialization);
  }

  const query = search.toString();
  return query ? `/api/curriculum/graph?${query}` : '/api/curriculum/graph';
}

export async function fetchCurriculumBundle() {
  const [program, semesters, modules, specializations, tags] = await Promise.all([
    apiJson<CurriculumProgram>('/api/curriculum/programs/ain'),
    apiJson<CurriculumSemester[]>('/api/curriculum/programs/ain/semesters'),
    apiJson<CurriculumModule[]>('/api/curriculum/modules'),
    apiJson<CurriculumSpecialization[]>('/api/curriculum/specializations'),
    apiJson<CurriculumTag[]>('/api/curriculum/tags'),
  ]);

  return {
    modules,
    program,
    semesters,
    specializations,
    tags,
  };
}

export async function fetchCurriculumGraph(params: {
  includeTags: boolean;
  semester?: number | null;
  specialization?: string | null;
}) {
  return apiJson<CurriculumGraph>(graphQuery(params));
}
