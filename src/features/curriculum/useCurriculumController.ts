import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { fetchCurriculumBundle, fetchCurriculumGraph } from './api';
import type { CurriculumElectiveSlot, CurriculumGraph, CurriculumModule, CurriculumProgram, CurriculumSemester, CurriculumSpecialization, CurriculumSpoVersion, CurriculumTag } from './types';

type CurriculumViewMode = 'graph' | 'modules' | 'semesters';
type ModuleAreaFilter = 'ADVANCED' | 'ALL' | 'BASIC' | 'INTERNSHIP' | 'SPECIALIZATION' | 'THESIS';

export function useCurriculumController() {
  const [program, setProgram] = useState<CurriculumProgram | null>(null);
  const [semesters, setSemesters] = useState<CurriculumSemester[]>([]);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [specializations, setSpecializations] = useState<CurriculumSpecialization[]>([]);
  const [spoVersions, setSpoVersions] = useState<CurriculumSpoVersion[]>([]);
  const [tags, setTags] = useState<CurriculumTag[]>([]);
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error, setError] = useState('');
  const [graphError, setGraphError] = useState('');
  const [viewMode, setViewMode] = useState<CurriculumViewMode>('semesters');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('ALL');
  const [selectedSpoVersion, setSelectedSpoVersionState] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | 'ALL'>('ALL');
  const [selectedArea, setSelectedArea] = useState<ModuleAreaFilter>('ALL');
  const [selectedCredits, setSelectedCredits] = useState<number | 'ALL'>('ALL');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [catalogOnly, setCatalogOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [includeGraphTags, setIncludeGraphTags] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery);

  const loadBundle = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const bundle = await fetchCurriculumBundle(selectedSpoVersion);
      const activeSpoVersion = bundle.program.spoVersion?.id ?? bundle.spoVersions.find((version) => version.isDefault)?.id ?? bundle.spoVersions[0]?.id ?? null;

      setProgram(bundle.program);
      setSemesters(bundle.semesters);
      setModules(bundle.modules);
      setSpecializations(bundle.specializations);
      setSpoVersions(bundle.spoVersions);
      setTags(bundle.tags);
      setSelectedModuleId(null);

      if (!selectedSpoVersion && activeSpoVersion) {
        setSelectedSpoVersionState(activeSpoVersion);
      }

      setSelectedSpecialization((current) =>
        current !== 'ALL' && !bundle.specializations.some((specialization) => specialization.code === current) ? 'ALL' : current,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Curriculum konnte nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSpoVersion]);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setGraphError('');

    try {
      setGraph(
        await fetchCurriculumGraph({
          includeTags: includeGraphTags,
          semester: typeof selectedSemester === 'number' ? selectedSemester : null,
          specialization: selectedSpecialization === 'ALL' ? null : selectedSpecialization,
          spoVersion: selectedSpoVersion,
        }),
      );
    } catch (caughtError) {
      setGraphError(caughtError instanceof Error ? caughtError.message : 'Graph konnte nicht geladen werden.');
    } finally {
      setGraphLoading(false);
    }
  }, [includeGraphTags, selectedSemester, selectedSpecialization, selectedSpoVersion]);

  useEffect(() => {
    loadBundle();
  }, [loadBundle]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const spotlightTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.category === 'content')
        .sort((left, right) => right.moduleCount - left.moduleCount || left.label.localeCompare(right.label))
        .slice(0, 10),
    [tags],
  );

  const electiveCatalogModules = useMemo(() => {
    const candidates = new Map<string, CurriculumModule>();

    for (const semester of semesters) {
      for (const slot of semester.electiveSlots) {
        for (const candidate of slot.candidateModules) {
          const module = modules.find((entry) => entry.id === candidate.id);

          if (module) {
            candidates.set(module.id, module);
          }
        }
      }
    }

    return Array.from(candidates.values()).sort((left, right) => left.title.localeCompare(right.title));
  }, [modules, semesters]);

  const electiveCatalogSlots = useMemo(
    () =>
      semesters
        .flatMap((semester) => semester.electiveSlots)
        .filter((slot): slot is CurriculumElectiveSlot => slot.kind === 'FACULTY_CATALOG' && slot.candidateModules.length > 0),
    [semesters],
  );

  const filteredModules = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return modules.filter((module) => {
      if (catalogOnly && !electiveCatalogModules.some((candidate) => candidate.id === module.id)) {
        return false;
      }

      if (typeof selectedSemester === 'number' && module.semester?.number !== selectedSemester) {
        return false;
      }

      if (selectedSpecialization !== 'ALL' && !module.specializations.some((entry) => entry.code === selectedSpecialization)) {
        return false;
      }

      if (selectedArea !== 'ALL' && module.area !== selectedArea) {
        return false;
      }

      if (typeof selectedCredits === 'number' && module.credits !== selectedCredits) {
        return false;
      }

      if (selectedAssessment !== 'ALL' && !module.assessments.some((assessment) => assessment.label === selectedAssessment || assessment.code === selectedAssessment)) {
        return false;
      }

      if (selectedTag !== 'ALL' && !module.tags.some((tag) => tag.id === selectedTag)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        module.title,
        module.area,
        module.specializations.map((entry) => entry.code).join(' '),
        module.tags.map((tag) => tag.label).join(' '),
        module.assessments.map((assessment) => assessment.label).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [catalogOnly, deferredSearch, electiveCatalogModules, modules, selectedArea, selectedAssessment, selectedCredits, selectedSemester, selectedSpecialization, selectedTag]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  const assessmentOptions = useMemo(
    () =>
      Array.from(
        new Set(modules.flatMap((module) => module.assessments.map((assessment) => assessment.label))),
      ).sort((left, right) => left.localeCompare(right)),
    [modules],
  );

  const creditOptions = useMemo(
    () => Array.from(new Set(modules.map((module) => module.credits))).sort((left, right) => left - right),
    [modules],
  );

  const areaOptions: ModuleAreaFilter[] = ['ALL', 'BASIC', 'ADVANCED', 'SPECIALIZATION', 'INTERNSHIP', 'THESIS'];

  return {
    areaOptions,
    assessmentOptions,
    creditOptions,
    electiveCatalogModules,
    electiveCatalogSlots,
    error,
    filteredModules,
    graph,
    graphError,
    graphLoading,
    includeGraphTags,
    isLoading,
    program,
    searchQuery,
    selectedArea,
    selectedAssessment,
    selectedCredits,
    selectedModule,
    selectedSemester,
    selectedSpecialization,
    selectedSpoVersion,
    selectedTag,
    semesters,
    setCatalogOnly: (value: boolean) => startTransition(() => setCatalogOnly(value)),
    setIncludeGraphTags: (value: boolean) => startTransition(() => setIncludeGraphTags(value)),
    setSearchQuery,
    setSelectedArea: (value: ModuleAreaFilter) => startTransition(() => setSelectedArea(value)),
    setSelectedAssessment: (value: string) => startTransition(() => setSelectedAssessment(value)),
    setSelectedCredits: (value: number | 'ALL') => startTransition(() => setSelectedCredits(value)),
    setSelectedModuleId,
    setSelectedSemester: (value: number | 'ALL') => startTransition(() => setSelectedSemester(value)),
    setSelectedSpecialization: (value: string) => startTransition(() => setSelectedSpecialization(value)),
    setSelectedSpoVersion: (value: string) =>
      startTransition(() => {
        setSelectedSpoVersionState(value);
        setSelectedSemester('ALL');
        setSelectedSpecialization('ALL');
        setCatalogOnly(false);
        setSelectedModuleId(null);
      }),
    setSelectedTag: (value: string) => startTransition(() => setSelectedTag(value)),
    setViewMode: (value: CurriculumViewMode) => startTransition(() => setViewMode(value)),
    specializations,
    spoVersions,
    spotlightTags,
    viewMode,
    catalogOnly,
  };
}
