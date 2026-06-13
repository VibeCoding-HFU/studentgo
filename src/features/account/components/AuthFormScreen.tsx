import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleHeader } from '@/components/module-header';
import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Role } from '@/src/shared/types/auth';
import { baseStyles } from '../styles';
import { RoleComboBox } from './RoleComboBox';

type Mode = 'login' | 'register';

type AuthFormScreenProps = {
  confirmationToken: string;
  email: string;
  error: string;
  generatedPrivateKey: string;
  isDarkMode: boolean;
  isSubmitting: boolean;
  message: string;
  mode: Mode;
  name: string;
  onConfirmAccount: () => void;
  onEmailChange: (value: string) => void;
  onModeChange: (value: Mode) => void;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: Role) => void;
  onSubmit: () => void;
  onTogglePreference: () => void;
  onTokenChange: (value: string) => void;
  password: string;
  role: Role;
};

export function AuthFormScreen({
  confirmationToken,
  email,
  error,
  generatedPrivateKey,
  isDarkMode,
  isSubmitting,
  message,
  mode,
  name,
  onConfirmAccount,
  onEmailChange,
  onModeChange,
  onNameChange,
  onPasswordChange,
  onRoleChange,
  onSubmit,
  onTogglePreference,
  onTokenChange,
  password,
  role,
}: AuthFormScreenProps) {
  const styles = useThemedStyles(baseStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ModuleHeader
            accent="#7A2E27"
            icon="account-circle"
            kicker="Account"
            title={mode === 'login' ? 'Einloggen' : 'Account anlegen'}
            subtitle="Admin-Accounts koennen als Admin, Verwalter oder User arbeiten. Verwalter koennen als Verwalter oder User starten."
          />
        </View>

        <Pressable style={[styles.themeToggle, isDarkMode && styles.themeToggleDark]} onPress={onTogglePreference}>
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
          <Pressable accessibilityRole="button" style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]} onPress={() => onModeChange('login')}>
            <MaterialIcons name="login" size={20} color={mode === 'login' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Login</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]} onPress={() => onModeChange('register')}>
            <MaterialIcons name="person-add" size={20} color={mode === 'register' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Neu</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput autoCapitalize="words" placeholder="Name" placeholderTextColor="#98A2B3" style={styles.input} value={name} onChangeText={onNameChange} />
          )}
          <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-Mail" placeholderTextColor="#98A2B3" style={styles.input} value={email} onChangeText={onEmailChange} />
          <TextInput placeholder="Passwort" placeholderTextColor="#98A2B3" secureTextEntry style={styles.input} value={password} onChangeText={onPasswordChange} />

          <RoleComboBox value={role} onChange={onRoleChange} />

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {generatedPrivateKey ? (
            <View style={styles.keyBox}>
              <Text style={styles.keyTitle}>Dein Private Key</Text>
              <Text style={styles.keyHint}>Nur du kannst ihn sehen. Bewahre ihn sicher auf, bevor du das Frontend wechselst.</Text>
              <Text selectable style={styles.keyText}>{generatedPrivateKey}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={isSubmitting} style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={onSubmit}>
            <MaterialIcons name={mode === 'login' ? 'login' : 'person-add'} size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>{isSubmitting ? 'Bitte warten' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}</Text>
          </Pressable>
        </View>

        {mode === 'register' ? (
          <View style={styles.form}>
            <TextInput autoCapitalize="none" placeholder="Bestaetigungscode" placeholderTextColor="#98A2B3" style={styles.input} value={confirmationToken} onChangeText={onTokenChange} />
            <Pressable disabled={isSubmitting} style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={onConfirmAccount}>
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
