import type { Answers } from "./types";

/**
 * A filled-in interview, so the graph and the run can be seen without typing
 * eleven answers first. Deliberately a real-sounding brief with real gaps in
 * it — the reviews have something to find.
 */
export const EXAMPLE_ANSWERS: Answers = {
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
