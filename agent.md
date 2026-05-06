# Agent-Anweisungen fuer StudentGo

## Projektkontext

StudentGo ist eine Expo/React-Native-App mit Expo Router, einem lokalen Express-Backend und Prisma mit SQLite. Route-Dateien unter `app/` sollen duenn bleiben und Feature-Screens aus `src/features/*` rendern. Wiederverwendbare UI- und Plattformhelfer liegen aktuell noch teils unter `components/`, `hooks/`, `contexts/`, `constants/` und `lib/`; neue fachliche App-Logik bevorzugt unter `src/features` oder `src/shared` ablegen. Backend-Code liegt unter `backend/src/`, Prisma-Schema, Seeds und Migrationen unter `prisma/`.

## Arbeitsweise

- Lies zuerst die betroffenen Dateien und folge den vorhandenen Mustern.
- Halte Aenderungen klein, nachvollziehbar und auf die Aufgabe begrenzt.
- Beruehre keine bestehenden uncommitted Changes, wenn sie nicht klar zur Aufgabe gehoeren.
- Aendere keine generierten Dateien oder Assets, ausser die Aufgabe verlangt es ausdruecklich.
- Verwende TypeScript strikt und vermeide `any`, wenn ein lokaler Typ sinnvoll ableitbar ist.
- Bevorzuge vorhandene Komponenten, Theme-Konstanten und Hooks gegenueber neuen Einmal-Abstraktionen.
- Plattformunterschiede gehoeren in vorhandene `.native.ts`, `.web.ts` oder aehnliche lokale Patterns.
- Keine generierten Ordner bearbeiten, insbesondere nicht `backend/generated/`, `dist/`, `.expo/`, `android/` oder Prisma-Client-Ausgaben. Stattdessen Schema/Quellcode anpassen und Generatoren laufen lassen.
- Bugreports, Datenbanken, ZIPs und lokale Artefakte gehoeren nicht ins Repo. Wenn solche Dateien auftauchen, nicht anfassen ausser die Aufgabe verlangt Repo-Hygiene; dann gezielt ignorieren oder entfernen lassen.

## Commit-Regelung

- Fuer jeden abgeschlossenen Auftrag wird genau ein eigener Commit erstellt.
- Ein Auftrag gilt als abgeschlossen, wenn die angeforderte Aenderung umgesetzt, sinnvoll geprueft und dem Nutzer kurz zusammengefasst wurde.
- Vor dem Commit den Arbeitsbaum pruefen und nur Dateien stagen, die zur erledigten Aufgabe gehoeren.
- Bestehende uncommitted Changes anderer Auftraege oder des Nutzers duerfen nicht ungefragt mitcommittet, geloescht oder zurueckgesetzt werden.
- Wenn der Auftrag mehrere unabhaengige Themen enthaelt, lieber nachfragen oder die Themen in getrennte Folgeauftraege aufteilen.
- Commit-Messages kurz und aussagekraeftig formulieren, bevorzugt im Imperativ.
- Empfohlenes Format: `<typ>: <kurze beschreibung>`, zum Beispiel `docs: add agent workflow rules` oder `feat: add offline sync status`.
- Nur committen, wenn die relevanten Checks gelaufen sind oder klar dokumentiert ist, warum sie nicht ausgefuehrt wurden.

## Frontend-Regeln

- Die Hauptnavigation verwendet Expo Router und Tabs unter `app/(tabs)/`.
- UI soll mobil zuerst gedacht sein und auf Web nicht brechen.
- Nutze bestehende Theme-Farben aus `constants/theme.ts` und thematische Helfer wie `useThemeColor` oder `useThemedStyles`.
- Wiederkehrende Status-, Sync-, Auth- und Offline-Logik gehoert in die bestehenden Contexts oder Lib-Helfer.
- Touch-Ziele, leere Zustaende, Ladezustaende und Fehlerzustaende mitdenken.

## Backend- und Datenregeln

