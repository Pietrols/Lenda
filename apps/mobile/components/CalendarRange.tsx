import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { theme } from "../theme";

// Native month-grid range picker for the booking flow (part of the approved
// design system). Pure core components — no animation or gesture libraries,
// which are incompatible with this RN version.
//
// Selection model: tapping a day starts a new range; tapping a later day
// completes it; tapping an earlier (or the same) day restarts the range there.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date | null, b: Date): boolean {
  return (
    !!a &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarRange({
  start,
  end,
  minimumDate,
  onChange,
}: {
  start: Date | null;
  end: Date | null;
  minimumDate: Date;
  onChange: (start: Date, end: Date | null) => void;
}) {
  const minDay = startOfDay(minimumDate);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = start ?? minDay;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const canGoBack =
    viewMonth.getTime() >
    new Date(minDay.getFullYear(), minDay.getMonth(), 1).getTime();

  const shiftMonth = (delta: number) =>
    setViewMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1),
    );

  // Build the grid: leading blanks (Monday-first week) then each day.
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = (viewMonth.getDay() + 6) % 7; // 0 = Monday
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) =>
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
    ),
  ];

  const startDay = start ? startOfDay(start) : null;
  const endDay = end ? startOfDay(end) : null;

  const handleTap = (day: Date) => {
    if (startDay && !endDay && day.getTime() > startDay.getTime()) {
      onChange(startDay, day);
    } else {
      onChange(day, null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => canGoBack && shiftMonth(-1)}
          hitSlop={8}
          disabled={!canGoBack}
        >
          <ChevronLeft
            size={theme.typography.size.xl}
            color={
              canGoBack ? theme.colors.foreground : theme.colors.border
            }
          />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
          <ChevronRight
            size={theme.typography.size.xl}
            color={theme.colors.foreground}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }
          const disabled = day.getTime() < minDay.getTime();
          const isStart = sameDay(startDay, day);
          const isEnd = sameDay(endDay, day);
          const inRange =
            !!startDay &&
            !!endDay &&
            day.getTime() > startDay.getTime() &&
            day.getTime() < endDay.getTime();

          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.cell,
                inRange && styles.cellInRange,
                (isStart || isEnd) && styles.cellSelected,
              ]}
              onPress={() => !disabled && handleTap(day)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.cellText,
                  disabled && styles.cellTextDisabled,
                  (isStart || isEnd) && styles.cellTextSelected,
                ]}
              >
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xs,
  },
  monthLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
  },
  cellInRange: {
    backgroundColor: theme.colors.goldTint,
    borderRadius: 0,
  },
  cellSelected: {
    backgroundColor: theme.colors.gold,
  },
  cellText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cellTextDisabled: {
    color: theme.colors.border,
  },
  cellTextSelected: {
    color: theme.colors.primaryForeground,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
