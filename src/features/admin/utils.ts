import type { ChangeRequest } from './api';

export function requestTitle(request: ChangeRequest) {
  const entity =
    request.entity === 'CONTACT'
      ? 'Kontakt'
      : request.entity === 'DEADLINE'
        ? 'Frist'
        : request.entity === 'MEAL'
          ? 'Mensa'
          : request.entity === 'LESSON'
            ? 'Plan'
            : 'Info';
  const action = request.action === 'CREATE' ? 'anlegen' : request.action === 'UPDATE' ? 'bearbeiten' : 'loeschen';
  return `${entity} ${action}`;
}
