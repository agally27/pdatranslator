import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/app/brand";

export const metadata: Metadata = { title: "Privacy notice" };

const SECTIONS: { title: string; body: (string | string[])[] }[] = [
  {
    title: "The short version",
    body: [[
      "We ask for as little as possible. Every child profile field is optional.",
      "Your child’s name is never sent to an AI provider.",
      "Child profile details are only included in AI requests if you switch that on.",
      "Voice recordings are transcribed and discarded. They are never stored.",
      "Your content is not used by this app to train shared AI models.",
      "You can download or delete your data at any time in Settings.",
    ]],
  },
  {
    title: "What we store",
    body: [
      "Account: your email address and, if you choose, a first name.",
      "Child profiles: only what you type into the optional fields. We do not ask for surnames, dates of birth, addresses, school names, diagnoses or health records, and we ask you not to enter them.",
      "Activity: the sentences you translate and their results, the alternatives you save, the feedback you give, communication preferences, and your conversations with the PDA Specialist.",
      "Information about a child’s needs may be special category data under UK GDPR. We process it only to provide the service to you, on the basis of your explicit consent, which you can withdraw by deleting the information or your account.",
    ],
  },
  {
    title: "Who processes it",
    body: [[
      "Supabase – stores your account and data in a database protected by row-level security, so each account can only reach its own rows.",
      "Anthropic (Claude) or OpenAI – when a live AI provider is configured, the text you submit is sent to that provider to generate a response. Profile details are included only if you have opted in, and never the name.",
      "OpenAI – when voice transcription is configured, your recording is sent for transcription and is not stored by this app.",
      "Vercel – hosts the application. Server logs record technical events (timings, error codes) and never the content you type.",
    ],
    "The Settings page shows which of these services this site is currently connected to. In demo mode none of them are used: your information stays in your browser and responses come from a built-in example engine.",
    ],
  },
  {
    title: "What the AI is and is not",
    body: [
      "PDA Companion uses AI to suggest wording and to share general information. It is not a clinician, does not diagnose, and cannot guarantee how any child will respond. Demand analysis describes the language you entered; it is not a clinical measurement.",
      "AI can be wrong. Please use your own judgement, and seek professional advice for medical, safeguarding or legal concerns. In an emergency call 999.",
    ],
  },
  {
    title: "Your rights and choices",
    body: [[
      "Access and portability – Settings → Download my data gives you a full copy in JSON.",
      "Erasure – Settings → Delete my account removes your account and all associated data. You can also delete individual profiles, translations and conversations.",
      "Withdraw consent – switch off “Use child profile details to personalise AI responses” at any time.",
      "Restrict storage – switch off “Keep my translation history”.",
    ],
    "You also have the right to complain to the Information Commissioner’s Office (ico.org.uk).",
    ],
  },
  {
    title: "Retention and contact",
    body: [
      "Your data is kept until you delete it or your account. Voice recordings are not retained at all.",
      "Data controller and contact details: to be completed by the site owner before public launch.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="PDA Companion home"><Brand /></Link>
        <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-sage-700"><ArrowLeft className="size-4" aria-hidden /> Back to the app</Link>
      </div>
      <h1 className="mt-8 text-3xl font-semibold text-ink-900">Privacy notice</h1>
      <p className="mt-2 text-ink-500">How PDA Companion handles information about you and your child.</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold text-ink-900">{section.title}</h2>
            <div className="prose-calm mt-2 text-ink-700">
              {section.body.map((block, index) =>
                Array.isArray(block) ? <ul key={index}>{block.map((item) => <li key={item}>{item}</li>)}</ul> : <p key={index}>{block}</p>,
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-ink-100 pt-5 text-xs leading-relaxed text-ink-500">
        This notice describes how the software behaves. The organisation operating this site is responsible for completing its
        own legal review, data protection impact assessment and processor agreements before launch.
      </p>
    </main>
  );
}
