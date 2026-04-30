import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';

type Meal = {
  canteen: { name: string };
  currency: string;
  day: string;
  date?: string | null;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

type GroupedMeals = {
  canteenName: string;
  day: string;
  id: string;
  meals: Meal[];
};

function mealLabel(meal: Meal, index: number) {
  return meal.mainDish.match(/^Essen\s+\d+/i)?.[0] ?? `Essen ${index + 1}`;
}

function mealTitle(meal: Meal) {
  return meal.mainDish.replace(/^Essen\s+\d+\s*:\s*/i, '').trim();
}

export default function MensaScreen() {
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [meals, setMeals] = useState<Meal[]>([]);
  const groupedMeals = useMemo(() => {
    const groups = new Map<string, GroupedMeals>();

    meals.forEach((meal) => {
      const groupId = `${meal.date ?? meal.day}-${meal.canteen.name}`;
      const existingGroup = groups.get(groupId);

      if (existingGroup) {
        existingGroup.meals.push(meal);
        return;
      }

      groups.set(groupId, {
        canteenName: meal.canteen.name,
        day: meal.day,
        id: groupId,
        meals: [meal],
      });
    });

    return [...groups.values()];
  }, [meals]);

  const loadMeals = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/meals`);

    if (response.ok) {
      setMeals((await response.json()) as Meal[]);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Mensaplan</Text>
          <Text style={styles.title}>Aktueller Wochenplan</Text>
          <Text style={styles.subtitle}>Vom Admin bestaetigte Mensa-Eintraege.</Text>
        </View>

        <View style={styles.summary}>
          <MaterialIcons name="restaurant" size={28} color="#FFFFFF" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Diese Woche</Text>
            <Text style={styles.summaryMeta}>{meals.length} gespeicherte Mensa-Angebote</Text>
          </View>
        </View>

        <View style={styles.dayList}>
          {meals.length === 0 ? <Text style={styles.empty}>Keine Mensa-Eintraege vorhanden.</Text> : null}
          {groupedMeals.map((group) => (
            <View key={group.id} style={styles.dayCard}>
              <Text style={styles.day}>{group.day} · {group.canteenName}</Text>
              <View style={styles.mealList}>
                {group.meals.map((meal, index) => {
                  const title = mealTitle(meal);
                  const vegetarianDish = meal.vegetarianDish?.trim();
                  const showVegetarianDish = vegetarianDish && vegetarianDish !== title;

                  return (
                    <View key={meal.id} style={[styles.mealItem, index > 0 && styles.mealItemDivider]}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealLabel}>{mealLabel(meal, index)}</Text>
                        <Text style={styles.price}>{(meal.priceCents / 100).toFixed(2)} {meal.currency}</Text>
                      </View>
                      <Text style={styles.mealTitle}>{title}</Text>
                      {showVegetarianDish ? <Text style={styles.mealAlt}>{vegetarianDish}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#16A085', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8 },
  summary: { alignItems: 'center', backgroundColor: '#0E6F63', borderRadius: 8, flexDirection: 'row', gap: 14, marginBottom: 18, padding: 18 },
  summaryText: { flex: 1 },
  summaryTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  summaryMeta: { color: '#D6F3EC', fontSize: 14, lineHeight: 20, marginTop: 3 },
  dayList: { gap: 12 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  dayCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 16 },
  day: { color: '#16A085', fontSize: 13, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  mealList: { gap: 12 },
  mealItem: { gap: 6 },
  mealItemDivider: { borderColor: '#EAECF0', borderTopWidth: 1, paddingTop: 12 },
  mealHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  mealLabel: { color: '#344054', fontSize: 13, fontWeight: '800' },
  mealTitle: { color: '#101828', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  mealAlt: { color: '#475467', fontSize: 14, lineHeight: 20 },
  price: { color: '#B54708', flexShrink: 0, fontSize: 14, fontWeight: '800' },
});
