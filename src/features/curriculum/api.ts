import { apiJson } from '@/src/shared/api/client';
import type {
  CurriculumGraph,
  CurriculumModule,
  CurriculumProgram,
  CurriculumSemester,
  CurriculumSpecialization,
  CurriculumSpoVersion,
  CurriculumTag,
} from './types';

function curriculumQuery(path: string, params: { spoVersion?: string | null }) {
  const search = new URLSearchParams();

  if (params.spoVersion) {
    search.set('spoVersion', params.spoVersion);
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function graphQuery(params: { includeTags: boolean; semester?: number | null; specialization?: string | null; spoVersion?: string | null }) {
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

  if (params.spoVersion) {
    search.set('spoVersion', params.spoVersion);
  }

  const query = search.toString();
  return query ? `/api/curriculum/graph?${query}` : '/api/curriculum/graph';
}

export async function fetchCurriculumBundle(spoVersion?: string | null) {
  const [spoVersions, program, semesters, modules, specializations, tags] = await Promise.all([
    apiJson<CurriculumSpoVersion[]>('/api/curriculum/spo-versions'),
    apiJson<CurriculumProgram>(curriculumQuery('/api/curriculum/programs/ain', { spoVersion })),
    apiJson<CurriculumSemester[]>(curriculumQuery('/api/curriculum/programs/ain/semesters', { spoVersion })),
    apiJson<CurriculumModule[]>(curriculumQuery('/api/curriculum/modules', { spoVersion })),
    apiJson<CurriculumSpecialization[]>(curriculumQuery('/api/curriculum/specializations', { spoVersion })),
    apiJson<CurriculumTag[]>(curriculumQuery('/api/curriculum/tags', { spoVersion })),
  ]);

  return {
    modules,
    program,
    semesters,
    specializations,
    spoVersions,
    tags,
  };
}

export async function fetchCurriculumGraph(params: {
  includeTags: boolean;
  semester?: number | null;
  specialization?: string | null;
  spoVersion?: string | null;
}) {
  return apiJson<CurriculumGraph>(graphQuery(params));
}
