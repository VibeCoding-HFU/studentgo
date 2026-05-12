import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { toQR } from 'toqr';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../styles';

const qrSize = 260;
const qrQuietZone = 4;

export function qrPath(content: string) {
  const matrix = toQR(content);
  const size = Math.sqrt(matrix.length);
  const commands: string[] = [];

  for (let y = 0; y < size; y++) {
    let runStart: number | null = null;

    for (let x = 0; x <= size; x++) {
      const isDark = x < size && Boolean(matrix[y * size + x]);

      if (isDark && runStart === null) {
        runStart = x;
      }

      if ((!isDark || x === size) && runStart !== null) {
        commands.push(`M${runStart + qrQuietZone} ${y + qrQuietZone}h${x - runStart}v1H${runStart + qrQuietZone}z`);
        runStart = null;
      }
    }
  }

  return {
    path: commands.join(''),
    size: size + qrQuietZone * 2,
  };
}

export type PrivateKeyQr = ReturnType<typeof qrPath>;

export const PrivateKeyQrCode = memo(function PrivateKeyQrCode({ qr }: { qr: PrivateKeyQr }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <Svg height={qrSize} style={styles.qrCanvas} viewBox={`0 0 ${qr.size} ${qr.size}`} width={qrSize}>
      <Path d={`M0 0h${qr.size}v${qr.size}H0z`} fill="#FFFFFF" />
      <Path d={qr.path} fill="#000000" />
    </Svg>
  );
});
