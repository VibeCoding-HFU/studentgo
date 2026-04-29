import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';

type Meal = {
  canteen: { name: string };
  currency: string;
  day: string;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

export default function MensaScreen() {
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [meals, setMeals] = useState<Meal[]>([]);

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

        <View style={styles.mealList}>
          {meals.length === 0 ? <Text style={styles.empty}>Keine Mensa-Eintraege vorhanden.</Text> : null}
          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <Text style={styles.day}>{meal.day} · {meal.canteen.name}</Text>
              <Text style={styles.mealTitle}>{meal.mainDish}</Text>
              {meal.vegetarianDish ? <Text style={styles.mealAlt}>Vegetarisch: {meal.vegetarianDish}</Text> : null}
              <Text style={styles.price}>{(meal.priceCents / 100).toFixed(2)} {meal.currency}</Text>
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
  mealList: { gap: 12 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  mealCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 16 },
  day: { color: '#16A085', fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  mealTitle: { color: '#101828', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  mealAlt: { color: '#475467', fontSize: 14, lineHeight: 20, marginTop: 6 },
  price: { color: '#B54708', fontSize: 14, fontWeight: '800', marginTop: 10 },
});
