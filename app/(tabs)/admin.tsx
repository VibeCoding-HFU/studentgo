import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { Role, useAuth } from '@/contexts/auth-context';

type Summary = {
  contacts: number;
  deadlines: number;
  meals: number;
  modules: number;
  pendingRequests: number;
  sessions: number;
  users: number;
};

type AdminUser = {
  createdAt: string;
  email: string;
  id: number;
  name: string;
  role: Role;
};

type ChangeRequest = {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  createdAt: string;
  entity: 'CONTACT' | 'DEADLINE' | 'MEAL' | 'LESSON' | 'STUDY_INFO';
  id: number;
  payload: Record<string, unknown>;
  requestedBy: {
    email: string;
    name: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

const emptyUserForm = { email: '', name: '', password: '', role: 'USER' as Role };
const roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];

function roleLabel(role: Role) {
  if (role === 'ADMIN') {
    return 'Admin';
  }

  if (role === 'MANAGER') {
    return 'Verwalter';
  }

  return 'User';
}

function RoleComboBox({ value, onChange }: { onChange: (role: Role) => void; value: Role }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.comboBox, isOpen && styles.comboBoxOpen]}>
      <Pressable accessibilityRole="combobox" style={styles.comboButton} onPress={() => setIsOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{roleLabel(value)}</Text>
        <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" />
      </Pressable>
      {isOpen ? (
        <View style={styles.comboMenu}>
          {roles.map((roleOption) => (
            <Pressable
              key={roleOption}
              style={[styles.comboOption, value === roleOption && styles.comboOptionActive]}
              onPress={() => {
                onChange(roleOption);
                setIsOpen(false);
              }}>
              <Text style={[styles.comboOptionText, value === roleOption && styles.comboOptionTextActive]}>
                {roleLabel(roleOption)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function requestTitle(request: ChangeRequest) {
  const entity =
    request.entity === 'CONTACT'
      ? 'Kontakt'
      : request.entity === 'DEADLINE'
        ? 'Frist'
        : request.entity === 'MEAL'
          ? 'Mensa'
          : request.entity === 'LESSON'
            ? 'Plan'
            : 'Info';
  const action = request.action === 'CREATE' ? 'anlegen' : request.action === 'UPDATE' ? 'bearbeiten' : 'loeschen';
  return `${entity} ${action}`;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : 'Die Anfrage ist fehlgeschlagen.';
  } catch {
    return 'Die Anfrage ist fehlgeschlagen.';
  }
}

export default function AdminScreen() {
  const { isAdminMode, token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const backendUrl = useMemo(() => getBackendUrl(), []);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const loadAdminData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [summaryResponse, usersResponse, requestsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/admin/summary`, { headers }),
        fetch(`${backendUrl}/api/admin/users`, { headers }),
        fetch(`${backendUrl}/api/admin/change-requests`, { headers }),
      ]);

      if (!summaryResponse.ok || !usersResponse.ok || !requestsResponse.ok) {
        throw new Error('Admin-Daten konnten nicht geladen werden.');
      }

      setSummary((await summaryResponse.json()) as Summary);
      setUsers((await usersResponse.json()) as AdminUser[]);
      setRequests((await requestsResponse.json()) as ChangeRequest[]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Admin-Daten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, headers, token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  function selectUser(account: AdminUser) {
    setSelectedUserId(account.id);
    setUserForm({ email: account.email, name: account.name, password: '', role: account.role });
    setMessage('');
    setError('');
  }

  function resetUserForm() {
    setSelectedUserId(null);
    setUserForm(emptyUserForm);
  }

  async function submitUser() {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        selectedUserId ? `${backendUrl}/api/admin/users/${selectedUserId}` : `${backendUrl}/api/admin/users`,
        {
          body: JSON.stringify(userForm),
          headers,
          method: selectedUserId ? 'PATCH' : 'POST',
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage(selectedUserId ? 'Account wurde aktualisiert.' : 'Bestaetigungs-E-Mail wurde versendet. Der Account wird erst nach Bestaetigung angelegt.');
      resetUserForm();
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Account konnte nicht gespeichert werden.');
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteUser(id: number) {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/admin/users/${id}`, {
        headers,
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage('Account wurde geloescht.');
      resetUserForm();
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Account konnte nicht geloescht werden.');
    } finally {
      setIsLoading(false);
    }
  }

  async function reviewRequest(id: number, decision: 'approve' | 'reject') {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/admin/change-requests/${id}/${decision}`, {
        body: decision === 'reject' ? JSON.stringify({ note: 'Vom Admin abgelehnt.' }) : undefined,
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage(decision === 'approve' ? 'Aenderung wurde angenommen.' : 'Aenderung wurde abgelehnt.');
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Anfrage konnte nicht bearbeitet werden.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isAdminMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.locked}>
          <MaterialIcons name="lock" size={34} color="#B42318" />
          <Text style={styles.lockedTitle}>Admin-Zugang erforderlich</Text>
          <Text style={styles.lockedText}>Melde dich im Account-Tab als Admin an, um Accounts und Freigaben zu verwalten.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cards = summary
    ? [
        ['Nutzer', summary.users, 'people'],
        ['Offene Anfragen', summary.pendingRequests, 'pending-actions'],
        ['Sessions', summary.sessions, 'vpn-key'],
        ['Kontakte', summary.contacts, 'contacts'],
        ['Fristen', summary.deadlines, 'event-available'],
        ['Module', summary.modules, 'menu-book'],
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Admin</Text>
          <Text style={styles.title}>Accounts und Freigaben</Text>
          <Text style={styles.subtitle}>Berechtigungen steuern, Accounts bearbeiten und Verwalter-Anfragen pruefen.</Text>
        </View>

        <Pressable disabled={isLoading} style={styles.refreshButton} onPress={loadAdminData}>
          <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
          <Text style={styles.refreshText}>{isLoading ? 'Wird geladen' : 'Aktualisieren'}</Text>
        </Pressable>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.summaryGrid}>
          {cards.map(([label, value, icon]) => (
            <View key={label as string} style={styles.summaryCard}>
              <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={24} color="#2F80ED" />
              <Text style={styles.summaryValue}>{value}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedUserId ? 'Account bearbeiten' : 'Account anlegen'}</Text>
          {selectedUserId ? (
            <Pressable onPress={resetUserForm}>
              <Text style={styles.linkText}>Neu</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.form}>
          <TextInput placeholder="Name" placeholderTextColor="#98A2B3" style={styles.input} value={userForm.name} onChangeText={(name) => setUserForm((current) => ({ ...current, name }))} />
          <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-Mail" placeholderTextColor="#98A2B3" style={styles.input} value={userForm.email} onChangeText={(email) => setUserForm((current) => ({ ...current, email }))} />
          <TextInput placeholder={selectedUserId ? 'Neues Passwort optional' : 'Passwort'} placeholderTextColor="#98A2B3" secureTextEntry style={styles.input} value={userForm.password} onChangeText={(password) => setUserForm((current) => ({ ...current, password }))} />

          <RoleComboBox value={userForm.role} onChange={(role) => setUserForm((current) => ({ ...current, role }))} />

          <Pressable disabled={isLoading} style={[styles.button, isLoading && styles.buttonDisabled]} onPress={submitUser}>
            <MaterialIcons name={selectedUserId ? 'save' : 'person-add'} size={21} color="#FFFFFF" />
            <Text style={styles.buttonText}>{selectedUserId ? 'Account speichern' : 'Account anlegen'}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <Text style={styles.sectionCount}>{users.length}</Text>
        </View>

        <View style={styles.userList}>
          {users.map((account) => (
            <View key={account.id} style={styles.userCard}>
              <View style={styles.userIcon}>
                <MaterialIcons
                  name={account.role === 'ADMIN' ? 'admin-panel-settings' : account.role === 'MANAGER' ? 'edit-note' : 'person'}
                  size={22}
                  color={account.role === 'ADMIN' ? '#B54708' : account.role === 'MANAGER' ? '#0E6F63' : '#2F80ED'}
                />
              </View>
              <View style={styles.userContent}>
                <Text style={styles.userName}>{account.name}</Text>
                <Text style={styles.userMeta}>{account.email}</Text>
                <Text style={styles.userRole}>{roleLabel(account.role)}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={styles.smallButton} onPress={() => selectUser(account)}>
                    <MaterialIcons name="edit" size={18} color="#2F80ED" />
                    <Text style={styles.smallButtonText}>Bearbeiten</Text>
                  </Pressable>
                  <Pressable style={[styles.smallButton, styles.dangerSmallButton]} onPress={() => deleteUser(account.id)}>
                    <MaterialIcons name="delete" size={18} color="#B42318" />
                    <Text style={styles.dangerSmallButtonText}>Loeschen</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verwalter-Anfragen</Text>
          <Text style={styles.sectionCount}>{requests.filter((request) => request.status === 'PENDING').length}</Text>
        </View>

        <View style={styles.userList}>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.userName}>{requestTitle(request)}</Text>
              <Text style={styles.userMeta}>Von {request.requestedBy.name} · Status {request.status}</Text>
              <Text style={styles.payloadText}>{JSON.stringify(request.payload)}</Text>
              {request.status === 'PENDING' ? (
                <View style={styles.cardActions}>
                  <Pressable style={styles.approveButton} onPress={() => reviewRequest(request.id, 'approve')}>
                    <MaterialIcons name="check" size={18} color="#047857" />
                    <Text style={styles.approveText}>Annehmen</Text>
                  </Pressable>
                  <Pressable style={styles.rejectButton} onPress={() => reviewRequest(request.id, 'reject')}>
                    <MaterialIcons name="close" size={18} color="#B42318" />
                    <Text style={styles.rejectText}>Ablehnen</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  kicker: {
    color: '#B54708',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  refreshButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#14213D',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  success: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 112,
    padding: 14,
    width: '48%',
  },
  summaryValue: {
    color: '#101828',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
  },
  summaryLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#2F80ED',
    fontSize: 15,
    fontWeight: '800',
  },
  linkText: {
    color: '#2F80ED',
    fontSize: 14,
    fontWeight: '800',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 22,
    padding: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  comboBox: {
    position: 'relative',
    zIndex: 1,
  },
  comboBoxOpen: {
    elevation: 12,
    zIndex: 1000,
  },
  comboButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  comboLabel: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  comboMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 12,
    marginTop: 6,
    overflow: 'hidden',
    zIndex: 1001,
  },
  comboOption: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  comboOptionActive: {
    backgroundColor: '#EEF4FF',
  },
  comboOptionText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  comboOptionTextActive: {
    color: '#2F80ED',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  roleButtonActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  roleText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2F80ED',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  userList: {
    gap: 10,
    marginBottom: 24,
  },
  userCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  userIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  userContent: {
    flex: 1,
  },
  userName: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  userMeta: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  userRole: {
    color: '#B54708',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderColor: '#D1E0FF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    color: '#2F80ED',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerSmallButton: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
  },
  dangerSmallButtonText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  payloadText: {
    color: '#475467',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  approveButton: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#ABEFC6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  approveText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  rejectText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
  },
  locked: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  lockedTitle: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  lockedText: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
