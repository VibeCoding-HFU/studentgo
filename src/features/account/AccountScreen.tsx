import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { useAuth } from '@/contexts/auth-context';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { generateAccountKeyPair, getPrivateKey, hasPrivateKey, publicKeyFromPrivateKey, publicKeyValueIncludes, savePrivateKey } from '@/lib/client-crypto';
import { Role, roleLabel } from '@/src/shared/types/auth';
import { AuthFormScreen } from './components/AuthFormScreen';
import { PrivateKeyQrCode, qrPath, type PrivateKeyQr } from './components/PrivateKeyQrCode';
import { baseStyles } from './styles';

type Mode = 'login' | 'register';

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
    <AuthFormScreen
      confirmationToken={confirmationToken}
      email={email}
      error={error}
      generatedPrivateKey={generatedPrivateKey}
      isDarkMode={isDarkMode}
      isSubmitting={isSubmitting}
      message={message}
      mode={mode}
      name={name}
      onConfirmAccount={confirmAccount}
      onEmailChange={setEmail}
      onModeChange={setMode}
      onNameChange={setName}
      onPasswordChange={setPassword}
      onRoleChange={setRole}
      onSubmit={submit}
      onTogglePreference={togglePreference}
      onTokenChange={setConfirmationToken}
      password={password}
      role={role}
    />
  );
}