- `backend/src/server.ts` startet nur den HTTP-Server. Express-App, Middleware und Routenregistrierung gehoeren nach `backend/src/app.ts`.
- Neue Backend-Endpunkte gehoeren in passende Module unter `backend/src/modules/<domain>/`. Routes sollen HTTP-Parsing/Antworten uebernehmen, Services Businesslogik, Repositories Prisma-Zugriffe.
- Datenbankzugriff laeuft ueber den Prisma-Client aus `backend/src/prisma.ts`.
- Fuer request bodies/params vorhandene Validatoren aus `backend/src/shared/validation.ts` oder modulspezifische Schemas nutzen. Keine rohen `request.body`-Werte direkt in Prisma schreiben.
- Mutierende Endpunkte muessen explizite Auth-/Rollenregeln haben. Globale Ressourcen wie Mahlzeiten und Deadlines nur fuer Manager/Admins oder ueber Change-Requests aenderbar machen.
- Auth-/Security-Baselines erhalten: keine Tokens/Confirmation-Codes in Production-Logs, CORS nur mit expliziten Origins, JSON-Body-Limits, Security-Header und Rate-Limits fuer Login/Register/Confirm.
- Owner-Scoping beachten: persoenliche Daten immer nach `session.userId` filtern und nicht nur nach IDs aus Params.
- Schema-Aenderungen zuerst in `prisma/schema.prisma` modellieren und danach passende Prisma-Befehle ausfuehren.
- Keine Geheimnisse oder lokalen Pfade einchecken. Konfiguration gehoert in `.env` oder bestehende Konstanten.
- API-Antworten sollten stabile, einfache JSON-Strukturen behalten, damit die App offlinefaehig bleiben kann.
- Web-Storage ist fuer Tokens und Private Keys sensibel. Keine neuen Secrets in `localStorage` einfuehren; bevorzugt SecureStore/native Patterns oder ein bewusstes Auth-Konzept mit HttpOnly Cookies.

## Testregeln

- Tests nutzen den Node-Test-Runner mit `tsx`; keine neue Test-Library einfuehren, wenn `node:test` reicht.
- Unit-Tests gehoeren nach `backend/test/*.test.ts` fuer pure Helpers, Policies, Validatoren und Services ohne HTTP.
- Integrationstests duerfen die echte Express-App testen. In der Sandbox kein echtes `app.listen(0)` voraussetzen; Express kann direkt ueber `app.handle` dispatcht werden.
- Integrationstests sollen isolierte temporaere SQLite-Datenbanken verwenden und ihr minimales Schema selbst anlegen oder sauber vorbereiten. Nicht von lokaler `dev.db` abhaengen.
- Wenn Tests Module importieren, die Prisma initialisieren, vorher `process.env.DATABASE_URL` setzen.

## Nuetzliche Befehle

```bash
npm install
npm run lint
npm test
npm run test:unit
npm run test:integration
npx tsc --noEmit
npm run start
npm run web
npm run backend:dev
npm run db:generate
npm run db:push
npm run db:seed
```

## Qualitaetscheck vor Abschluss

- `npm run lint` ausfuehren, wenn die Aenderung TypeScript, React-Komponenten oder Backend-Code betrifft.
- `npm test` ausfuehren, wenn Backend, Auth, Security, Validatoren, API-Verhalten oder Datenlogik betroffen sind.
- `npx tsc --noEmit` ausfuehren, wenn neue Tests, Typen, Module oder groessere TypeScript-Aenderungen dazugekommen sind.
- Bei Prisma-Aenderungen `npm run db:generate` und, falls passend, `npm run db:push` oder `npm run db:migrate` ausfuehren.
- Bei UI-Aenderungen mindestens pruefen, ob die betroffenen Screens ohne offensichtliche Layout-Probleme starten.
- In der Abschlussnotiz nennen, welche Dateien geaendert wurden und welche Checks gelaufen sind.

## Kommunikationsstil

- Antworte kurz, konkret und in Deutsch, sofern der Nutzer Deutsch verwendet.
- Erklaere relevante Entscheidungen, aber vermeide lange Theorie.
- Wenn Annahmen noetig sind, benenne sie klar und waehle die konservativste Option.
