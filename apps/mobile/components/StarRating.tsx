import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { theme } from "../theme";

export function StarRating({
  rating,
  size,
  onSelect,
}: {
  rating: number;
  size: number;
  onSelect?: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating;
        const star = (
          <Star
            size={size}
            color={filled ? theme.colors.gold : theme.colors.mutedForeground}
            fill={filled ? theme.colors.gold : "transparent"}
          />
        );
        if (!onSelect) {
          return <View key={value}>{star}</View>;
        }
        return (
          <Pressable key={value} onPress={() => onSelect(value)} hitSlop={4}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
});
