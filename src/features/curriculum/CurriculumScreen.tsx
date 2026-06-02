import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { CurriculumGraph } from './components/CurriculumGraph';
import { baseStyles } from './styles';
import type { CurriculumModule } from './types';
import { useCurriculumController } from './useCurriculumController';

function areaLabel(area: string) {
  return {
    ADVANCED: 'Hauptstudium',
    BASIC: 'Grundstudium',
    INTERNSHIP: 'Praxis',
    SPECIALIZATION: 'Vertiefung',
    THESIS: 'Thesis',
  }[area] ?? area;
}

function semesterBandColor(area: string) {
  return {
    ADVANCED: '#0B6B49',
    BASIC: '#1D4ED8',
    INTERNSHIP: '#D92D20',
    THESIS: '#7A5AF8',
  }[area] ?? '#0F766E';
}

function ModulePreview({
  module,
  highlighted,
  onPress,
}: {
  highlighted?: boolean;
  module: CurriculumModule;
  onPress: () => void;
}) {
  const styles = useThemedStyles(baseStyles);

  return (
    <Pressable onPress={onPress} style={[styles.moduleTile, highlighted && styles.moduleTileHighlight]}>
      <View style={styles.moduleTileTop}>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleCredits}>{`${module.credits} LP`}</Text>
      </View>
      <Text style={styles.moduleMeta}>
        {`${areaLabel(module.area)} • ${module.assessments.map((assessment) => assessment.label).join(', ')}`}
      </Text>
      <View style={styles.tagRow}>
        {module.tags.slice(0, 4).map((tag) => (
          <View key={`${module.id}-${tag.id}`} style={styles.miniTag}>
            <Text style={styles.miniTagText}>{tag.label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function CurriculumScreen() {
  const styles = useThemedStyles(baseStyles);
  const controller = useCurriculumController();
  const activeSpoVersion = controller.selectedSpoVersion ?? controller.program?.spoVersion?.id ?? null;

  if (controller.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBlock}>
          <ActivityIndicator color="#0B6B49" size="large" />
          <Text style={styles.loadingText}>Curriculum wird geladen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroGlowLarge} />
            <View style={styles.heroGlowSmall} />
            <Text style={styles.heroKicker}>Curriculum Explorer</Text>
            <Text style={styles.heroTitle}>{controller.program ? `${controller.program.name} ${controller.program.degree}` : 'Curriculum'}</Text>
            <Text style={styles.heroSubtitle}>
              Semesterstruktur, Vertiefungen, Pruefungsformen und Modulbeziehungen in einer Ansicht, inklusive Quellenstand aus SPO und Modulkatalog.
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{`${controller.program?.totalCredits ?? 0} LP gesamt`}</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{`${controller.program?.regularSemesters ?? 0} Lehrplansemester`}</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  {controller.program?.spoVersion?.label ?? controller.program?.sourceRefs[0]?.document.versionLabel ?? 'Quellen hinterlegt'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            {controller.error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Curriculum konnte nicht geladen werden</Text>
                <Text style={styles.errorText}>{controller.error}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ansicht</Text>
                <Text style={styles.sectionMeta}>{`${controller.filteredModules.length} Module im Explorer`}</Text>
              </View>
              {controller.spoVersions.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <View style={styles.filterRow}>
                    {controller.spoVersions.map((version) => (
                      <Pressable
                        key={version.id}
                        onPress={() => controller.setSelectedSpoVersion(version.id)}
                        style={[styles.chip, activeSpoVersion === version.id && styles.chipActive]}>
                        <Text style={[styles.chipText, activeSpoVersion === version.id && styles.chipTextActive]}>
                          {version.code}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
              <View style={styles.segmentRow}>
                {[
                  ['semesters', 'Semester'],
                  ['modules', 'Module'],
                  ['graph', 'Graph'],
                ].map(([id, label]) => (
                  <Pressable
                    key={id}
                    onPress={() => controller.setViewMode(id as 'graph' | 'modules' | 'semesters')}
                    style={[styles.segmentButton, controller.viewMode === id && styles.segmentButtonActive]}>
                    <Text style={[styles.segmentText, controller.viewMode === id && styles.segmentTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterRow}>
                  <Pressable
                    onPress={() => controller.setSelectedSemester('ALL')}
                    style={[styles.chip, controller.selectedSemester === 'ALL' && styles.chipActive]}>
                    <Text style={[styles.chipText, controller.selectedSemester === 'ALL' && styles.chipTextActive]}>Alle Semester</Text>
                  </Pressable>
                  {controller.semesters.map((semester) => (
                    <Pressable
                      key={semester.id}
                      onPress={() => controller.setSelectedSemester(semester.number)}
                      style={[styles.chip, controller.selectedSemester === semester.number && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.selectedSemester === semester.number && styles.chipTextActive]}>
                        {`Sem ${semester.number}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterRow}>
                  <Pressable
                    onPress={() => controller.setSelectedSpecialization('ALL')}
                    style={[styles.chip, controller.selectedSpecialization === 'ALL' && styles.chipActive]}>
                    <Text style={[styles.chipText, controller.selectedSpecialization === 'ALL' && styles.chipTextActive]}>Alle Vertiefungen</Text>
                  </Pressable>
                  {controller.specializations.map((specialization) => (
                    <Pressable
                      key={specialization.id}
                      onPress={() => controller.setSelectedSpecialization(specialization.code)}
                      style={[styles.chip, controller.selectedSpecialization === specialization.code && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.selectedSpecialization === specialization.code && styles.chipTextActive]}>
                        {specialization.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {controller.viewMode === 'semesters' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Semesterplan</Text>
                  <Text style={styles.sectionMeta}>Pflichtmodule, Slots und Vertiefungen im Studienverlauf</Text>
                </View>
                <Text style={styles.sectionText}>
                  Vertiefungsmodule werden bei aktivem Fokus hervorgehoben. Wahlpflichtslots bleiben bewusst als Slots sichtbar und werden nicht mit erfundenen Modulen befuellt.
                </Text>
                {controller.electiveCatalogModules.length > 0 ? (
                  <View style={[styles.cardMuted, { marginTop: 14 }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.slotTitle}>WPV-Katalog aus dem Modulkatalog</Text>
                      <Text style={styles.sectionMeta}>{`${controller.electiveCatalogModules.length} Kandidaten`}</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      Diese Faecher sind jetzt direkt an die Fakultätskatalog-Slots angebunden, damit du passende WPV-Module schneller findest.
                    </Text>
                    <View style={styles.slotCandidateWrap}>
                      {controller.electiveCatalogModules.map((module) => (
                        <Pressable
                          key={module.id}
                          onPress={() => controller.setSelectedModuleId(module.id)}
                          style={styles.slotCandidateChip}>
                          <Text style={styles.slotCandidateText}>{module.title}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                <View style={styles.semesterGrid}>
                  {controller.semesters
                    .filter((semester) => controller.selectedSemester === 'ALL' || semester.number === controller.selectedSemester)
                    .map((semester) => (
                      <View key={semester.id} style={styles.semesterCard}>
                        <View style={[styles.semesterBand, { backgroundColor: semesterBandColor(semester.area) }]} />
                        <View style={styles.semesterBody}>
                          <View style={styles.semesterTop}>
                            <View>
                              <Text style={styles.semesterLabel}>{semester.title}</Text>
                              <Text style={styles.semesterSub}>{areaLabel(semester.area)}</Text>
                            </View>
                            <View>
                              <Text style={styles.semesterCreditsLabel}>Umfang</Text>
                              <Text style={styles.semesterCredits}>{`${semester.credits} LP`}</Text>
                            </View>
                          </View>
                          <View style={styles.moduleStack}>
                            {semester.modules.map((module) => (
                              <ModulePreview
                                highlighted={
                                  controller.selectedSpecialization !== 'ALL'
                                  && module.specializations.some((entry) => entry.code === controller.selectedSpecialization)
                                }
                                key={module.id}
                                module={module}
                                onPress={() => controller.setSelectedModuleId(module.id)}
                              />
                            ))}
                          </View>
                          {semester.electiveSlots.map((slot) => (
                            <View key={slot.id} style={styles.slotTile}>
                              <Text style={styles.slotTitle}>{slot.name}</Text>
                              <Text style={styles.slotMeta}>{`${slot.credits} LP • ${slot.kind === 'FREE_CHOICE' ? 'freie Wahl' : 'Fakultaetskatalog'}`}</Text>
                              {slot.description ? <Text style={styles.moduleMeta}>{slot.description}</Text> : null}
                              {slot.candidateModules.length > 0 ? (
                                <View style={styles.slotCandidateWrap}>
                                  {slot.candidateModules.map((candidate) => (
                                    <Pressable
                                      key={`${slot.id}-${candidate.id}`}
                                      onPress={() => controller.setSelectedModuleId(candidate.id)}
                                      style={styles.slotCandidateChip}>
                                      <Text style={styles.slotCandidateText}>{candidate.title}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                </View>
              </View>
            ) : null}

            {controller.viewMode === 'modules' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Module Explorer</Text>
                  <Text style={styles.sectionMeta}>Suche, Filter und schnelle Detailansicht</Text>
                </View>
                <View style={styles.searchBox}>
                  <MaterialIcons color="#667085" name="search" size={22} />
                  <TextInput
                    onChangeText={controller.setSearchQuery}
                    placeholder="Nach Modul, Tag oder Pruefungsform suchen"
                    placeholderTextColor="#98A2B3"
                    style={styles.searchInput}
                    value={controller.searchQuery}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <View style={styles.filterRow}>
                    {controller.areaOptions.map((area) => (
                      <Pressable
                        key={area}
                        onPress={() => controller.setSelectedArea(area)}
                        style={[styles.chip, controller.selectedArea === area && styles.chipActive]}>
                        <Text style={[styles.chipText, controller.selectedArea === area && styles.chipTextActive]}>
                          {area === 'ALL' ? 'Alle Bereiche' : areaLabel(area)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <View style={styles.filterRow}>
                    <Pressable
                      onPress={() => controller.setSelectedCredits('ALL')}
                      style={[styles.chip, controller.selectedCredits === 'ALL' && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.selectedCredits === 'ALL' && styles.chipTextActive]}>Alle LP</Text>
                    </Pressable>
                    {controller.creditOptions.map((credits) => (
                      <Pressable
                        key={credits}
                        onPress={() => controller.setSelectedCredits(credits)}
                        style={[styles.chip, controller.selectedCredits === credits && styles.chipActive]}>
                        <Text style={[styles.chipText, controller.selectedCredits === credits && styles.chipTextActive]}>
                          {`${credits} LP`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <View style={styles.filterRow}>
                    <Pressable
                      onPress={() => controller.setCatalogOnly(!controller.catalogOnly)}
                      style={[styles.chip, controller.catalogOnly && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.catalogOnly && styles.chipTextActive]}>
                        {controller.catalogOnly ? 'Nur WPV-Katalog' : 'WPV-Katalog aus'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => controller.setSelectedAssessment('ALL')}
                      style={[styles.chip, controller.selectedAssessment === 'ALL' && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.selectedAssessment === 'ALL' && styles.chipTextActive]}>Alle Pruefungsformen</Text>
                    </Pressable>
                    {controller.assessmentOptions.map((assessment) => (
                      <Pressable
                        key={assessment}
                        onPress={() => controller.setSelectedAssessment(assessment)}
                        style={[styles.chip, controller.selectedAssessment === assessment && styles.chipActive]}>
                        <Text style={[styles.chipText, controller.selectedAssessment === assessment && styles.chipTextActive]}>
                          {assessment}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <View style={styles.filterRow}>
                    <Pressable
                      onPress={() => controller.setSelectedTag('ALL')}
                      style={[styles.chip, controller.selectedTag === 'ALL' && styles.chipActive]}>
                      <Text style={[styles.chipText, controller.selectedTag === 'ALL' && styles.chipTextActive]}>Top Tags</Text>
                    </Pressable>
                    {controller.spotlightTags.map((tag) => (
                      <Pressable
                        key={tag.id}
                        onPress={() => controller.setSelectedTag(tag.id)}
                        style={[styles.chip, controller.selectedTag === tag.id && styles.chipActive]}>
                        <Text style={[styles.chipText, controller.selectedTag === tag.id && styles.chipTextActive]}>
                          {tag.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <View style={[styles.moduleStack, { marginTop: 16 }]}>
                  {controller.filteredModules.length === 0 ? (
                    <Text style={styles.emptyState}>Keine Module passen auf die aktuelle Filterkombination.</Text>
                  ) : null}
                  {controller.filteredModules.map((module) => (
                    <ModulePreview key={module.id} module={module} onPress={() => controller.setSelectedModuleId(module.id)} />
                  ))}
                </View>
              </View>
            ) : null}

            {controller.viewMode === 'graph' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Curriculum Graph</Text>
                  <Text style={styles.sectionMeta}>Semester, Vertiefungen und Prerequisites als Netz</Text>
                </View>
                <Text style={styles.sectionText}>
                  Die Graphansicht zeigt echte prerequisite-Kanten aus dem Datenmodell. Tag-Knoten bleiben standardmaessig aus, damit der Graph lesbar bleibt.
                </Text>
                <View style={styles.graphToolbar}>
                  <Pressable
                    onPress={() => controller.setIncludeGraphTags(!controller.includeGraphTags)}
                    style={[styles.segmentButton, controller.includeGraphTags && styles.segmentButtonActive]}>
                    <Text style={[styles.segmentText, controller.includeGraphTags && styles.segmentTextActive]}>
                      {controller.includeGraphTags ? 'Tags an' : 'Tags aus'}
                    </Text>
                  </Pressable>
                </View>
                {controller.graphLoading ? (
                  <View style={styles.loadingBlock}>
                    <ActivityIndicator color="#0B6B49" size="small" />
                    <Text style={styles.loadingText}>Graph wird aufgebaut.</Text>
                  </View>
                ) : controller.graphError ? (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorTitle}>Graph konnte nicht geladen werden</Text>
                    <Text style={styles.errorText}>{controller.graphError}</Text>
                  </View>
                ) : controller.graph ? (
                  <>
                    <Text style={styles.graphSummary}>
                      {`${controller.graph.meta.stats.nodeCount} Knoten • ${controller.graph.meta.stats.edgeCount} Kanten • ${controller.graph.meta.stats.moduleCount} Module im Scope`}
                    </Text>
                    <CurriculumGraph
                      graph={controller.graph}
                      onSelectModule={(moduleId) => controller.setSelectedModuleId(moduleId)}
                    />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SwipeableTabView>

      <Modal animationType="slide" onRequestClose={() => controller.setSelectedModuleId(null)} transparent visible={controller.selectedModule !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {controller.selectedModule ? (
                <>
                  <Text style={styles.modalTitle}>{controller.selectedModule.title}</Text>
                  <Text style={styles.modalSubtitle}>
                    {`${areaLabel(controller.selectedModule.area)} • ${controller.selectedModule.credits} LP`}
                    {controller.selectedModule.semester ? ` • Semester ${controller.selectedModule.semester.number}` : ''}
                  </Text>

                  <View style={styles.modalBlock}>
                    <Text style={styles.modalBlockTitle}>Lehrveranstaltungen</Text>
                    <View style={styles.modalList}>
                      {controller.selectedModule.courses.map((course) => (
                        <Text key={`${controller.selectedModule?.id}-${course.title}`} style={styles.modalItem}>
                          {`${course.kindLabel}: ${course.title}${course.weeklyHours ? ` (${course.weeklyHours} SWS)` : ''}`}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalBlock}>
                    <Text style={styles.modalBlockTitle}>Leistungsnachweise</Text>
                    <View style={styles.modalList}>
                      {controller.selectedModule.assessments.map((assessment) => (
                        <Text key={`${controller.selectedModule?.id}-${assessment.code}-${assessment.label}`} style={styles.modalItem}>
                          {`${assessment.label}${assessment.credits ? ` (${assessment.credits} LP)` : ''}`}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {controller.selectedModule.prerequisiteModules.length > 0 || controller.selectedModule.prerequisites.length > 0 ? (
                    <View style={styles.modalBlock}>
                      <Text style={styles.modalBlockTitle}>Voraussetzungen</Text>
                      <View style={styles.modalList}>
                        {controller.selectedModule.prerequisiteModules.map((module) => (
                          <Text key={module.id} style={styles.modalItem}>
                            {`${module.title}${module.semesterNumber ? ` (Sem ${module.semesterNumber})` : ''}`}
                          </Text>
                        ))}
                        {controller.selectedModule.prerequisites.map((entry) => (
                          <Text key={entry} style={styles.modalItem}>{entry}</Text>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.modalBlock}>
                    <Text style={styles.modalBlockTitle}>Tags und Vertiefungen</Text>
                    <View style={styles.tagRow}>
                      {controller.selectedModule.specializations.map((specialization) => (
                        <View key={specialization.id} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{specialization.code}</Text>
                        </View>
                      ))}
                      {controller.selectedModule.tags.map((tag) => (
                        <View key={tag.id} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{tag.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalBlock}>
                    <Text style={styles.modalBlockTitle}>Quellen</Text>
                    {controller.selectedModule.sourceRefs.map((sourceRef) => (
                      <View key={`${sourceRef.document.id}-${sourceRef.pageStart}-${sourceRef.locator ?? ''}`} style={styles.sourceCard}>
                        <Text style={styles.sourceTitle}>{sourceRef.document.title}</Text>
                        <Text style={styles.sourceMeta}>
                          {`${sourceRef.document.versionLabel ?? 'Version hinterlegt'} • Seiten ${sourceRef.pageStart}-${sourceRef.pageEnd}`}
                        </Text>
                        {sourceRef.locator ? <Text style={styles.sourceMeta}>{sourceRef.locator}</Text> : null}
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <Pressable onPress={() => controller.setSelectedModuleId(null)} style={[styles.segmentButton, styles.segmentButtonActive, { marginTop: 16 }]}>
              <Text style={[styles.segmentText, styles.segmentTextActive]}>Schliessen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
