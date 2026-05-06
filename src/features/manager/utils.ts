import type { Action, ChangeRequest, ManagerItem } from './types';

export const emptyContact = { email: '', name: '', phone: '', role: '', room: '' };
export const emptyMeal = { canteenName: '', currency: 'EUR', date: '', day: '', mainDish: '', priceCents: '', vegetarianDish: '' };
export const emptyLesson = { date: '', day: '', description: '', endTime: '09:45', isRecurring: false, lecturer: '', room: '', startTime: '08:15', title: '' };
export const emptyInfo = { category: 'Allgemein', content: '', title: '' };
export const actions: Action[] = ['CREATE', 'UPDATE', 'DELETE'];
export const currencyOptions = ['EUR', 'USD', 'CHF'].map((currency) => ({ id: currency, name: currency }));

export function formatDate(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value;
}

export function formatFullDate(value: string) {
  if (!value) {
    return 'Datum auswaehlen';
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function statusLabel(status: ChangeRequest['status']) {
  if (status === 'APPROVED') {
    return 'Angenommen';
  }

  if (status === 'REJECTED') {
    return 'Abgelehnt';
  }

  return 'Offen';
}

export function actionLabel(action: Action) {
  if (action === 'UPDATE') {
    return 'Bearbeiten';
  }

  if (action === 'DELETE') {
    return 'Loeschen';
  }

  return 'Anlegen';
}

export function itemMeta(item: ManagerItem) {
  if ('email' in item) {
    return item.email;
  }

  if ('date' in item) {
    return item.date ? formatDate(item.date) : 'day' in item ? item.day : '';
  }

  if ('day' in item) {
    return item.day;
  }

  return item.category;
}
