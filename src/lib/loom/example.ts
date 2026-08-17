import type { Answers } from "./types";

export interface Example {
  id: string;
  label: string;
  /** What makes this one a different shape from the others. */
  note: string;
  answers: Answers;
}

/**
 * A filled-in interview, so the graph and the run can be seen without typing
 * eleven answers first. Deliberately a real-sounding brief with real gaps in
 * it — the reviews have something to find.
 */
const PHOTOGRAPHER: Answers = {
  product:
    "A booking page for freelance photographers. Clients pick a slot, pay a deposit, and get a shoot brief back automatically.",
  who: "Freelance photographers who shoot 2–6 paid jobs a month and handle their own admin.",
  job: "Send a client a link that takes a deposit and locks a date.",
  type: "consumer",
  today:
    "A Google Sheet for availability, DMs to agree a time, and a Venmo request they end up chasing for two weeks.",
  firstRun:
    "They see their own booking page, with their name and their rates on it, and can copy the link.",
  data: "Photographers, clients, shoots, deposits, briefs",
  platform: "web,ios",
  scale: "mvp",
  worry:
    "That photographers won't trust us to hold a client's deposit, and they'll just keep using Venmo.",
  outOfScope:
    "Contracts, invoicing, galleries, and anything that happens after the shoot.",
};

/**
 * A deliberately different shape: internal rather than consumer, with roles,
 * going to production, on mobile, and with a safety consequence rather than a
 * commercial one. Everything Loom writes should read differently for this.
 */
const WARD_ROTA: Answers = {
  product:
    "A shift rota for a hospital ward. Ward managers publish the week, and nurses see their shifts and swap them without a WhatsApp thread.",
  who: "Ward managers who build the rota for 30–40 nurses, and the nurses who work it.",
  job: "Publish a week's rota and let a nurse swap a shift without the manager rekeying anything.",
  type: "internal",
  today:
    "An Excel file printed and pinned by the nurses' station, plus a WhatsApp group for swaps that nobody can audit.",
  roles:
    "Ward managers publish the rota and approve swaps. Nurses see their own shifts and request swaps. Bank staff only see shifts that are open.",
  data: "Nurses, shifts, swap requests, wards, skills",
  platform: "web,ios,android",
  scale: "production",
  worry:
    "That a swap gets approved and the ward ends up without anyone qualified on shift.",
  outOfScope: "Payroll, annual leave, and anything to do with booking agency staff.",
};

export const EXAMPLES: Example[] = [
  {
    id: "photographer",
    label: "Booking page for photographers",
    note: "Consumer, money in the main flow, one person's own data.",
    answers: PHOTOGRAPHER,
  },
  {
    id: "ward-rota",
    label: "Hospital ward rota",
    note: "Internal, roles and permissions, going to production, and a safety consequence.",
    answers: WARD_ROTA,
  },
];

/** Kept for the default "load the example" path. */
export const EXAMPLE_ANSWERS = PHOTOGRAPHER;
