import { LegalDocument } from "../components/LegalDocument";
import { PRIVACY_SECTIONS } from "../lib/legal-content";

export default function PrivacyScreen() {
  return <LegalDocument title="Privacy Policy" sections={PRIVACY_SECTIONS} />;
}
