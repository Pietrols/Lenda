import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>Your profile will show up here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  body: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
