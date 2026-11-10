import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEMAND_LABELS, type TranslationResult } from "@/lib/types";
import { LEVEL_VISUAL } from "./styles";

export function DemandAnalysisCard({ result }: { result: TranslationResult }) {
  const { demandAnalysis, intent } = result;
  const level = LEVEL_VISUAL[demandAnalysis.level];
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">You said</p>
          <p className="mt-1 font-display text-lg leading-snug text-ink-900">“{result.original}”</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500"><span className="font-medium text-ink-700">What you’re aiming for:</span> {intent.summary}</p>
        </div>

        {intent.involvesSafety && intent.safetyNote ? (
          <div className="flex gap-3 rounded-2xl bg-rose-soft-100 p-4 text-sm leading-relaxed text-rose-soft-600" role="note">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p><strong>Safety comes first.</strong> {intent.safetyNote}</p>
          </div>
        ) : null}

        <section aria-labelledby="demand-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="demand-heading" className="text-base font-semibold text-ink-900">Demand analysis</h2>
            <Badge tone={level.tone}>{level.label}</Badge>
          </div>
          <div className="mt-3" aria-hidden>
            <div className="relative h-2 rounded-full bg-linear-to-r from-sage-300 via-amber-soft-100 to-rose-soft-600/70">
              <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink-700 shadow" style={{ left: level.position }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-500"><span>Low</span><span>Moderate</span><span>High</span></div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">{demandAnalysis.reasoning}</p>

          {demandAnalysis.triggers.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {demandAnalysis.triggers.map((trigger, index) => (
                <li key={`${trigger.type}-${index}`} className="rounded-2xl bg-cream-100 p-3.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink-900">{DEMAND_LABELS[trigger.type]}</span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-ink-700">“{trigger.phrase}”</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-ink-500">{trigger.explanation}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-ink-500">This is an AI assessment of the wording, not a clinical measurement or a prediction of how your child will respond.</p>
        </section>
      </CardContent>
    </Card>
  );
}
