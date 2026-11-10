import { describe, expect, it } from "vitest";
import { detectDemandsHeuristic, leadingImperative, lintAlternative } from "@/lib/ai/translation/heuristics";
import { contract, extractCore, gerund, removeQuestions } from "@/lib/ai/mock/language";
import type { DemandType } from "@/lib/types";

const types = (text: string) => new Set(detectDemandsHeuristic(text).triggers.map((t) => t.type));

describe("demand detection", () => {
  const cases: [DemandType, string][] = [
    ["direct_instruction", "Put your shoes on."],
    ["indirect_instruction", "It's time to tidy up."],
    ["implied_expectation", "You know you should be ready by now."],
    ["time_pressure", "Quickly, we're going to be late!"],
    ["question_as_instruction", "Can you get in the car?"],
    ["conditional_language", "If you don't eat it there will be no pudding."],
    ["loss_of_control", "Because I said so."],
    ["transition", "Turn the TV off and come inside."],
    ["social_expectation", "Say thank you to the lady."],
    ["repeated_request", "I've already told you twice."],
    ["hidden_demand", "It would make mummy so happy."],
    ["uncertainty", "We'll see, maybe later."],
    ["lack_of_autonomy", "You have no choice about this."],
  ];
  it.each(cases)("detects %s", (type, text) => {
    expect(types(text).has(type), `${text} → ${[...types(text)].join(",")}`).toBe(true);
  });

  it("rates plain information as low and stacked pressure as high", () => {
    expect(detectDemandsHeuristic("Dinner is ready.").level).toBe("low");
    expect(detectDemandsHeuristic("The bath is warm.").triggers).toEqual([]);
    expect(detectDemandsHeuristic("Can you put your coat on?").level).toBe("moderate");
    expect(detectDemandsHeuristic("Put your shoes on right now or else no tablet, I won't ask again!").level).toBe("high");
  });

  it("quotes the phrase that triggered each finding and explains it", () => {
    const { triggers, reasoning } = detectDemandsHeuristic("Hurry up, you need to get dressed now.");
    expect(triggers.length).toBeGreaterThan(1);
    for (const t of triggers) {
      expect("hurry up, you need to get dressed now.".includes(t.phrase.toLowerCase())).toBe(true);
      expect(t.explanation.length).toBeGreaterThan(10);
    }
    expect(reasoning).toMatch(/not a prediction/);
  });

  it("recognises imperative openings but not statements or questions", () => {
    expect(leadingImperative("Put it down")).toBe("put");
    expect(leadingImperative("Tom, please stop that")).toBe("stop");
    expect(leadingImperative("No running inside")).toBe("no");
    expect(leadingImperative("Shoes are by the door")).toBeNull();
    expect(leadingImperative("Do you want toast?")).toBeNull();
    expect(leadingImperative("Let me know if it helps")).toBeNull();
  });
});

describe("alternative lint", () => {
  const checks = (text: string, style = "descriptive" as const, extra = {}) => lintAlternative(text, { style, ...extra }).map((i) => i.check);

  it("passes genuinely declarative wording", () => {
    expect(checks("The shoes are by the door. The ground is wet today.")).toEqual([]);
  });
  it("rejects direct and disguised demands", () => {
    expect(checks("You need to put your shoes on.")).toContain("noDirectDemand");
    expect(checks("Could you pop your shoes on for me?")).toContain("noDirectDemand");
    expect(checks("Put your shoes on when you're ready.")).toContain("noDirectDemand");
    expect(checks("Shoes on, please.")).toContain("noDirectDemand");
  });
  it("rejects urgency, conditions, promises, false choices and controlling language", () => {
    expect(checks("The shoes are waiting and we are going to be late.")).toContain("pressureReduced");
    expect(checks("If you don't get your shoes there's no park.")).toContain("pressureReduced");
    expect(checks("I promise the dentist won't hurt.")).toContain("noUnrealisticPromise");
    expect(checks("Shoes can go on now or in two minutes.")).toContain("noFalseChoice");
    expect(checks("It's happening because I said so.")).toContain("respectsAutonomy");
  });
  it("enforces the minimal word limit and the no-questions preference", () => {
    expect(checks("The shoes are by the door and the coat is on the hook and the bag is there too.", "minimal" as never)).toContain("appropriate");
    expect(checks("I wonder which shoes feel right?", "descriptive", { noQuestions: true })).toContain("fitsProfile");
  });
  it("flags broken output", () => {
    expect(checks("")).toEqual(["natural"]);
    expect(checks("The {thing} is ready.")).toContain("natural");
  });
  it("allows a clear direct boundary only in safety situations", () => {
    expect(checks("Stop. Cars are fast here.")).toContain("noDirectDemand");
    expect(checks("Stop. Cars are fast here.", "descriptive", { involvesSafety: true })).toEqual([]);
  });
});

describe("demo language helpers", () => {
  it("forms gerunds", () => {
    expect([gerund("put"), gerund("make"), gerund("tidy"), gerund("be"), gerund("lie"), gerund("feed")]).toEqual(["putting", "making", "tidying", "being", "lying", "feeding"]);
  });
  it("extracts the core of instructions, prohibitions and statements", () => {
    expect(extractCore("Please can you feed the cat now?")).toMatchObject({ kind: "instruction", activity: "feeding the cat" });
    expect(extractCore("Stop jumping on the sofa!")).toMatchObject({ kind: "prohibition", activity: "jumping on the sofa" });
    expect(extractCore("Don't slam the door or else.")).toMatchObject({ kind: "prohibition", activity: "slamming the door" });
    expect(extractCore("Grandma is visiting tomorrow.").kind).toBe("statement");
  });
  it("removes questions and contracts stiff phrasing", () => {
    expect(removeQuestions("Shall we find the shoes?")).toBe("We could find the shoes.");
    expect(removeQuestions("Which coat feels best?")).toBe("I wonder which coat feels best.");
    expect(removeQuestions("The bath is warm.")).toBe("The bath is warm.");
    expect(removeQuestions("Do you want to help? It's fine either way.")).not.toContain("?");
    expect(contract("I am here and it is fine.")).toBe("I'm here and it's fine.");
  });
});
