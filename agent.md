# Agent-Anweisungen fuer StudentGo

## Projektkontext

StudentGo ist eine Expo/React-Native-App mit Expo Router, einem lokalen Express-Backend und Prisma mit SQLite. Die App lebt vor allem unter `app/`, wiederverwendbare UI- und Plattformhelfer unter `components/`, `hooks/`, `contexts/`, `constants/` und `lib/`. Backend-Code liegt unter `backend/src/`, Prisma-Schema, Seeds und Migrationen unter `prisma/`.

## Arbeitsweise

- Lies zuerst die betroffenen Dateien und folge den vorhandenen Mustern.
- Halte Aenderungen klein, nachvollziehbar und auf die Aufgabe begrenzt.
- Beruehre keine bestehenden uncommitted Changes, wenn sie nicht klar zur Aufgabe gehoeren.
- Aendere keine generierten Dateien oder Assets, ausser die Aufgabe verlangt es ausdruecklich.
- Verwende TypeScript strikt und vermeide `any`, wenn ein lokaler Typ sinnvoll ableitbar ist.
- Bevorzuge vorhandene Komponenten, Theme-Konstanten und Hooks gegenueber neuen Einmal-Abstraktionen.
- Plattformunterschiede gehoeren in vorhandene `.native.ts`, `.web.ts` oder aehnliche lokale Patterns.

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

- Backend-Endpunkte gehoeren nach `backend/src/server.ts`, Datenbankzugriff ueber den Prisma-Client aus `backend/src/prisma.ts`.
- Schema-Aenderungen zuerst in `prisma/schema.prisma` modellieren und danach passende Prisma-Befehle ausfuehren.
- Keine Geheimnisse oder lokalen Pfade einchecken. Konfiguration gehoert in `.env` oder bestehende Konstanten.
- API-Antworten sollten stabile, einfache JSON-Strukturen behalten, damit die App offlinefaehig bleiben kann.

## Nuetzliche Befehle

```bash
npm install
npm run lint
npm run start
npm run web
npm run backend:dev
npm run db:generate
npm run db:push
npm run db:seed
```

## Qualitaetscheck vor Abschluss

- `npm run lint` ausfuehren, wenn die Aenderung TypeScript, React-Komponenten oder Backend-Code betrifft.
- Bei Prisma-Aenderungen `npm run db:generate` und, falls passend, `npm run db:push` oder `npm run db:migrate` ausfuehren.
- Bei UI-Aenderungen mindestens pruefen, ob die betroffenen Screens ohne offensichtliche Layout-Probleme starten.
- In der Abschlussnotiz nennen, welche Dateien geaendert wurden und welche Checks gelaufen sind.

## Kommunikationsstil

- Antworte kurz, konkret und in Deutsch, sofern der Nutzer Deutsch verwendet.
- Erklaere relevante Entscheidungen, aber vermeide lange Theorie.
- Wenn Annahmen noetig sind, benenne sie klar und waehle die konservativste Option.
