import { StyleSheet } from 'react-native';

export const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#00684F', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 14, marginTop: 8 },
  error: { color: '#B42318', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  cardTitle: { color: '#101828', flex: 1, fontSize: 16, fontWeight: '800' },
  status: { color: '#667085', fontSize: 12, fontWeight: '800' },
  statusPending: { color: '#B54708' },
  meta: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
  description: { color: '#475467', fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  acceptButton: { alignItems: 'center', backgroundColor: '#047857', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  rejectButton: { alignItems: 'center', backgroundColor: '#B42318', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
