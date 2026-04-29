import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Role, useAuth } from '@/contexts/auth-context';

type Mode = 'login' | 'register';
const roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];

function roleLabel(role: Role | null) {
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
    <View style={styles.comboBox}>
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

export default function AccountScreen() {
  const { activeRole, confirmRegistration, isAuthenticated, login, logout, register, user } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationToken, setConfirmationToken] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password, role);
      } else {
        await register(name, email, password, role);
        setMessage('Bestaetigungs-E-Mail wurde versendet. Gib den Code aus der E-Mail ein, um den Account zu aktivieren.');
      }

      setPassword('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmAccount() {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await confirmRegistration(confirmationToken);
      setConfirmationToken('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Bestaetigung fehlgeschlagen.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Account</Text>
            <Text style={styles.title}>Angemeldet</Text>
            <Text style={styles.subtitle}>Du nutzt StudentGo aktuell als {roleLabel(activeRole)}.</Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color="#2F80ED" />
            </View>
            <View style={styles.profileContent}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileMeta}>{user.email}</Text>
              <Text style={styles.profileRole}>
                Account: {roleLabel(user.role)} · Sitzung: {roleLabel(activeRole)}
              </Text>
            </View>
          </View>

          <Pressable style={styles.secondaryButton} onPress={logout}>
            <MaterialIcons name="logout" size={22} color="#B42318" />
            <Text style={styles.secondaryButtonText}>Abmelden</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Einloggen' : 'Account anlegen'}</Text>
          <Text style={styles.subtitle}>
            Admin-Accounts koennen als Admin, Verwalter oder User arbeiten. Verwalter koennen als Verwalter oder User starten.
          </Text>
        </View>

        <View style={styles.switchRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}
            onPress={() => setMode('login')}>
            <MaterialIcons name="login" size={20} color={mode === 'login' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]}
            onPress={() => setMode('register')}>
            <MaterialIcons name="person-add" size={20} color={mode === 'register' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Neu</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              autoCapitalize="words"
              placeholder="Name"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="E-Mail"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Passwort"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <RoleComboBox value={role} onChange={setRole} />

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={isSubmitting} style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={submit}>
            <MaterialIcons name={mode === 'login' ? 'login' : 'person-add'} size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>{isSubmitting ? 'Bitte warten' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}</Text>
          </Pressable>
        </View>

        {mode === 'register' ? (
          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              placeholder="Bestaetigungscode"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              value={confirmationToken}
              onChangeText={setConfirmationToken}
            />
            <Pressable disabled={isSubmitting} style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={confirmAccount}>
              <MaterialIcons name="mark-email-read" size={22} color="#FFFFFF" />
              <Text style={styles.buttonText}>E-Mail bestaetigen</Text>
            </Pressable>
          </View>
        ) : null}
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
    color: '#2F80ED',
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
  switchRow: {
    backgroundColor: '#EAECF0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    padding: 4,
  },
  switchButton: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 42,
  },
  switchButtonActive: {
    backgroundColor: '#2F80ED',
  },
  switchText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  comboBox: {
    position: 'relative',
    zIndex: 2,
  },
  comboButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
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
    marginTop: 6,
    overflow: 'hidden',
  },
  comboOption: {
    minHeight: 44,
    justifyContent: 'center',
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
  roleToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  roleButtonActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  roleText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  success: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2F80ED',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileContent: {
    flex: 1,
  },
  profileName: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '800',
  },
  profileMeta: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  profileRole: {
    color: '#2F80ED',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 6,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '800',
  },
});
