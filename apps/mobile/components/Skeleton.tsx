import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "../theme";

// Pulsing placeholder built on the core Animated API (no reanimated — see the
// keyboard-controller incompatibility note; this project stays off reanimated
// -based libraries).
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

// Mirrors the browse listing card: image block over text lines.
export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineMid} />
        <Skeleton style={styles.lineNarrow} />
      </View>
    </View>
  );
}

// Mirrors the horizontal row cards used by bookings and notifications.
export function RowCardSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton style={styles.rowThumb} />
      <View style={styles.rowBody}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardImage: {
    height: theme.spacing.xxl * 4,
    borderRadius: 0,
  },
  cardBody: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  rowThumb: {
    width: theme.spacing.xxl + theme.spacing.md,
    height: theme.spacing.xxl + theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  rowBody: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  lineWide: {
    height: theme.spacing.md,
    width: "80%",
  },
  lineMid: {
    height: theme.spacing.sm + theme.spacing.xs / 2,
    width: "55%",
  },
  lineNarrow: {
    height: theme.spacing.sm + theme.spacing.xs / 2,
    width: "35%",
  },
});
