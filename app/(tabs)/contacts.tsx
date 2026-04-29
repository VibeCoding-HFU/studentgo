import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type Contact = {
  email: string;
  id: number;
  name: string;
  ownerId?: number | null;
  phone?: string | null;
  role: string;
  room?: string | null;
};

const emptyForm = { email: '', name: '', phone: '', role: '', room: '' };

export default function ContactsScreen() {
  const { token, user } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadContacts = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/contacts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.ok) {
      setContacts((await response.json()) as Contact[]);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return contacts;
    }

    return contacts.filter((contact) =>
      [contact.name, contact.role, contact.email, contact.room ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [contacts, query]);

  async function addContact() {
    setError('');

    if (!token) {
      setError('Melde dich an, um persoenliche Kontakte zu speichern.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/contacts`, {
      body: JSON.stringify(form),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Kontakt konnte nicht gespeichert werden.');
      return;
    }

    setForm(emptyForm);
    await loadContacts();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Kontakt</Text>
          <Text style={styles.title}>Kontakte</Text>
          <Text style={styles.subtitle}>Oeffentliche Kontakte und deine persoenlich markierten Eintraege.</Text>
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color="#667085" />
          <TextInput placeholder="Kontakt suchen" placeholderTextColor="#98A2B3" style={styles.searchInput} value={query} onChangeText={setQuery} />
        </View>

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

        <View style={styles.contactList}>
          {filteredContacts.length === 0 ? <Text style={styles.empty}>Keine Kontakte vorhanden.</Text> : null}
          {filteredContacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.contactContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.ownerId === user?.id ? <Text style={styles.personalBadge}>Persoenlich</Text> : null}
                </View>
                <Text style={styles.contactRole}>{contact.role}</Text>
                <Text style={styles.contactDetail}>{contact.email}</Text>
                <Text style={styles.contactDetail}>{contact.phone || 'Keine Telefonnummer'} · Raum {contact.room || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#C11574', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8 },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 14, paddingHorizontal: 14 },
  searchInput: { color: '#101828', flex: 1, fontSize: 15, minHeight: 48 },
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 18, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12 },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  contactList: { gap: 12 },
  contactCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  avatar: { alignItems: 'center', backgroundColor: '#FCE7F3', borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: '#C11574', fontSize: 14, fontWeight: '800' },
  contactContent: { flex: 1 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  contactName: { color: '#101828', flex: 1, fontSize: 17, fontWeight: '800' },
  personalBadge: { color: '#047857', fontSize: 12, fontWeight: '800' },
  contactRole: { color: '#475467', fontSize: 14, fontWeight: '700', marginTop: 3 },
  contactDetail: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
});
