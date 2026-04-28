import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoldLine } from "@/components/ui/GoldLine";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are Lenda's helpful assistant. Lenda is a peer-to-peer rental and services marketplace built for Zambia, operated by Pietrols Enterprise Ltd.

WHAT IS LENDA:
- Zambia's trusted marketplace for rentals and services at lenda.work
- Two pillars: RENTAL (cars, property, equipment, electronics, furniture) and SERVICE (cleaning, repairs, delivery, tutoring, errands, photography)
- Connects KYC-verified hosts with guests across Zambia

ROLES:
- GUEST: Browses listings and makes bookings
- HOST: Lists assets or services, earns income, must complete KYC verification
- ADMIN: Manages the platform

KYC VERIFICATION:
- Hosts must upload NRC (front and back), proof of residence, and a recent photo
- KYC is reviewed by Lenda admins
- Approved hosts unlock listing slots and can start earning
- Rejected hosts must resubmit with correct documents

BOOKING FLOW:
- Guest finds a listing and selects dates
- Price is locked at booking creation and never changes
- Host confirms the booking
- Both parties confirm handover via the app (dual-confirm system)
- Rental flow: PENDING → CONFIRMED → EN_ROUTE → HANDED_OVER → ACTIVE → RETURN_PENDING → RETURNED → COMPLETED
- Service flow: PENDING → CONFIRMED → ACTIVE → COMPLETED
- Bookings can be CANCELLED or DISPUTED

HOSTING AND LISTINGS:
- Free to list — hosts only pay commission when they earn
- Listing tiers based on KYC and activity:
  - Tier 0: 0 slots (not yet verified)
  - Tier 1: 2 slots (KYC approved)
  - Tier 2: 5 slots (growing host)
  - Tier 3: unlimited slots
- Pro subscribers get +3 extra listing slots on top of their tier
- Listings go live immediately after creation (no admin approval required)
- Hosts can upload up to 3 photos per listing
- First image becomes the primary image shown in search

FLOAT ACCOUNT (HOST EARNINGS):
- Hosts set up a float account linked to their mobile money number (Airtel, MTN, or Zamtel)
- First 2 completed bookings are commission-free
- From booking 3 onwards: FREE plan 15% commission, PRO plans 10% commission
- Commission is deducted automatically from float balance when a booking completes
- Hosts can request withdrawals of K100 or more (minimum)
- 2.5% withdrawal fee applies
- Lenda top-up numbers: Airtel 0977 000 001, MTN 0966 000 001, Zamtel 0955 000 001

SUBSCRIPTION PLANS (ZMW):
- FREE: 15% commission, tier-based listing slots
- PRO MONTHLY: K99/month — 10% commission, +3 extra listing slots, boosted discovery
- PRO ANNUAL: K899/year — same as monthly but 2 months free

DISCOVERY SCORE:
- Each listing has a score (0-100) that determines ranking in search results
- Factors: subscription tier, KYC verification, average rating, likes, completed bookings, recency, response rate
- Admins can boost a host's discovery score

PROFILE AND REVIEWS:
- Guests and hosts can leave reviews after a completed booking
- Host profiles show verified badge, location, member since date, bio, jobs done count, and average rating
- Badges can be awarded by admins (e.g. Top Host, Verified Pro)

ERRANDS SERVICE:
- Hire errand runners for: school runs, shopping, banking, lunch runs, bill payments, pharmacy pickups, post office runs
- Errand runners set their own availability and pricing
- Booked like any service

SAFETY AND TRUST:
- All hosts must complete KYC verification with valid Zambian ID
- Dual-confirm handover means both parties confirm pickup and return independently
- Price lock means no surprise charges after booking
- Disputes are reviewed by Lenda admins

PARTNERSHIPS AND CAREERS:
- Lenda welcomes investment, technology, marketing and distribution partnerships
- Apply at lenda.work/partner
- Hiring for marketing, engineering, design, operations, partnerships and trust and safety
- Apply at lenda.work/join

CONTACT:
- General: support@lenda.work
- Privacy: privacy@lenda.work
- Legal: legal@lenda.work
- Domain: lenda.work
- Top-level domain: lenda.co.zm (primary trusted domain for Zambian users)

Answer questions helpfully and concisely. If you do not know something, say so honestly. Always be friendly and professional. Keep responses under 150 words unless more detail is genuinely needed. Do not make up features or prices not listed above.`;

export function LendaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Lenda's assistant. Ask me anything about renting, hosting, bookings or partnerships.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 500,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...[...messages, userMessage].map((m) => ({
                role: m.role,
                content: m.content,
              })),
            ],
          }),
        },
      );

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content ??
        "Sorry, I could not process that. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-lenda-dark">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                <Bot size={16} className="text-gold" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-white uppercase tracking-tight">
                  Lenda Assistant
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/40 text-xs">Online</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <GoldLine className="opacity-20" />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-96">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-gold text-lenda-dark font-medium rounded-br-sm"
                      : "bg-white/5 text-white/80 rounded-bl-sm",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none transition-colors focus:border-gold/60"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-lenda-dark hover:bg-gold/80 transition-colors disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gold shadow-lg flex items-center justify-center text-lenda-dark hover:bg-gold/90 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
