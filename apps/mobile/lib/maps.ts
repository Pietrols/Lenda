import { Linking, Platform } from "react-native";

// Open the platform's native maps app with a search for the given location
// string (Apple Maps on iOS, the geo: intent on Android), falling back to
// Google Maps in the browser if no native handler is available.
export function openDirections(location: string): void {
  const query = encodeURIComponent(location);
  const nativeUrl =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${query}`
      : `geo:0,0?q=${query}`;
  const webFallback = `https://www.google.com/maps/search/?api=1&query=${query}`;

  Linking.openURL(nativeUrl).catch(() => {
    Linking.openURL(webFallback).catch(() => {});
  });
}
