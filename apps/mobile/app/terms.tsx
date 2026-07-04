import { LegalDocument } from "../components/LegalDocument";
import { TERMS_SECTIONS } from "../lib/legal-content";

export default function TermsScreen() {
  return <LegalDocument title="Terms of Service" sections={TERMS_SECTIONS} />;
}
