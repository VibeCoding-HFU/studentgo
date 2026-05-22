import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { useSync } from '@/contexts/sync-context';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { createContact, fetchContacts } from './api';
import { HfuContactsPanel } from './components/HfuContactsPanel';
import { baseStyles } from './styles';
import type { Contact } from './types';

const emptyForm = { email: '', name: '', phone: '', role: '', room: '' };

export default function ContactsScreen() {
  const styles = useThemedStyles(baseStyles);
  const { token, user } = useAuth();
  const { enqueueCreate, pendingItems, syncVersion } = useSync();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [activeContactType, setActiveContactType] = useState<'app' | 'hfu'>('app');

  const loadContacts = useCallback(async () => {
    const nextContacts = await fetchContacts(token).catch(() => null);

    if (nextContacts) {
      setContacts(nextContacts.map((contact) => ({ ...contact, syncState: 'synced' })));
    }
  }, [token]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts, syncVersion]);

  const pendingContacts = useMemo(
    () => pendingItems.filter((item) => item.kind === 'contact').map((item) => item.localData as Contact),
    [pendingItems],
  );

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allContacts = [...pendingContacts, ...contacts].filter(
      (contact, index, candidates) => candidates.findIndex((candidate) => candidate.id === contact.id) === index,
    );

    if (!normalizedQuery) {
      return allContacts;
    }

    return allContacts.filter((contact) =>
      [contact.name, contact.role, contact.email, contact.room ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [contacts, pendingContacts, query]);

  async function addContact() {
    setError('');

    if (!token) {
      setError('Melde dich an, um persoenliche Kontakte zu speichern.');
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await createContact(token, form);

      if (!response.ok) {
        setError('Kontakt konnte nicht gespeichert werden.');
        return;
      }
    } catch {
      const localContact: Contact = {
        ...form,
        id: -Date.now(),
        ownerId: user?.id,
        syncState: 'pending',
      };

      await enqueueCreate({
        body: JSON.stringify(form),
        headers: Object.entries(headers),
        kind: 'contact',
        localData: localContact,
        url: `${backendUrl}/api/contacts`,
      });
      setContacts((current) => [localContact, ...current]);
    }

    setForm(emptyForm);
    setFormOpen(false);
    await loadContacts().catch(() => undefined);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Kontakt</Text>
            <Text style={styles.title}>Kontakte</Text>
            <Text style={styles.subtitle}>Oeffentliche Kontakte und deine persoenlich markierten Eintraege.</Text>
            <SyncStatusBadge />
          </View>

          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              style={[styles.segmentButton, activeContactType === 'app' ? styles.segmentButtonActive : null]}
              onPress={() => setActiveContactType('app')}
            >
              <Text style={[styles.segmentButtonText, activeContactType === 'app' ? styles.segmentButtonTextActive : null]}>App-Kontakte</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.segmentButton, activeContactType === 'hfu' ? styles.segmentButtonActive : null]}
              onPress={() => setActiveContactType('hfu')}
            >
              <Text style={[styles.segmentButtonText, activeContactType === 'hfu' ? styles.segmentButtonTextActive : null]}>HFU-Kontakte</Text>
            </Pressable>
          </View>

          {activeContactType === 'app' ? (
            <>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={22} color="#667085" />
                <TextInput placeholder="Kontakt suchen" placeholderTextColor="#98A2B3" style={styles.searchInput} value={query} onChangeText={setQuery} />
              </View>

              <View style={styles.contactList}>
                {filteredContacts.length === 0 ? <Text style={styles.empty}>Keine Kontakte vorhanden.</Text> : null}
                {filteredContacts.map((contact) => (
                  <View key={contact.id} style={styles.contactCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{contact.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.contactContent}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.syncDot, contact.syncState === 'pending' ? styles.syncDotPending : styles.syncDotDone]} />
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.ownerId === user?.id ? <Text style={styles.personalBadge}>Persoenlich</Text> : null}
                      </View>
                      <Text style={styles.contactRole}>{contact.role}</Text>
                      <Text style={styles.contactDetail}>{contact.email}</Text>
                      <Text style={styles.contactDetail}>
                        {contact.phone || 'Keine Telefonnummer'} - Raum {contact.room || '-'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.addPanel}>
                <Pressable style={styles.addHeader} onPress={() => setFormOpen((current) => !current)}>
                  <View style={styles.headerTextBlock}>
                    <Text style={styles.addTitle}>Persoenlichen Kontakt hinzufuegen</Text>
                    <Text style={styles.addHint}>Eigene Kontakte bleiben nur fuer deinen Account sichtbar.</Text>
                  </View>
                  <MaterialIcons name={formOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
                </Pressable>

                {formOpen ? (
                  <View style={styles.form}>
                    <TextInput placeholder="Name" placeholderTextColor="#98A2B3" style={styles.input} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} />
                    <TextInput placeholder="Rolle" placeholderTextColor="#98A2B3" style={styles.input} value={form.role} onChangeText={(role) => setForm((current) => ({ ...current, role }))} />
                    <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-Mail" placeholderTextColor="#98A2B3" style={styles.input} value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} />
                    <TextInput placeholder="Telefon" placeholderTextColor="#98A2B3" style={styles.input} value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} />
                    <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={form.room} onChangeText={(room) => setForm((current) => ({ ...current, room }))} />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Pressable style={styles.button} onPress={addContact}>
                      <MaterialIcons name="add" size={22} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Persoenlichen Kontakt speichern</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <HfuContactsPanel styles={styles} />
          )}
        </ScrollView>
      </SwipeableTabView>
    </SafeAreaView>
  );
}
