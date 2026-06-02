# StudentGo

StudentGo ist eine Expo/React-Native-App mit lokalem Express-Backend und Prisma/SQLite-Datenbank.

Wichtig: Die App verwendet native Crypto-Abhaengigkeiten (`react-native-quick-crypto`, `react-native-nitro-modules`, `react-native-quick-base64`, `react-native-get-random-values`). Dadurch reicht Expo Go fuer die native App nicht aus. Fuer Android/iOS muss ein Development Build mit `expo run:android` oder `expo run:ios` gebaut werden.

## Voraussetzungen

- Node.js und npm
- Android Studio mit Android Emulator oder ein per USB verbundenes Android-Geraet
- Fuer iOS: macOS mit Xcode und iOS Simulator
- Optional: Expo CLI ueber `npx expo ...` verwenden, eine globale Installation ist nicht noetig

## Installation

1. Abhaengigkeiten installieren:

   ```bash
   npm install
   ```

   Der `postinstall`-Schritt patcht automatisch das React-Native-Gradle-Plugin fuer Gradle 9. Nach dem Loeschen von `node_modules` deshalb immer wieder `npm install` ausfuehren.

2. Lokale Umgebungsvariablen anlegen:

   ```bash
   cp .env.example .env
   ```

   Standardwerte:

   ```env
   DATABASE_URL="file:./dev.db"
   PORT="3001"
   CORS_ORIGIN="http://localhost:8081"
   ```

3. Prisma vorbereiten und lokale Datenbank befuellen:

   ```bash
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

   Wenn bereits eine lokale Datenbank aus dem alten `main`-Workflow mit `db:push` existiert, stattdessen einmalig zuerst ausfuehren:

   ```bash
   npm run db:adopt-main
   ```

   Das markiert die neue Prisma-Baseline als angewendet und spielt danach nur noch die fehlenden Folgemigrationen ein, ohne die vorhandene Datenbank zurueckzusetzen.

## Starten

### Backend

Das Backend laeuft standardmaessig auf `http://localhost:3001`.

```bash
npm run backend:dev
```

Nuetzliche Endpunkte:

- `GET /health`
- `GET /api/contacts`
- `POST /api/contacts`
- `GET /api/canteens`
- `GET /api/meals`
- `POST /api/meals`
- `GET /api/deadlines`
- `POST /api/deadlines`
- `GET /api/study-info`
- `GET /api/schedule`

### App im Browser

Die Web-Version kann ohne Native Build gestartet werden:

```bash
npm run web
```

### App auf Android/iOS

Wegen der nativen Crypto-Library muss die native App als Development Build gestartet werden:

```bash
npm run android
```

oder auf macOS:

```bash
npm run ios
```

Danach kann der Metro-Bundler auch separat gestartet werden:

```bash
npm run start
```

Oeffne die App dann im zuvor gebauten Development Build, nicht in Expo Go.

## Native Crypto: haeufige Stolperstellen

- Expo Go unterstuetzt `react-native-quick-crypto` nicht. Fehlermeldungen wie `Android-Verschluesselung benoetigt einen neu gebauten Dev-Client...` bedeuten, dass die App nicht mit dem passenden Development Build laeuft.
- Nach Aenderungen an nativen Abhaengigkeiten oder Expo-Config-Plugins erneut bauen:

  ```bash
  npm run android
  ```

  bzw.

  ```bash
  npm run ios
  ```

- Nach dem Loeschen von `node_modules` immer zuerst `npm install` ausfuehren, damit der `postinstall`-Patch angewendet wird.
- Die relevanten nativen Abhaengigkeiten stehen in `package.json`; das Config-Plugin `react-native-quick-crypto` ist in `app.json` eingetragen.

## Datenbankbefehle

```bash
npm run db:generate  # Prisma Client generieren
npm run db:deploy    # Vorhandene Migrationen auf eine leere/neue DB anwenden
npm run db:adopt-main # Bestehende main-DB in die neue Migrationshistorie uebernehmen
npm run db:push      # Schema in die lokale SQLite-Datenbank schreiben
npm run db:seed      # Seed-Daten einfuegen
npm run db:studio    # Prisma Studio starten
```

## API-URL der App

Die App verwendet standardmaessig `http://localhost:3001`. Bei echten Geraeten zeigt `localhost` jedoch auf das Geraet selbst. Dann kann die Backend-URL ueber `EXPO_PUBLIC_API_URL` gesetzt werden, zum Beispiel:

```bash
EXPO_PUBLIC_API_URL="http://192.168.178.20:3001" npm run start
```

Die IP-Adresse muss die Adresse des Entwicklungsrechners im selben Netzwerk sein.

## Entwicklung

- App-Routen liegen im Ordner `app`.
- Gemeinsame Kontexte liegen in `contexts`.
- Clientseitige Crypto-Helfer liegen in `lib/client-crypto.*`.
- Backend-Code liegt in `backend/src`.
- Prisma-Schema und Seeds liegen in `prisma`.

Weitere Checks:

```bash
npm run lint
```
