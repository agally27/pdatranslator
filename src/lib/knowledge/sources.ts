import type { KnowledgeSource } from "./types";

/**
 * Reference list for the Knowledge Hub.
 *
 * Every entry is a real, published source. Links point to the publisher's
 * site or the DOI resolver rather than deep pages that may move.
 * IMPORTANT (owner action): these references were compiled during the initial
 * build and must be checked by a human editor before public launch.
 * See docs/AI_FOUNDATION.md → "Knowledge base editorial process".
 */
export const SOURCES = {
  pdaSocietyWhatIs: {
    title: "What is PDA? (information pages)",
    publisher: "PDA Society",
    url: "https://www.pdasociety.org.uk",
    type: "organisation",
  },
  pdaSocietyApproaches: {
    title: "Helpful approaches for a PDA profile, including the PANDA approach",
    publisher: "PDA Society",
    url: "https://www.pdasociety.org.uk",
    type: "organisation",
  },
  pdaSocietyEducation: {
    title: "Education resources for families and schools",
    publisher: "PDA Society",
    url: "https://www.pdasociety.org.uk",
    type: "organisation",
  },
  nasDemandAvoidance: {
    title: "Demand avoidance (advice and guidance)",
    publisher: "National Autistic Society",
    url: "https://www.autism.org.uk",
    type: "organisation",
  },
  nasMeltdowns: {
    title: "Meltdowns (advice and guidance)",
    publisher: "National Autistic Society",
    url: "https://www.autism.org.uk",
    type: "organisation",
  },
  nasSensory: {
    title: "Sensory differences (advice and guidance)",
    publisher: "National Autistic Society",
    url: "https://www.autism.org.uk",
    type: "organisation",
  },
  nasAnxiety: {
    title: "Anxiety (advice and guidance)",
    publisher: "National Autistic Society",
    url: "https://www.autism.org.uk",
    type: "organisation",
  },
  newson2003: {
    title: "Newson, E., Le Maréchal, K. & David, C. Pathological demand avoidance syndrome: a necessary distinction within the pervasive developmental disorders. Archives of Disease in Childhood, 88(7), 595–600.",
    publisher: "Archives of Disease in Childhood",
    year: "2003",
    url: "https://doi.org/10.1136/adc.88.7.595",
    type: "peer_reviewed",
  },
  onions2014: {
    title: "O’Nions, E., Christie, P., Gould, J., Viding, E. & Happé, F. Development of the ‘Extreme Demand Avoidance Questionnaire’ (EDA-Q). Journal of Child Psychology and Psychiatry, 55(7), 758–768.",
    publisher: "Journal of Child Psychology and Psychiatry",
    year: "2014",
    type: "peer_reviewed",
  },
  gillberg2015: {
    title: "Gillberg, C., Gillberg, I. C., Thompson, L., Biskupsto, R. & Billstedt, E. Extreme (“pathological”) demand avoidance in autism: a general population study in the Faroe Islands. European Child & Adolescent Psychiatry, 24(8), 979–984.",
    publisher: "European Child & Adolescent Psychiatry",
    year: "2015",
    type: "peer_reviewed",
  },
  green2018: {
    title: "Green, J., Absoud, M., Grahame, V., et al. Pathological Demand Avoidance: symptoms but not a syndrome. The Lancet Child & Adolescent Health, 2(6), 455–464.",
    publisher: "The Lancet Child & Adolescent Health",
    year: "2018",
    url: "https://doi.org/10.1016/S2352-4642(18)30044-0",
    type: "peer_reviewed",
  },
  stuart2020: {
    title: "Stuart, L., Grahame, V., Honey, E. & Freeston, M. Intolerance of uncertainty and anxiety as explanatory frameworks for extreme demand avoidance in children and adolescents. Child and Adolescent Mental Health, 25(2), 59–67.",
    publisher: "Child and Adolescent Mental Health",
    year: "2020",
    type: "peer_reviewed",
  },
  kildahl2021: {
    title: "Kildahl, A. N., Helverschou, S. B., Rysstad, A. L., Wigaard, E., Hellerud, J. M., Ludvigsen, L. B. & Howlin, P. Pathological demand avoidance in children and adolescents: A systematic review. Autism, 25(8), 2162–2176.",
    publisher: "Autism",
    year: "2021",
    type: "peer_reviewed",
  },
  christie2012: {
    title: "Christie, P., Duncan, M., Fidler, R. & Healy, Z. Understanding Pathological Demand Avoidance Syndrome in Children: A Guide for Parents, Teachers and Other Professionals.",
    publisher: "Jessica Kingsley Publishers",
    year: "2012",
    type: "book",
  },
  murphy2020: {
    title: "Murphy, L. K. Declarative Language Handbook.",
    publisher: "Linda K. Murphy",
    year: "2020",
    type: "book",
  },
  greene: {
    title: "Greene, R. W. The Explosive Child (Collaborative & Proactive Solutions model).",
    publisher: "HarperCollins",
    type: "book",
  },
  cat2018: {
    title: "Cat, S. PDA by PDAers: From Anxiety to Avoidance and Masking to Meltdowns.",
    publisher: "Jessica Kingsley Publishers",
    year: "2018",
    type: "lived_experience",
  },
  ipsea: {
    title: "Independent Provider of Special Education Advice (legal information on SEND in England)",
    publisher: "IPSEA",
    url: "https://www.ipsea.org.uk",
    type: "organisation",
  },
  carersUk: {
    title: "Information and support for unpaid carers",
    publisher: "Carers UK",
    url: "https://www.carersuk.org",
    type: "organisation",
  },
} satisfies Record<string, KnowledgeSource>;
