import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../styles';
import type { Action, Option } from '../types';
import { actionLabel, actions } from '../utils';

type ComboBoxProps<T extends Option> = {
  disabled?: boolean;
  label: string;
  onChange: (option: T) => void;
  options: T[];
  value: T | null;
};

export function ComboBox<T extends Option>({ disabled, label, onChange, options, value }: ComboBoxProps<T>) {
  const styles = useThemedStyles(baseStyles);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.comboBox, isOpen && styles.comboBoxOpen]}>
      <Text style={styles.comboTitle}>{label}</Text>
      <Pressable accessibilityRole="combobox" disabled={disabled} style={[styles.comboButton, disabled && styles.buttonDisabled]} onPress={() => setIsOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{value?.shortname ?? value?.name ?? 'Auswaehlen'}</Text>
        <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
      </Pressable>
      {isOpen && !disabled ? (
        <View style={styles.comboMenu}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.comboMenuScroll}>
            {options.map((option) => (
              <Pressable
                key={String(option.id)}
                style={[styles.comboOption, value?.id === option.id && styles.comboOptionActive]}
                onPress={() => {
                  onChange(option);
                  setIsOpen(false);
                }}>
                <Text style={[styles.comboOptionText, value?.id === option.id && styles.comboOptionTextActive]}>
                  {option.shortname ? `${option.shortname} - ${option.name}` : option.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function ActionComboBox({ value, onChange }: { onChange: (action: Action) => void; value: Action }) {
  const actionOptions = actions.map((nextAction) => ({ id: nextAction, name: actionLabel(nextAction) }));
  const selectedAction = actionOptions.find((option) => option.id === value) ?? actionOptions[0];

  return <ComboBox label="Aktion" options={actionOptions} value={selectedAction} onChange={(option) => onChange(option.id as Action)} />;
}
