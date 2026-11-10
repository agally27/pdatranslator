import { BookOpen, Languages, MessageCircleHeart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Brand, TAGLINE } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Languages, title: "PDA Translator", text: "Turn an everyday sentence into six PDA-informed ways of saying it, with an explanation of where the pressure sits." },
  { icon: MessageCircleHeart, title: "PDA Specialist", text: "Talk a situation through with a compassionate, practical assistant that draws on a curated knowledge base." },
  { icon: BookOpen, title: "Knowledge Hub", text: "Short, honest articles with sources and a clear evidence label on every page." },
  { icon: ShieldCheck, title: "Private by design", text: "Minimal information about your child, no stored recordings, and you decide what is shared with AI." },
];

export default function LandingPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Brand />
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <section className="flex flex-1 flex-col justify-center py-14 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-sage-600">{TAGLINE}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
          Say what you mean, with less pressure in the words.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
          PDA Companion helps parents and carers of autistic children with a PDA profile find wording that reduces unnecessary
          demands, supports autonomy and protects connection.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/privacy">How your information is handled</Link>
          </Button>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-(--radius-card) border border-ink-100 bg-white/70 p-5 shadow-(--shadow-soft)">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                <Icon className="size-5" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-ink-100 pt-5 text-xs leading-relaxed text-ink-500">
        PDA Companion offers communication ideas and general information. It is not a clinical service, does not diagnose,
        and cannot promise how any child will respond. <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
      </footer>
    </main>
  );
}
