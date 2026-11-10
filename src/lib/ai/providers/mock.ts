import { mockDemands, mockGenerate, mockIntent, mockRefine, mockValidate } from "../mock/engine";
import { mockSpecialist } from "../mock/specialist";
import { parseWithSchema } from "../json";
import type { SpecialistInput } from "../specialist/context";
import type { BaseInput, GenerateInput, RefineInput, ValidateInput } from "../translation/inputs";
import type { AIProvider, GenerateObjectRequest } from "../types";

/**
 * Demo provider. Answers every task from the structured input using the
 * rule-based engine – no network calls, no credentials, fully deterministic.
 * Its output is always labelled as a demo response in the interface.
 */
export class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly model = "demo-rules-v1";
  readonly isLive = false;

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    const value = this.run(request);
    // Demo output goes through the same schema validation as live output.
    return parseWithSchema(request.schema, value);
  }

  private run(request: GenerateObjectRequest<unknown>): unknown {
    switch (request.task) {
      case "intent":
        return mockIntent(request.input as BaseInput);
      case "demands":
        return mockDemands(request.input as BaseInput);
      case "generate":
        return mockGenerate(request.input as GenerateInput);
      case "validate":
        return mockValidate(request.input as ValidateInput);
      case "refine":
        return mockRefine(request.input as RefineInput);
      case "specialist":
        return mockSpecialist(request.input as SpecialistInput);
    }
  }
}
