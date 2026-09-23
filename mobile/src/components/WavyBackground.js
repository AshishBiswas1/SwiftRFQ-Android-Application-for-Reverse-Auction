/**
 * WavyBackground
 * Wraps content so that the organic wave pattern is rendered strictly
 * in an absolute background layer (zero layout footprint), and all children
 * (screens, cards, inputs, buttons, text) sit directly ON TOP in the foreground.
 */
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function WavyBackground({ theme, children }) {
  const { width: W, height: H } = useWindowDimensions();

  function wave(yFrac, a, b, c, d) {
    const y = H * yFrac;
    const aH = H * a, bH = H * b, cH = H * c, dH = H * d;
    return (
      `M -10 ${(y + aH).toFixed(1)} ` +
      `C ${(W * 0.20).toFixed(1)} ${(y + aH * 1.5).toFixed(1)} ` +
      `${(W * 0.40).toFixed(1)} ${(y + bH * 1.2).toFixed(1)} ` +
      `${(W * 0.52).toFixed(1)} ${(y + (aH + bH) * 0.28).toFixed(1)} ` +
      `C ${(W * 0.64).toFixed(1)} ${(y + cH * 0.85).toFixed(1)} ` +
      `${(W * 0.82).toFixed(1)} ${(y + dH * 1.35).toFixed(1)} ` +
      `${(W + 10).toFixed(1)} ${(y + dH).toFixed(1)}`
    );
  }

  const paths = [
    wave(0.065, -0.020,  0.015, -0.018,  0.012),
    wave(0.155,  0.016, -0.020,  0.015, -0.013),
    wave(0.245, -0.015,  0.022, -0.014,  0.018),
    wave(0.340,  0.020, -0.017,  0.019, -0.014),
    wave(0.430, -0.018,  0.015, -0.020,  0.016),
    wave(0.520,  0.015, -0.022,  0.017, -0.015),
    wave(0.610, -0.014,  0.018, -0.016,  0.020),
    wave(0.705,  0.022, -0.016,  0.014, -0.018),
    wave(0.800, -0.018,  0.020, -0.017,  0.014),
    wave(0.900,  0.016, -0.018,  0.021, -0.016),
  ];

  const strokeColor = theme.line;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── Background SVG Layer: absolute fill with zero flex layout presence ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={StyleSheet.absoluteFill}
        >
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={strokeColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
              opacity={0.75}
            />
          ))}
        </Svg>
      </View>

      {/* ── Foreground Layer: all components sit directly on top, starting at (0, 0) ── */}
      <View style={styles.foreground}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  foreground: {
    flex: 1,
    zIndex: 1,
  },
});
