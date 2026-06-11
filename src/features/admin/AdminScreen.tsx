import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleHeader } from '@/components/module-header';
import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { readApiError } from '@/src/shared/api/client';
import { Role, roleLabel } from '@/src/shared/types/auth';
import { ManagerWorkspace } from '@/src/features/manager';
import { AdminUser, ChangeRequest, Summary, deleteAdminUserRequest, fetchAdminBundle, reviewChangeRequest, saveAdminUser } from './api';
import { AdminRoleComboBox } from './components/AdminRoleComboBox';
import { baseStyles } from './styles';
import { requestTitle } from './utils';

const emptyUserForm = { email: '', name: '', password: '', role: 'USER' as Role };

export default function AdminScreen() {
  const styles = useThemedStyles(baseStyles);
  const { isAdminMode, token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAdminBundle({ token });
      setSummary(data.summary);
      setUsers(data.users);
      setRequests(data.requests);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Admin-Daten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
    if (!token) {
      setError('Admin-Sitzung ist nicht geladen.');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await saveAdminUser({ token }, userForm, selectedUserId);

      if (!response.ok) {
        throw new Error(await readApiError(response));
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
    if (!token) {
      setError('Admin-Sitzung ist nicht geladen.');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await deleteAdminUserRequest({ token }, id);

      if (!response.ok) {
        throw new Error(await readApiError(response));
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
    if (!token) {
      setError('Admin-Sitzung ist nicht geladen.');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await reviewChangeRequest({ token }, id, decision);

      if (!response.ok) {
        throw new Error(await readApiError(response));
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
        <SwipeableTabView>
          <View style={styles.locked}>
            <MaterialIcons name="lock" size={34} color="#B42318" />
            <Text style={styles.lockedTitle}>Admin-Zugang erforderlich</Text>
            <Text style={styles.lockedText}>Melde dich im Account-Tab als Admin an, um Accounts und Freigaben zu verwalten.</Text>
          </View>
        </SwipeableTabView>
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
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ModuleHeader
            accent="#B42318"
            icon="admin-panel-settings"
            kicker="Admin"
            title="Verwalten"
            subtitle="Eintraege vorbereiten und erweiterte Admin-Einstellungen bei Bedarf oeffnen."
          />
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ManagerWorkspace embedded />

        <Pressable style={styles.advancedToggle} onPress={() => setAdvancedOpen((current) => !current)}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.advancedTitle}>Erweitert</Text>
            <Text style={styles.advancedMeta}>Dashboard, Freigaben und Accounts</Text>
          </View>
          <MaterialIcons name={advancedOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={26} color="#475467" style={styles.chevronIcon} />
        </Pressable>

        {advancedOpen ? (
          <>
            <Pressable disabled={isLoading} style={styles.refreshButton} onPress={loadAdminData}>
              <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.refreshText}>{isLoading ? 'Wird geladen' : 'Aktualisieren'}</Text>
            </Pressable>

            <View style={styles.summaryGrid}>
              {cards.map(([label, value, icon]) => (
                <View key={label as string} style={styles.summaryCard}>
                  <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={24} color="#00684F" />
                  <Text style={styles.summaryValue}>{value}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
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

              <AdminRoleComboBox value={userForm.role} onChange={(role) => setUserForm((current) => ({ ...current, role }))} />

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
                      color={account.role === 'ADMIN' ? '#B54708' : account.role === 'MANAGER' ? '#00684F' : '#00684F'}
                    />
                  </View>
                  <View style={styles.userContent}>
                    <Text style={styles.userName}>{account.name}</Text>
                    <Text style={styles.userMeta}>{account.email}</Text>
                    <Text style={styles.userRole}>{roleLabel(account.role)}</Text>
                    <View style={styles.cardActions}>
                      <Pressable style={styles.smallButton} onPress={() => selectUser(account)}>
                        <MaterialIcons name="edit" size={18} color="#00684F" />
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
          </>
        ) : null}
        </ScrollView>
      </SwipeableTabView>
    </SafeAreaView>
  );
}
