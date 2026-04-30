const fs = require('fs');
const path = require('path');

const settingsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts',
);

if (!fs.existsSync(settingsPath)) {
  process.exit(0);
}

const current = fs.readFileSync(settingsPath, 'utf8');
const patched = current.replace(
  'org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")',
  'org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")',
);

if (patched !== current) {
  fs.writeFileSync(settingsPath, patched);
  console.log('Patched @react-native/gradle-plugin Foojay resolver to 1.0.0 for Gradle 9.');
}
