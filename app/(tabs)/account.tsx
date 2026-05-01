import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { toQR } from 'toqr';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { Role, useAuth } from '@/contexts/auth-context';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { generateAccountKeyPair, getPrivateKey, hasPrivateKey, publicKeyFromPrivateKey, publicKeyValueIncludes, savePrivateKey } from '@/lib/client-crypto';

type Mode = 'login' | 'register';
const roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];
const qrSize = 260;
const qrQuietZone = 4;

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
  const styles = useThemedStyles(baseStyles);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.comboBox, isOpen && styles.comboBoxOpen]}>
      <Pressable accessibilityRole="combobox" style={styles.comboButton} onPress={() => setIsOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{roleLabel(value)}</Text>
        <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
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

function qrPath(content: string) {
  const matrix = toQR(content);
  const size = Math.sqrt(matrix.length);
  const commands: string[] = [];

  for (let y = 0; y < size; y++) {
    let runStart: number | null = null;

    for (let x = 0; x <= size; x++) {
      const isDark = x < size && Boolean(matrix[y * size + x]);

      if (isDark && runStart === null) {
        runStart = x;
      }

      if ((!isDark || x === size) && runStart !== null) {
        commands.push(`M${runStart + qrQuietZone} ${y + qrQuietZone}h${x - runStart}v1H${runStart + qrQuietZone}z`);
        runStart = null;
      }
    }
  }

  return {
    path: commands.join(''),
    size: size + qrQuietZone * 2,
  };
}

type PrivateKeyQr = ReturnType<typeof qrPath>;

const PrivateKeyQrCode = memo(function PrivateKeyQrCode({ qr }: { qr: PrivateKeyQr }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <Svg height={qrSize} style={styles.qrCanvas} viewBox={`0 0 ${qr.size} ${qr.size}`} width={qrSize}>
      <Path d={`M0 0h${qr.size}v${qr.size}H0z`} fill="#FFFFFF" />
      <Path d={qr.path} fill="#000000" />
    </Svg>
  );
});

