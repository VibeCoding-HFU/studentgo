import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Role, roleLabel, roles } from '@/src/shared/types/auth';
import { baseStyles } from '../styles';

export function RoleComboBox({ value, onChange }: { onChange: (role: Role) => void; value: Role }) {
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
