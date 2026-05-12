import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { addDays, dayNames, formatDisplayDate, startOfWeek, toInputDate } from '@/src/shared/utils/dates';
import { baseStyles } from '../styles';

export function WeekDatePicker({ value, onChange }: { onChange: (date: string) => void; value: string }) {
  const styles = useThemedStyles(baseStyles);
  const selectedDate = value ? new Date(`${value}T12:00:00`) : new Date();
  const [pickerWeek, setPickerWeek] = useState(startOfWeek(selectedDate));
  const days = dayNames.map((day, index) => {
    const date = addDays(pickerWeek, index);
    return { day, date, value: toInputDate(date) };
  });

  return (
    <View style={styles.datePicker}>
      <View style={styles.datePickerHeader}>
        <Pressable style={styles.smallIconButton} onPress={() => setPickerWeek((current) => addDays(current, -7))}>
          <MaterialIcons name="chevron-left" size={22} color="#00684F" />
        </Pressable>
        <Text style={styles.datePickerTitle}>{formatDisplayDate(pickerWeek)} - {formatDisplayDate(addDays(pickerWeek, 6))}</Text>
        <Pressable style={styles.smallIconButton} onPress={() => setPickerWeek((current) => addDays(current, 7))}>
          <MaterialIcons name="chevron-right" size={22} color="#00684F" />
        </Pressable>
      </View>
      <View style={styles.dateGrid}>
        {days.map((day) => (
          <Pressable key={day.value} style={[styles.dateChip, value === day.value && styles.dateChipActive]} onPress={() => onChange(day.value)}>
            <Text style={[styles.dateChipDay, value === day.value && styles.dateChipTextActive]}>{day.day.slice(0, 2)}</Text>
            <Text style={[styles.dateChipDate, value === day.value && styles.dateChipTextActive]}>{formatDisplayDate(day.date)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
