import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { fetchHfuContacts } from '../api';
import { filterHfuContacts } from '../hfuContacts';
import type { baseStyles } from '../styles';
import type { HfuContactFilter, HfuContactPerson } from '../types';

type HfuContactsPanelProps = {
  styles: typeof baseStyles;
};

const categoryLabels: Record<HfuContactFilter['category'], string> = {
  faculty: 'Fakultaeten',
  function: 'Funktion',
  service: 'Services',
};
const CONTACT_BATCH_SIZE = 10;

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function secondaryLine(contact: HfuContactPerson) {
  return [contact.role, contact.faculty, contact.institution, contact.department].filter(Boolean).join(' - ');
}

export function HfuContactsPanel({ styles }: HfuContactsPanelProps) {
  const [contacts, setContacts] = useState<HfuContactPerson[]>([]);
  const [filters, setFilters] = useState<HfuContactFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<HfuContactFilter | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadContacts = useCallback(async (filter: HfuContactFilter | null, offset: number, replace = false) => {
    setError('');
    setLoading(offset === 0);
    setLoadingMore(offset > 0);

    try {
      const result = await fetchHfuContacts(filter, { limit: CONTACT_BATCH_SIZE, offset });
      const isFullLegacyResponse = result.contacts.length > CONTACT_BATCH_SIZE;
      const pageContacts = isFullLegacyResponse
        ? result.contacts.slice(offset, offset + CONTACT_BATCH_SIZE)
        : result.contacts.slice(0, CONTACT_BATCH_SIZE);
      const nextTotalCount = result.totalCount ?? result.contacts.length;

      setContacts((current) => {
        const nextContacts = replace ? pageContacts : [...current, ...pageContacts];

        return nextContacts.filter((contact, index, candidates) => candidates.findIndex((candidate) => candidate.id === contact.id) === index);
      });
      setFilters((current) => (filter && current.length > 0 ? current : result.filters));
      setHasMore(result.hasMore ?? offset + pageContacts.length < nextTotalCount);
      setTotalCount(nextTotalCount);
    } catch {
      setError('Die HFU-Kontakte konnten gerade nicht geladen werden.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setContacts([]);
    setExpandedId(null);
    loadContacts(activeFilter, 0, true);
  }, [activeFilter, loadContacts]);

  const groupedFilters = useMemo(
    () =>
      filters.reduce<Record<HfuContactFilter['category'], HfuContactFilter[]>>(
        (groups, filter) => ({ ...groups, [filter.category]: [...groups[filter.category], filter] }),
        { faculty: [], function: [], service: [] },
      ),
    [filters],
  );
  const visibleContacts = useMemo(() => filterHfuContacts(contacts, query), [contacts, query]);
  const canLoadMore = hasMore && !loading && !loadingMore;

  return (
    <View>
      <View style={styles.hfuHeader}>
        <Text style={styles.sectionTitle}>HFU-Kontakte</Text>
        <Text style={styles.sectionSubtitle}>Finde Kontaktinformationen von Dozierenden, Professoren und Mitarbeitenden der Hochschule Furtwangen.</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={22} color="#667085" />
        <TextInput
          placeholder="Name, Bereich oder Funktion suchen ..."
          placeholderTextColor="#98A2B3"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {filters.length > 0 ? (
        <View style={styles.filterPanel}>
          <Pressable
            accessibilityRole="button"
            style={[styles.filterChip, !activeFilter ? styles.filterChipActive : null]}
            onPress={() => setActiveFilter(null)}
          >
            <Text style={[styles.filterChipText, !activeFilter ? styles.filterChipTextActive : null]}>Alle</Text>
          </Pressable>
          {(['faculty', 'service', 'function'] as const).map((category) =>
            groupedFilters[category].length > 0 ? (
              <View key={category} style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>{categoryLabels[category]}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChips}>
                    {groupedFilters[category].map((filter) => {
                      const isActive = activeFilter?.id === filter.id;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={filter.id}
                          style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                          onPress={() => setActiveFilter(isActive ? null : filter)}
                        >
                          <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : null]}>
                            {filter.label} ({filter.count})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null,
          )}
        </View>
      ) : null}

      {loading ? <Text style={styles.empty}>HFU-Kontakte werden geladen ...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && visibleContacts.length === 0 ? <Text style={styles.empty}>Keine passenden Kontakte gefunden.</Text> : null}
      {!loading && contacts.length > 0 ? (
        <Text style={styles.empty}>
          {contacts.length} von {totalCount} HFU-Kontakten geladen.
        </Text>
      ) : null}

      <View style={styles.contactList}>
        {visibleContacts.map((contact) => {
          const isExpanded = expandedId === contact.id;
          const subtitle = secondaryLine(contact);

          return (
            <Pressable key={contact.id} style={styles.contactCard} onPress={() => setExpandedId(isExpanded ? null : contact.id)}>
              <View style={styles.hfuAvatar}>
                <Text style={styles.hfuAvatarText}>{initials(contact.fullName)}</Text>
              </View>
              <View style={styles.contactContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contactName}>{contact.fullName}</Text>
                  <MaterialIcons name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#00684F" />
                </View>
                {subtitle ? <Text style={styles.contactRole}>{subtitle}</Text> : null}
                <Text style={styles.contactDetail}>{contact.email ?? 'Keine E-Mail-Adresse'}</Text>
                <Text style={styles.contactDetail}>{contact.phone ?? 'Keine Telefonnummer'}</Text>

                {isExpanded ? (
                  <View style={styles.hfuDetails}>
                    {contact.campus ? <Text style={styles.contactDetail}>Campus {contact.campus}</Text> : null}
                    {contact.room ? <Text style={styles.contactDetail}>Raum {contact.room}</Text> : null}
                    <Pressable style={styles.linkButton} onPress={() => Linking.openURL(contact.profileUrl)}>
                      <MaterialIcons name="open-in-new" size={18} color="#00684F" />
                      <Text style={styles.linkButtonText}>HFU-Profil oeffnen</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          disabled={!canLoadMore}
          style={[styles.loadMoreButton, !canLoadMore ? styles.loadMoreButtonDisabled : null]}
          onPress={() => loadContacts(activeFilter, contacts.length)}
        >
          <MaterialIcons name="expand-more" size={22} color="#00684F" />
          <Text style={styles.loadMoreButtonText}>{loadingMore ? 'Weitere Kontakte werden geladen ...' : '10 weitere Kontakte laden'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
