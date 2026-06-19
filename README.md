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

### GitHub Actions APK-Build

Nach erfolgreichem Quality Gate und Docker-Build erzeugt `.github/workflows/android-apk.yml` eine ARM64-Release-APK. Pull Requests erhalten eine mit dem Android-Debug-Key signierte Test-APK. Auf `main` und bei signierten manuellen Laeufen wird das geschuetzte GitHub Environment `android-release` verwendet.

Repository-Variable:

```env
APP_API_URL="https://dein-backend.example.com"
```

Secrets im Environment `android-release`:

```env
ANDROID_KEYSTORE_BASE64="..."
ANDROID_KEYSTORE_PASSWORD="..."
ANDROID_KEY_ALIAS="studentgo"
ANDROID_KEY_PASSWORD="..."
```

Der Keystore wird nur waehrend des Workflows dekodiert. Nach `expo prebuild` passt der Workflow die generierte Gradle-Konfiguration so an, dass der Release-Build diese Secrets verwendet. EAS wird dafuer nicht benoetigt.

Keystore und Base64-Wert koennen lokal erzeugt werden:

```bash
keytool -genkeypair -v \
  -keystore studentgo-release.keystore \
  -alias studentgo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

base64 -w0 studentgo-release.keystore
```

## Docker: Web-App und Backend

Die Web-Version kann zusammen mit dem Backend als zwei Container gestartet werden. Das Frontend wird als statischer Expo-Web-Build erzeugt und per Nginx ausgeliefert; `/api/*` und `/health` werden intern an das Backend weitergeleitet.

### Docker Dev

Die lokale Compose-Konfiguration baut beide Images direkt aus dem Repository:

```bash
docker compose up --build
```

Danach ist die App unter `http://localhost:8080` erreichbar. Das Backend wird nicht direkt nach aussen veroeffentlicht; der Healthcheck ist ueber `http://localhost:8080/health` erreichbar.

Die Dev-SQLite-Datenbank liegt persistent im Docker-Volume `studentgo-dev-data`. Migrationen werden beim Start des Backend-Containers automatisch mit `prisma migrate deploy` angewendet. Seed-Daten werden nicht automatisch eingespielt, damit bestehende Daten nicht ueberschrieben werden.

### Docker Images bauen und pushen

Der GitHub-Workflow `.github/workflows/docker-ghcr.yml` baut Backend und Frontend fuer `linux/arm64`. Nach erfolgreichem Quality Gate werden Pull Requests nur gebaut. Pushes auf `main` veroeffentlichen beide Images mit `latest` und dem Commit-SHA:

```bash
ghcr.io/vibecoding-hfu/studentgo/backend:latest
ghcr.io/vibecoding-hfu/studentgo/frontend:latest
```

Fuer lokale ARM64-Builds, beispielsweise fuer einen Raspberry Pi 5, muss ein Buildx-Builder mit QEMU vorhanden sein:

```bash
docker run --privileged --rm tonistiigi/binfmt --install arm64
docker buildx create --name studentgo-builder --driver docker-container --use
docker buildx inspect --bootstrap
```

Danach beide Images lokal bauen:

```bash
STUDENTGO_PLATFORM="linux/arm64/v8" \
docker compose build
```

### Docker Production

Production baut nicht lokal, sondern zieht die Images aus der Registry:

```bash
STUDENTGO_BACKEND_IMAGE="ghcr.io/vibecoding-hfu/studentgo/backend:latest" \
STUDENTGO_FRONTEND_IMAGE="ghcr.io/vibecoding-hfu/studentgo/frontend:latest" \
DOCKER_CORS_ORIGIN="https://deine-domain.example" \
DOCKER_APP_URL="https://deine-domain.example" \
docker compose -f docker-compose.prod.yml pull

STUDENTGO_BACKEND_IMAGE="ghcr.io/vibecoding-hfu/studentgo/backend:latest" \
STUDENTGO_FRONTEND_IMAGE="ghcr.io/vibecoding-hfu/studentgo/frontend:latest" \
DOCKER_CORS_ORIGIN="https://deine-domain.example" \
DOCKER_APP_URL="https://deine-domain.example" \
docker compose -f docker-compose.prod.yml up -d
```

In Production liegt die SQLite-Datenbank im Docker-Volume `studentgo-data`.

Nuetzliche Docker-Umgebungsvariablen:

```env
FRONTEND_PORT="8080"
DOCKER_CORS_ORIGIN="http://localhost:8080"
DOCKER_APP_URL="http://localhost:8080"
MENSA_API_KEY="your_api_key_here"
STUDENTGO_BACKEND_IMAGE="registry.example.com/studentgo-backend:tag"
STUDENTGO_FRONTEND_IMAGE="registry.example.com/studentgo-frontend:tag"
STUDENTGO_PLATFORM="linux/arm64/v8"
```

Wenn `FRONTEND_PORT` geaendert wird, muessen `DOCKER_CORS_ORIGIN` und `DOCKER_APP_URL` passend gesetzt werden.

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
npm run typecheck
npm test
```

Die GitHub-Actions-Pipeline kann lokal mit [`act`](https://github.com/nektos/act) ausgefuehrt werden:

```bash
cp .secrets.example .secrets
cp .vars.example .vars
# Platzhalter in .secrets und .vars durch lokale Testwerte ersetzen.
bash scripts/run-actions-local.sh
```

Der lokale Standardlauf baut Quality Gate, beide ARM64-Images und eine signierte APK vollstaendig. `.secrets` und `.vars` sind von Git ausgeschlossen. Ein schneller APK-Test ohne Release-Secrets ist mit `bash scripts/run-actions-local.sh --input release_signing=false` moeglich.