export default function AccountScreen() {
  const styles = useThemedStyles(baseStyles);
  const { activeRole, confirmRegistration, isAuthenticated, login, logout, register, token, updatePublicKey, user } = useAuth();
  const { preference, togglePreference } = useThemePreference();
  const backendUrl = getBackendUrl();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationToken, setConfirmationToken] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
  const [storedPrivateKey, setStoredPrivateKey] = useState('');
  const [privateKeyAvailable, setPrivateKeyAvailable] = useState(false);
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [privateKeyQr, setPrivateKeyQr] = useState<PrivateKeyQr | null>(null);
  const [privateKeyQrContent, setPrivateKeyQrContent] = useState('');
  const [qrProgress, setQrProgress] = useState(0);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [showKeyOk, setShowKeyOk] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDarkMode = preference === 'dark';

  const prepareQrCode = useCallback(async (privateKeyJson: string) => {
    setIsQrLoading(true);
    setQrProgress(0.18);
    setPrivateKeyQr(null);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setQrProgress(0.55);

    const nextQr = qrPath(privateKeyJson);
    setPrivateKeyQr(nextQr);
    setPrivateKeyQrContent(privateKeyJson);
    setQrProgress(1);
    setIsQrLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredPrivateKey() {
      if (!user?.email) {
        setStoredPrivateKey('');
        setPrivateKeyAvailable(false);
        setPrivateKeyQr(null);
        setPrivateKeyQrContent('');
        return;
      }

      setIsKeyLoading(true);
      const privateKeyJson = generatedPrivateKey || (await getPrivateKey(user.email)) || '';

      if (!cancelled) {
        setStoredPrivateKey(privateKeyJson);
        setPrivateKeyAvailable(Boolean(privateKeyJson) || await hasPrivateKey(user.email));
        if (!generatedPrivateKey) {
          setPrivateKeyQr(null);
          setPrivateKeyQrContent('');
        }
        setIsKeyLoading(false);
      }
    }

    loadStoredPrivateKey();
    return () => {
      cancelled = true;
    };
  }, [generatedPrivateKey, user?.email]);

  async function submit() {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password, role);
      } else {
        const { privateKeyJson, privateKeySaved } = await register(name, email, password, role);
        setGeneratedPrivateKey(privateKeyJson);
        await prepareQrCode(privateKeyJson);
        setMessage(privateKeySaved
          ? 'Bestaetigungs-E-Mail wurde versendet. Dein Private Key wurde auf diesem Geraet gespeichert. Bewahre ihn sicher auf.'
          : 'Bestaetigungs-E-Mail wurde versendet. Dein Private Key konnte nicht persistent gespeichert werden. Bewahre den angezeigten Key sicher auf.');
      }

      setPassword('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function storePrivateKey() {
    setError('');
    setMessage('');

    if (!user || !token) {
      return;
    }

    try {
      const publicKeyJson = publicKeyFromPrivateKey(privateKeyInput);

      await savePrivateKey(user.email, privateKeyInput);
      setStoredPrivateKey(privateKeyInput);
      setPrivateKeyAvailable(true);
      setPrivateKeyQr(null);
      setPrivateKeyQrContent('');
      setShowQr(false);

      if (!publicKeyValueIncludes(user.publicKeyJson, publicKeyJson)) {
        const response = await fetch(`${backendUrl}/api/account/public-key`, {
          body: JSON.stringify({ publicKeyJson }),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          method: 'PATCH',
        });

        if (!response.ok) {
          throw new Error('public-key');
        }

        updatePublicKey(publicKeyJson);
      }

      setPrivateKeyInput('');
      setShowManualInput(false);
      setMessage('Private Key wurde auf diesem Geraet gespeichert.');
    } catch {
      setError('Private Key konnte nicht gelesen werden. Fuege den kompletten JSON-Key ein.');
    }
  }

  async function replacePrivateKey() {
    if (!user || !token) {
      return;
    }

    setError('');
    setMessage('');

    try {
      const keyPair = await generateAccountKeyPair();
      const response = await fetch(`${backendUrl}/api/account/public-key`, {
        body: JSON.stringify({ publicKeyJson: keyPair.publicKeyJson }),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('public-key');
      }

      updatePublicKey(keyPair.publicKeyJson);
      setGeneratedPrivateKey(keyPair.privateKeyJson);
      setStoredPrivateKey(keyPair.privateKeyJson);
      setPrivateKeyAvailable(true);
      setShowKeyWarning(false);
      setShowQr(true);
      await prepareQrCode(keyPair.privateKeyJson);
      try {
        await savePrivateKey(user.email, keyPair.privateKeyJson);
        setMessage('Neuer Private Key wurde auf diesem Geraet gespeichert.');
      } catch {
        setError('Neuer Private Key konnte nicht persistent gespeichert werden. Bewahre den angezeigten Key sicher auf.');
      }
      setShowKeyOk(true);
    } catch {
      setError('Neuer Private Key konnte nicht erzeugt werden.');
    }
  }

  async function toggleQrCode() {
    if (!storedPrivateKey) {
      return;
    }

    const shouldShowQr = !showQr;
    setShowQr(shouldShowQr);

    if (shouldShowQr && (!privateKeyQr || privateKeyQrContent !== storedPrivateKey)) {
      await prepareQrCode(storedPrivateKey);
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
        <SwipeableTabView>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Account</Text>
            <Text style={styles.title}>Angemeldet</Text>
            <Text style={styles.subtitle}>Du nutzt StudentGo aktuell als {roleLabel(activeRole)}.</Text>
            <SyncStatusBadge />
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color="#00684F" />
            </View>
            <View style={styles.profileContent}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileMeta}>{user.email}</Text>
              <Text style={styles.profileRole}>
                Account: {roleLabel(user.role)} · Sitzung: {roleLabel(activeRole)}
              </Text>
            </View>
          </View>

          <Pressable style={[styles.themeToggle, isDarkMode && styles.themeToggleDark]} onPress={togglePreference}>
            <MaterialIcons name={isDarkMode ? 'light-mode' : 'dark-mode'} size={22} color={isDarkMode ? '#FFD166' : '#00684F'} />
            <View style={styles.themeToggleContent}>
              <Text style={[styles.themeToggleTitle, isDarkMode && styles.themeToggleTitleDark]}>
                {isDarkMode ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
              </Text>
              <Text style={[styles.themeToggleMeta, isDarkMode && styles.themeToggleMetaDark]}>
                Aktuell: {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <MaterialIcons name="swap-horiz" size={22} color={isDarkMode ? '#FFFFFF' : '#475467'} />
          </Pressable>

          <View style={styles.form}>
            <Text style={styles.keyTitle}>Verschluesselung</Text>
            <Text style={styles.keyHint}>
              {privateKeyAvailable
                ? 'Private Key ist auf diesem Frontend gespeichert.'
                : 'Fuege deinen Private Key hinzu, um persoenliche Eintraege zu entschluesseln.'}
            </Text>
            <View style={styles.keyActionRow}>
              <Pressable style={styles.keyActionButton} onPress={() => setShowKeyWarning(true)}>
                <MaterialIcons name="autorenew" size={20} color="#00684F" />
                <Text style={styles.keyActionText}>Neuen Private Key erzeugen</Text>
              </Pressable>
              <Pressable disabled={!privateKeyAvailable || isKeyLoading} style={[styles.keyActionButton, (!privateKeyAvailable || isKeyLoading) && styles.buttonDisabled]} onPress={toggleQrCode}>
                <MaterialIcons name="qr-code-2" size={20} color="#00684F" />
                <Text style={styles.keyActionText}>{isKeyLoading ? 'Lade Key' : 'QR-Code'}</Text>
              </Pressable>
            </View>
            {showQr && storedPrivateKey ? (
              <View style={styles.qrBox}>
                {isQrLoading || !privateKeyQr || privateKeyQrContent !== storedPrivateKey ? (
                  <View style={styles.qrLoadingBox}>
                    <Text style={styles.keyHint}>QR-Code wird erzeugt...</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(8, Math.round(qrProgress * 100))}%` }]} />
                    </View>
                  </View>
                ) : (
                  <PrivateKeyQrCode qr={privateKeyQr} />
                )}
                <Text style={styles.keyHint}>Diesen QR-Code nur auf vertrauenswuerdigen Geraeten anzeigen.</Text>
                <Text selectable style={styles.privateKeyLabel}>{storedPrivateKey}</Text>
              </View>
            ) : null}
            <Pressable style={styles.keyActionButton} onPress={() => setScannerOpen((current) => !current)}>
              <MaterialIcons name="qr-code-scanner" size={20} color="#00684F" />
              <Text style={styles.keyActionText}>Private Key per QR-Code einlesen</Text>
            </Pressable>
            {scannerOpen ? (
              <View style={styles.scannerBox}>
                {cameraPermission?.granted ? (
                  <CameraView
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => {
                      setPrivateKeyInput(data);
                      setShowManualInput(true);
                      setScannerOpen(false);
                    }}
                    style={styles.camera}
                  />
                ) : (
                  <Pressable style={styles.button} onPress={requestCameraPermission}>
                    <MaterialIcons name="photo-camera" size={22} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Kamera erlauben</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
            <Pressable style={styles.keyActionButton} onPress={() => setShowManualInput((current) => !current)}>
              <MaterialIcons name="edit" size={20} color="#00684F" />
              <Text style={styles.keyActionText}>Private Key manuell eingeben</Text>
            </Pressable>
            {showManualInput ? (
              <TextInput
                multiline
                placeholder="Private Key JSON"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.keyInput]}
                value={privateKeyInput}
                onChangeText={setPrivateKeyInput}
              />
            ) : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} onPress={storePrivateKey}>
              <MaterialIcons name="vpn-key" size={22} color="#FFFFFF" />
              <Text style={styles.buttonText}>Private Key speichern</Text>
            </Pressable>
          </View>

          <Pressable style={styles.secondaryButton} onPress={logout}>
            <MaterialIcons name="logout" size={22} color="#B42318" />
            <Text style={styles.secondaryButtonText}>Abmelden</Text>
          </Pressable>

          {showKeyWarning ? (
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Neuen Private Key erzeugen?</Text>
                <Text style={styles.modalText}>
                  Ein neuer Private Key kann nur Daten entschluesseln, die mit dem passenden neuen Public Key verschluesselt wurden. Bereits vorhandene alte Daten bleiben nur mit dem alten Private Key lesbar.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setShowKeyWarning(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={replacePrivateKey}>
                    <Text style={styles.buttonText}>Bestaetigen</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {showKeyOk ? (
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Private Key erzeugt</Text>
                <Text style={styles.modalText}>Bewahre deinen Private Key sicher auf, um den Zugriff auf verschluesselte Eintraege zu wahren.</Text>
                <Pressable style={styles.button} onPress={() => setShowKeyOk(false)}>
                  <Text style={styles.buttonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          </ScrollView>
        </SwipeableTabView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Einloggen' : 'Account anlegen'}</Text>
          <Text style={styles.subtitle}>
            Admin-Accounts koennen als Admin, Verwalter oder User arbeiten. Verwalter koennen als Verwalter oder User starten.
          </Text>
          <SyncStatusBadge />
        </View>

        <Pressable style={[styles.themeToggle, isDarkMode && styles.themeToggleDark]} onPress={togglePreference}>
          <MaterialIcons name={isDarkMode ? 'light-mode' : 'dark-mode'} size={22} color={isDarkMode ? '#FFD166' : '#00684F'} />
          <View style={styles.themeToggleContent}>
            <Text style={[styles.themeToggleTitle, isDarkMode && styles.themeToggleTitleDark]}>
              {isDarkMode ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
            </Text>
            <Text style={[styles.themeToggleMeta, isDarkMode && styles.themeToggleMetaDark]}>
              Aktuell: {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <MaterialIcons name="swap-horiz" size={22} color={isDarkMode ? '#FFFFFF' : '#475467'} />
        </Pressable>

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
          {generatedPrivateKey ? (
            <View style={styles.keyBox}>
              <Text style={styles.keyTitle}>Dein Private Key</Text>
              <Text style={styles.keyHint}>Nur du kannst ihn sehen. Bewahre ihn sicher auf, bevor du das Frontend wechselst.</Text>
              <Text selectable style={styles.keyText}>{generatedPrivateKey}</Text>
            </View>
          ) : null}
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
      </SwipeableTabView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
    color: '#00684F',
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
    backgroundColor: '#00684F',
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
    minHeight: 48,
    paddingHorizontal: 12,
  },
  comboLabel: {
    color: '#101828',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  chevronIcon: { flexShrink: 0, textAlign: 'center', width: 28 },
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  comboOptionActive: {
    backgroundColor: '#E7F4EF',
  },
  comboOptionText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  comboOptionTextActive: {
    color: '#00684F',
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
    backgroundColor: '#004B3A',
    borderColor: '#004B3A',
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
    backgroundColor: '#00684F',
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
    backgroundColor: '#E7F4EF',
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
    color: '#00684F',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 6,
  },
  themeToggle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    minHeight: 58,
    paddingHorizontal: 14,
  },
  themeToggleDark: {
    backgroundColor: '#101828',
    borderColor: '#344054',
  },
  themeToggleContent: {
    flex: 1,
  },
  themeToggleTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  themeToggleTitleDark: {
    color: '#FFFFFF',
  },
  themeToggleMeta: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  themeToggleMetaDark: {
    color: '#D0D5DD',
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
  keyTitle: { color: '#101828', fontSize: 16, fontWeight: '800' },
  keyHint: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 4 },
  keyInput: { minHeight: 110, textAlignVertical: 'top' },
  keyBox: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, gap: 8, padding: 12 },
  keyText: { color: '#344054', fontSize: 11, lineHeight: 16 },
  privateKeyLabel: { color: '#344054', fontSize: 9, lineHeight: 13 },
  keyActionRow: { flexDirection: 'row', gap: 10 },
  keyActionButton: {
    alignItems: 'center',
    backgroundColor: '#E7F4EF',
    borderColor: '#93D3BA',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
  },
  keyActionText: { color: '#00684F', flexShrink: 1, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  qrBox: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 },
  qrCanvas: { backgroundColor: '#FFFFFF' },
  qrLoadingBox: { alignItems: 'center', backgroundColor: '#FFFFFF', gap: 12, height: qrSize, justifyContent: 'center', paddingHorizontal: 20, width: qrSize },
  progressTrack: { backgroundColor: '#EAECF0', borderRadius: 999, height: 8, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: '#00684F', borderRadius: 999, height: '100%' },
  scannerBox: { backgroundColor: '#101828', borderRadius: 8, minHeight: 260, overflow: 'hidden' },
  camera: { flex: 1, minHeight: 260 },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 24, 40, 0.42)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, gap: 12, maxWidth: 420, padding: 16, width: '100%' },
  modalTitle: { color: '#101828', fontSize: 18, fontWeight: '800' },
  modalText: { color: '#475467', fontSize: 14, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButtonText: { color: '#344054', fontSize: 15, fontWeight: '800' },
});
