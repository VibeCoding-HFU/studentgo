import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../styles';
import type { Option } from '../types';

type ComboBoxProps<T extends Option> = {
  disabled?: boolean;
  label: string;
  onChange: (option: T) => void;
  options: T[];
  value: T | null;
};

export function ComboBox<T extends Option>({ disabled, label, onChange, options, value }: ComboBoxProps<T>) {
  const styles = useThemedStyles(baseStyles);
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.comboBox, open && styles.comboBoxOpen]}>
      <Text style={styles.comboTitle}>{label}</Text>
      <Pressable disabled={disabled} style={[styles.comboButton, disabled && styles.disabled]} onPress={() => setOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{value?.shortname ?? value?.name ?? 'Auswaehlen'}</Text>
        <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
      </Pressable>
      {open && !disabled ? (
        <View style={styles.comboMenu}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.comboMenuScroll}>
            {options.map((option) => (
              <Pressable key={String(option.id)} style={styles.comboOption} onPress={() => { onChange(option); setOpen(false); }}>
                <Text style={styles.comboOptionText}>{option.shortname ? `${option.shortname} - ${option.name}` : option.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
