import {
  clause,
  deriveBrief,
  excerpt,
  listOf,
  phrase,
  plural,
  scaleLabel,
  platformLabel,
} from "./brief";
import { screenInventory } from "./screens";
import type {
  Answers,
  Brief,
  Finding,
  NodeResult,
  Severity,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  medium: 1,
  low: 2,
};

const VAGUE_AUDIENCE = [
  "everyone",
  "anyone",
  "people",
  "users",
  "consumers",
  "businesses",
  "companies",
  "teams",
  "creatives",
  "professionals",
];

const IDENTITY_WORDS =
  /user|account|member|profile|customer|client|person|people|owner|admin|team/i;

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function finding(
  node: string,
  severity: Severity,
  title: string,
  detail: string,
  tags: string[]
): Finding {
  return { id: `${node}:${slug(title)}`, node, severity, title, detail, tags };
}

interface Section {
  h: string;
  lines: string[];
}

function renderReview(
  title: string,
  meta: [string, string][],
  sections: Section[],
  findings: Finding[]
): string {
  const out: string[] = [`# ${title}`, ""];
  for (const [label, value] of meta) {
    if (value) out.push(`**${label}:** ${value}`);
  }
  out.push("");
  for (const section of sections) {
    if (section.lines.length === 0) continue;
    out.push(`## ${section.h}`, "");
    out.push(...section.lines, "");
  }
  if (findings.length) {
    out.push("## Findings", "");
    for (const f of findings) {
      out.push(`### [${f.severity}] ${f.title}`, "", f.detail, "");
    }
  }
  return out.join("\n").trim() + "\n";
}

// ---------------------------------------------------------------------------
// Leaf reviews
// ---------------------------------------------------------------------------

function reviewAudience(brief: Brief, answers: Answers): NodeResult {
  const who = (answers.who ?? "").trim();
  const vague =
    who.split(/\s+/).length < 5 ||
    VAGUE_AUDIENCE.some((w) => who.toLowerCase().split(/\s+/).includes(w));
  const hasWorkaround =
    brief.today.length > 0 && !/^(nothing|none|n\/a|they don't)/i.test(brief.today);

  const findings: Finding[] = [];

  if (vague) {
    findings.push(
      finding(
        "audience",
        "critical",
        "The audience is too broad to design against",
        `"${who}" covers people with different jobs, different tolerance for setup, and different reasons to quit. Every screen below will be designed for an average that doesn't exist. Narrow it to the person who feels this problem weekly, and name what makes them different from the next person over.`,
        ["scope", "audience"]
      )
    );
  } else {
    findings.push(
      finding(
        "audience",
        "medium",
        "One audience, two different situations",
        `${brief.actorPlural.replace(/^./, (c) => c.toUpperCase())} at the start of this problem and ${brief.actorPlural} deep in it want opposite things — the first wants a decision made for them, the second wants control. The brief treats them as one person. Decide which one v1 is for.`,
        ["scope", "audience"]
      )
    );
  }

  if (hasWorkaround) {
    findings.push(
      finding(
        "audience",
        "low",
        "No migration path off the current workaround",
        `They already have ${phrase(brief.today, 60)}. Whatever is in there is real work they won't retype. If there's no import — even a paste box — the first session starts with a chore, and the workaround stays alive alongside your product.`,
        ["migration", "data"]
      )
    );
  } else {
    findings.push(
      finding(
        "audience",
        "medium",
        "No named workaround means no proven demand",
        `Nothing is recorded for what ${brief.actorPlural} do today. Either they've built a workaround you haven't found — worth finding, because it's your real competitor — or this is a problem they don't feel yet, which changes the pitch from "faster" to "you should care about this."`,
        ["adoption", "audience"]
      )
    );
  }

  findings.push(
    finding(
      "audience",
      "medium",
      "Nothing states why they'd switch mid-workflow",
      `Switching costs are paid up front and the benefit arrives later. The brief describes the end state but not the first week, which is the part that actually gets declined.`,
      ["adoption", "audience"]
    )
  );

  return {
    markdown: renderReview(
      "Audience review",
      [
        ["Reviewed", who || "—"],
        ["Against", "how they work today"],
      ],
      [
        {
          h: "Who this is actually for",
          lines: [
            `The brief names **${brief.actor}**. ${
              vague
                ? "That's a category, not a person — it doesn't constrain a single design decision below."
                : "That's specific enough to argue with, which is what you want at this stage."
            }`,
          ],
        },
        {
          h: "What they do today",
          lines: hasWorkaround
            ? [
                `> ${brief.today}`,
                "",
                "This is the thing to beat. Not a competitor product — this. It's free, it already has their data in it, and it works well enough that they've kept using it.",
              ]
            : [
                "No current workaround is recorded. That's the single most useful thing to go and find out, because a workaround is proof the problem is felt.",
              ],
        },
        {
          h: "What would make them switch",
          lines: [
            `The primary job — ${clause(brief.job, 70)} — has to be faster on day one than what they already do, with their existing work carried over. Not eventually. Day one.`,
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewFlows(brief: Brief, answers: Answers): NodeResult {
  const job = (answers.job ?? "").trim();
  const money = /pay|deposit|invoice|checkout|charge|billing|subscription|refund/i.test(
    `${job} ${brief.product}`
  );
  const shared = /send|share|invite|client|customer|team|collaborat|link/i.test(
    `${job} ${brief.product}`
  );
  const primary = brief.entities[0];

  const steps = [
    `${brief.actor.replace(/^./, (c) => c.toUpperCase())} arrives — from a link, a bookmark, or a search. The brief doesn't say which, and that decides what the first screen assumes.`,
    `They ${clause(job, 80)}.`,
    `A **${primary}** record is created.`,
    shared
      ? "The other party receives it — and this is the first moment something leaves the product and lands somewhere you don't control."
      : "The result is saved and shown back.",
    "They see confirmation that it worked.",
  ];

  const findings: Finding[] = [];

  if (money) {
    findings.push(
      finding(
        "flows",
        "critical",
        "Money moves in the primary flow with no failure path",
        "A payment step can fail after the user believes it succeeded — card declined, network dropped between charge and confirmation, duplicate submit. The brief describes the happy path only. Design the three states now: pending, failed-retryable, and failed-terminal, and decide what the record looks like in each.",
        ["errors", "trust", "flows"]
      )
    );
  }

  findings.push(
    finding(
      "flows",
      "medium",
      "The primary flow has no defined failure path",
      `Every step above can fail, and the brief specifies none of them. The most expensive one is the middle: ${excerpt(job, 60)} — if that half-completes, there's a ${primary} record in a state no screen is designed to show.`,
      ["errors", "flows"]
    )
  );

  if (brief.entities.length >= 3) {
    findings.push(
      finding(
        "flows",
        "medium",
        `The flow touches ${brief.entities.length} record types with no stated order`,
        `${brief.entities.slice(0, 3).join(", ")} all appear in one pass. Which one gets created first determines what the user can abandon halfway through without leaving orphans. Nothing in the brief settles it.`,
        ["data", "flows"]
      )
    );
  }

  findings.push(
    finding(
      "flows",
      "low",
      "No success confirmation is specified",
      `The flow ends when the system is done, not when ${brief.actor} believes it. Those are different moments, and the gap between them is where people re-submit.`,
      ["feedback", "flows"]
    )
  );

  return {
    markdown: renderReview(
      "Core flow review",
      [
        ["Primary job", job || "—"],
        ["Steps", `${steps.length}`],
      ],
      [
        {
          h: "Primary flow",
          lines: steps.map((s, i) => `${i + 1}. ${s}`),
        },
        {
          h: "Decision points",
          lines: [
            `- **Before step 1** — is ${brief.actor} known to us yet? The brief doesn't say whether this flow requires an account, and that single answer changes the first two screens.`,
            `- **At step 2** — can this be abandoned and resumed? If yes, a partial **${primary}** has to be a real, showable state.`,
            shared
              ? "- **At step 4** — what does the recipient see if they open it twice, or after it expires?"
              : "- **At step 4** — is the result editable after the fact, or final?",
          ],
        },
        {
          h: "Where it breaks",
          lines: [
            "- Step 2 is doing the most work and has the least specification.",
            money
              ? "- Any step involving money needs its own confirmation, separate from the flow's."
              : "- The flow has no stated undo, so step 3 is effectively permanent.",
            "- Nothing describes what a returning user sees when they start this flow for the second time.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewScreens(brief: Brief): NodeResult {
  const [primary, secondary] = brief.entities;
  const screens = screenInventory(brief);

  const findings: Finding[] = [
    finding(
      "screens",
      "medium",
      `The ${plural(primary).toLowerCase()} list is designed only for the full case`,
      `It's the home screen in practice, and on day one it holds nothing for every single user. As drawn, the most-seen version of your most-seen screen doesn't exist — and it's the screen with the best claim to doing the onboarding.`,
      ["empty-state", "screens"]
    ),
    finding(
      "screens",
      "low",
      "Settings is absorbing decisions instead of holding preferences",
      "Anything that didn't fit a flow has landed here. That's a sign a decision got deferred rather than made — worth emptying before it calcifies.",
      ["ia", "screens"]
    ),
  ];

  if (secondary) {
    findings.push(
      finding(
        "screens",
        "medium",
        `No screen owns creating a ${secondary.toLowerCase()}`,
        `${plural(secondary)} are referenced by ${primary.toLowerCase()} records but no flow creates one. Either they're created inline (which makes the ${primary.toLowerCase()} form longer than it looks) or they're imported (which is a flow nobody has drawn).`,
        ["data", "screens"]
      )
    );
  }

  return {
    markdown: renderReview(
      "Screen inventory & IA",
      [
        ["Screens", `${screens.length}`],
        ["Platform", brief.platforms.map(platformLabel).join(", ") || "Web"],
      ],
      [
        {
          h: "Screen inventory",
          lines: screens.map(
            (screen) =>
              `- **${screen.name}** (\`${screen.route}\`) — ${screen.note}`
          ),
        },
        {
          h: "Information architecture",
          lines: [
            `Two levels deep: list → detail. That's the right depth for this, and it holds as long as **${plural(primary)}** is genuinely the thing ${brief.actorPlural} think in.`,
            "",
            `If they actually think in ${
              secondary ? plural(secondary).toLowerCase() : "time"
            }, the hierarchy is inverted and every screen below inherits the mistake.`,
          ],
        },
        {
          h: "Screens that shouldn't exist",
          lines: [
            "- **Settings**, in its current form — it holds three unrelated decisions that each belong next to the thing they affect.",
            brief.scale === "prototype"
              ? "- **Sign in** is correctly absent for a prototype; make sure the demo doesn't quietly depend on knowing who you are."
              : "- **Sign in** is unavoidable, but it doesn't have to come first. Consider showing value before asking.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewDataModel(brief: Brief): NodeResult {
  const entities = brief.entities;
  const hasIdentity = entities.some((e) => IDENTITY_WORDS.test(e));
  const fromSpreadsheet = /sheet|excel|csv|spreadsheet|doc|notion|airtable/i.test(
    brief.today
  );

  const findings: Finding[] = [];

  if (!hasIdentity) {
    findings.push(
      finding(
        "data_model",
        "critical",
        "No entity owns identity",
        `The model lists ${entities.join(", ")} — none of which is a person. Every record needs an owner before you can answer "who can see this", "whose list is this", or "what happens when they leave". This is the cheapest thing to fix now and the most expensive to retrofit.`,
        ["identity", "data", "permissions"]
      )
    );
  } else {
    findings.push(
      finding(
        "data_model",
        "medium",
        "Ownership is implied but not stated",
        `An identity entity exists, but nothing says whether a **${entities[0]}** belongs to one person or is shared. That single answer decides your permission model, your sharing UI, and whether deletion is safe.`,
        ["identity", "data", "permissions"]
      )
    );
  }

  findings.push(
    finding(
      "data_model",
      "medium",
      `Deletion is undefined for ${entities[0]}`,
      `If a **${entities[0]}** is deleted, everything referencing it either breaks or silently disappears. Pick one: block deletion while referenced, soft-delete and keep showing a tombstone, or cascade. All three are defensible; leaving it undecided isn't.`,
      ["data", "errors"]
    )
  );

  findings.push(
    finding(
      "data_model",
      "low",
      "Nothing records who changed what",
      "No timestamps or actor on any record. You won't miss this until the first time two people disagree about what happened, at which point it's unrecoverable history.",
      ["data", "trust"]
    )
  );

  if (fromSpreadsheet) {
    findings.push(
      finding(
        "data_model",
        "medium",
        "No import path from the existing spreadsheet",
        `Their data currently lives in ${phrase(brief.today, 50)}. Without an import, every user starts empty — which is a data problem that shows up as an onboarding problem.`,
        ["migration", "data"]
      )
    );
  }

  return {
    markdown: renderReview(
      "Data model review",
      [
        ["Entities", entities.join(", ")],
        ["Identity entity", hasIdentity ? "present" : "missing"],
      ],
      [
        {
          h: "Entities",
          lines: entities.map(
            (e, i) =>
              `- **${e}** — ${
                i === 0
                  ? "the spine of the product; almost every screen reads or writes one of these"
                  : `referenced by ${entities[0].toLowerCase()}, created by a flow that isn't specified`
              }`
          ),
        },
        {
          h: "Relationships",
          lines: [
            entities.length > 1
              ? `**${entities[0]}** → **${entities[1]}** is the load-bearing relationship. Whether it's one-to-many or many-to-many isn't stated, and the screens differ completely between them.`
              : `Only one entity is named, which usually means one or two are hiding inside it. Look for the nouns in "${clause(brief.job, 50)}".`,
            "",
            hasIdentity
              ? "Identity is present, so ownership can be expressed. It just hasn't been."
              : "With no identity entity there is no way to express ownership at all, so every relationship below is currently global.",
          ],
        },
        {
          h: "Lifecycle & ownership",
          lines: [
            `- **Created** — during the primary flow, by ${brief.actor}.`,
            "- **Edited** — unspecified. Nothing says whether records are mutable after creation.",
            "- **Deleted** — unspecified, and the most likely source of a data-loss bug.",
            brief.production
              ? "- **Retained** — production means someone will eventually ask you to delete their data on request. Model it now."
              : "- **Retained** — fine to defer at this stage, but note it.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewEdgeCases(brief: Brief): NodeResult {
  const collaborative =
    brief.type === "internal" ||
    brief.type === "content" ||
    brief.type === "marketplace";
  const primary = brief.entities[0];

  const findings: Finding[] = [
    finding(
      "edge_cases",
      "medium",
      "Empty states are undefined across every list",
      `Not one list in this product has a designed empty state, and empty is the state every user starts in. An empty ${primary.toLowerCase()} list should be doing the work of onboarding, not apologising.`,
      ["empty-state", "screens"]
    ),
    finding(
      "edge_cases",
      brief.mobile ? "critical" : "low",
      brief.mobile
        ? "Offline behaviour is undefined on a mobile target"
        : "Flaky connections are unhandled",
      brief.mobile
        ? `This ships on ${listOf(brief.platforms.map(platformLabel))}, where losing signal mid-flow is normal, not exceptional. If the primary flow can't survive a tunnel, it will fail in front of real users on day one. Decide now: queue and retry, block with a clear state, or save a local draft.`
        : "The flow assumes every request completes. A slow or dropped request currently has no designed state, so users will double-submit into it.",
      ["offline", "platform"]
    ),
    finding(
      "edge_cases",
      collaborative ? "medium" : "low",
      "Two people editing the same record has no resolution",
      collaborative
        ? `This is a ${brief.typeLabel.toLowerCase()}, so simultaneous edits are the normal case, not the rare one. Last-write-wins is a decision — make it deliberately, and show the loser what happened.`
        : "Unlikely at this stage, but a single user with two tabs open produces the same bug.",
      ["concurrency", "data"]
    ),
    finding(
      "edge_cases",
      "low",
      "Error copy is unspecified, so users will see raw failures",
      "Every error state in this product currently resolves to whatever the system says. That's the difference between a product that feels finished and one that doesn't, and it costs a paragraph per state.",
      ["errors", "feedback"]
    ),
    finding(
      "edge_cases",
      "medium",
      "Permission-denied has no designed state",
      "Someone will reach a screen they shouldn't — an old link, a revoked invite, a shared URL. Right now that's an undefined state, and undefined states leak information about what exists.",
      ["permissions", "screens"]
    ),
  ];

  return {
    markdown: renderReview(
      "Edge case review",
      [
        ["States reviewed", "empty, loading, error, offline, permission, concurrent"],
        ["Target", brief.platforms.map(platformLabel).join(", ") || "Web"],
      ],
      [
        {
          h: "State by state",
          lines: [
            `- **Empty** — undefined everywhere. Most-seen screen, least-designed. The ${plural(primary).toLowerCase()} list is the one that matters.`,
            "- **Loading** — undefined. Decide skeleton vs spinner once, globally, or every screen will pick differently.",
            "- **Error** — undefined. No copy, no recovery action, no distinction between \"try again\" and \"this will never work\".",
            brief.mobile
              ? "- **Offline** — undefined, on a platform where it's routine. This is the one to fix first."
              : "- **Offline** — undefined, low frequency on web but not zero.",
            "- **Permission denied** — undefined. Currently indistinguishable from \"not found\", which is a decision worth making on purpose.",
            collaborative
              ? "- **Concurrent edit** — undefined, and normal for this product shape."
              : "- **Concurrent edit** — undefined, rare but reachable with two tabs.",
          ],
        },
        {
          h: "The pattern",
          lines: [
            "Every one of these is undefined for the same reason: the brief describes what happens when things work. That's not a criticism of the brief — it's what briefs do. It just means the state work is entirely still ahead of you, and it's usually 40% of the screens.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewFirstRun(brief: Brief, answers: Answers): NodeResult {
  const text = answers.firstRun ?? "";
  const needsData =
    /their|my|your|own|import|upload|connect|add|enter|invite|sync|existing/i.test(
      text
    );

  const findings: Finding[] = [];

  if (needsData) {
    findings.push(
      finding(
        "first_run",
        "critical",
        "Activation depends on data the user hasn't entered yet",
        `The first 60 seconds are described as "${excerpt(text, 60)}" — which requires them to have already put something in. On the actual first run there is nothing there, so the moment you're counting on doesn't happen. Either seed it, fake it convincingly, or move the payoff to something that works on an empty account.`,
        ["empty-state", "onboarding"]
      )
    );
  } else {
    findings.push(
      finding(
        "first_run",
        "medium",
        "The first 60 seconds work, the next session doesn't",
        "The opening moment is defined and it lands without any user data — good. What's missing is the reason to open it again tomorrow, which is where consumer products actually die.",
        ["adoption", "onboarding"]
      )
    );
  }

  findings.push(
    finding(
      "first_run",
      "medium",
      "No re-entry trigger after the first session",
      `Nothing brings ${brief.actor} back. No notification, no email, no reason the product is on their mind at the moment the problem recurs. For a consumer product that's the whole game.`,
      ["adoption", "onboarding"]
    )
  );

  findings.push(
    finding(
      "first_run",
      "low",
      "Account creation is asked for before value is shown",
      "The sign-in screen sits in front of a product they haven't decided they want yet. Every step before the payoff costs users, and this one is usually movable.",
      ["identity", "onboarding"]
    )
  );

  return {
    markdown: renderReview(
      "First run review",
      [["Stated payoff", clause(text, 90) || "—"]],
      [
        {
          h: "The first 60 seconds",
          lines: [
            text ? `> ${text}` : "Not specified.",
            "",
            needsData
              ? "This payoff is downstream of data the user hasn't provided. On a real first run, the screen it describes is empty."
              : "This payoff doesn't depend on user data, which is the right property for it to have.",
          ],
        },
        {
          h: "What happens on day two",
          lines: [
            `Unspecified. ${brief.actor.replace(/^./, (c) => c.toUpperCase())} closes the tab and the product has no way to reach them. Worth deciding whether the return trigger is a notification, a scheduled moment, or something another person does.`,
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewRoles(brief: Brief, answers: Answers): NodeResult {
  const text = answers.roles ?? "";
  const roleCount = (text.match(/[,.]|\band\b/gi) ?? []).length + 1;

  const findings: Finding[] = [
    finding(
      "roles",
      "critical",
      "The permission model isn't reflected in the screen inventory",
      `Roughly ${roleCount} roles are described, but the screens are drawn once, for one viewer. Each role either sees a different version of a screen or is blocked from it — and every one of those variants is a design that doesn't exist yet.`,
      ["permissions", "screens"]
    ),
    finding(
      "roles",
      "medium",
      "No admin path for the very first user",
      "Someone has to become an admin before anyone can be granted anything. The brief describes steady state and skips bootstrap, which is the state every new customer starts in.",
      ["permissions", "identity"]
    ),
    finding(
      "roles",
      "low",
      "Role changes have no audit trail",
      "Permission changes are exactly the events people later dispute. Without a record, you can't answer who granted what, and internal tools get asked that question.",
      ["trust", "data"]
    ),
  ];

  return {
    markdown: renderReview(
      "Roles & permissions review",
      [["Roles described", `${roleCount}`]],
      [
        {
          h: "Stated model",
          lines: [text ? `> ${text}` : "Not specified."],
        },
        {
          h: "The matrix nobody drew",
          lines: [
            "Every role × every screen is a cell, and each cell is one of: full, read-only, hidden, or blocked-with-explanation. The brief fills in a handful. The rest default to whatever the implementation happens to do.",
            "",
            "The cells that matter most are the blocked ones, because they're the only ones a user experiences as a wall.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewLiquidity(brief: Brief, answers: Answers): NodeResult {
  const text = answers.supply ?? "";

  const findings: Finding[] = [
    finding(
      "liquidity",
      "critical",
      "The easy side sees an empty product on day one",
      `The hard side is described as ${clause(text, 60) || "the constraint"}. Until they arrive, everyone else opens a product with nothing in it — and an empty marketplace doesn't read as "new", it reads as "dead". The first version needs to be worth using with one side missing.`,
      ["empty-state", "adoption"]
    ),
    finding(
      "liquidity",
      "medium",
      "No stated reason for the hard side to move",
      "They already have what they need elsewhere. The brief describes what the platform does once they're on it, not what makes leaving their current setup worth the disruption.",
      ["adoption", "trust"]
    ),
    finding(
      "liquidity",
      "low",
      "No single-player mode",
      "The most reliable cold-start fix is a product that's useful to one side alone — a tool they'd keep even if the other side never showed up. Nothing in the brief is that yet.",
      ["onboarding", "adoption"]
    ),
  ];

  return {
    markdown: renderReview(
      "Cold start review",
      [["Constrained side", clause(text, 80) || "—"]],
      [
        {
          h: "The chicken and egg",
          lines: [
            text ? `> ${text}` : "Not specified.",
            "",
            "The question isn't which side is harder — it's what the easy side sees while you're solving for the hard one. That screen is the product for the first several months.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewDecisionLoop(brief: Brief, answers: Answers): NodeResult {
  const text = answers.decision ?? "";

  const findings: Finding[] = [
    finding(
      "decision_loop",
      "medium",
      "The number and the action live on different screens",
      `The decision is "${excerpt(text, 60)}" — but seeing the number and doing something about it are separated by navigation. Every screen between insight and action is a place people stop.`,
      ["feedback", "ia"]
    ),
    finding(
      "decision_loop",
      "medium",
      "No threshold, so nothing says when to act",
      "A number with no reference point is decoration. Without a target, a benchmark, or a prior period, the viewer has to supply the judgment the product should be supplying.",
      ["feedback", "errors"]
    ),
    finding(
      "decision_loop",
      "low",
      "No history, so change isn't visible",
      "Point-in-time values hide the only thing that usually matters: direction. Worth deciding what gets retained before the data that would show it is thrown away.",
      ["data", "feedback"]
    ),
  ];

  return {
    markdown: renderReview(
      "Decision loop review",
      [["Decision", clause(text, 90) || "—"]],
      [
        {
          h: "From number to action",
          lines: [
            text ? `> ${text}` : "Not specified.",
            "",
            "Trace it literally: they see the number, they form a judgment, they leave to do something, and — critically — nothing brings them back to see whether it worked. That last gap is where reporting tools stop being used.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewAuthoring(brief: Brief, answers: Answers): NodeResult {
  const text = answers.authoring ?? "";
  const hasPublish = /publish|share|send|live|lock/i.test(text);

  const findings: Finding[] = [
    finding(
      "authoring",
      "medium",
      "Two people editing the same draft has no resolution",
      "Creation tools attract simultaneous editing whether or not you design for it. Without a stated model, one person's work silently disappears and the product looks broken rather than busy.",
      ["concurrency", "data"]
    ),
    finding(
      "authoring",
      "medium",
      "No undo",
      `The lifecycle describes moving forward — ${clause(text, 50) || "draft to done"} — and never back. In a tool where people make things, the ability to reverse is what makes them willing to try.`,
      ["errors", "feedback"]
    ),
    finding(
      "authoring",
      "low",
      hasPublish
        ? "Published and draft versions aren't separated in the model"
        : "Version history is implied but not modelled",
      hasPublish
        ? "Once something is shared or locked, edits have to go somewhere that isn't the live copy. That's a second record, and the data model currently has one."
        : "People will expect to get back to what they had an hour ago. Nothing in the model retains it.",
      ["data"]
    ),
  ];

  return {
    markdown: renderReview(
      "Authoring lifecycle review",
      [["Lifecycle", clause(text, 90) || "—"]],
      [
        {
          h: "Stated lifecycle",
          lines: [
            text ? `> ${text}` : "Not specified.",
            "",
            "The transitions are described; the reversals aren't. Every arrow in a creation tool needs to go both ways or be explicitly one-way with a warning.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewAdoption(brief: Brief, answers: Answers): NodeResult {
  const text = answers.install ?? "";
  const needsCreds = /key|token|auth|login|account|env|credential|secret/i.test(text);

  const findings: Finding[] = [
    finding(
      "adoption",
      "medium",
      "Steps before first value are unbounded",
      `Install is described as "${excerpt(text, 60)}". Count the steps between that and the first thing that's actually useful — every one is a place a developer closes the tab, and the count isn't stated anywhere.`,
      ["onboarding", "adoption"]
    ),
    finding(
      "adoption",
      needsCreds ? "medium" : "low",
      needsCreds
        ? "Credentials are requested before any value is shown"
        : "Nothing verifies the install worked",
      needsCreds
        ? "Asking for a key up front means the evaluation can't start until someone makes an account. A demo mode or a fixture-backed first run removes the gate entirely."
        : "There's no stated moment where the developer sees confirmation that it's wired up correctly, which is the point they decide whether to keep going.",
      ["identity", "trust"]
    ),
    finding(
      "adoption",
      "low",
      "No uninstall or rollback path",
      "Developers evaluate tools partly on how easily they can back out. Nothing describes removing this cleanly.",
      ["errors"]
    ),
  ];

  return {
    markdown: renderReview(
      "Adoption path review",
      [["First step", clause(text, 90) || "—"]],
      [
        {
          h: "Getting in",
          lines: [
            text ? `> ${text}` : "Not specified.",
            "",
            "The install command is the easy part. What matters is the distance from that command to the first output that makes someone believe it works.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewPlatformNative(brief: Brief): NodeResult {
  const targets = listOf(brief.platforms.map(platformLabel));

  const findings: Finding[] = [
    finding(
      "platform_native",
      "critical",
      "Offline behaviour is undefined on a mobile target",
      `Shipping on ${targets} means losing connection mid-flow is routine. The primary flow currently assumes connectivity throughout, which turns a normal condition into a failure the user has to recover from.`,
      ["offline", "platform"]
    ),
    finding(
      "platform_native",
      "medium",
      "Permission prompts have no stated timing",
      "System prompts asked at launch get denied, and denial is close to permanent. Nothing in the brief says which permissions are needed or at what moment they're requested.",
      ["permissions", "onboarding"]
    ),
    finding(
      "platform_native",
      "low",
      "The navigation model isn't native on at least one target",
      `The IA reads as a web hierarchy. On ${targets} that usually needs restating in the platform's own idiom — back behaviour, tabs, and where the primary action lives are all different.`,
      ["ia", "platform"]
    ),
  ];

  return {
    markdown: renderReview(
      "Platform fit review",
      [["Targets", targets]],
      [
        {
          h: "Native conventions",
          lines: [
            `- **Navigation** — the current structure is list → detail, which maps cleanly, but the back gesture and the primary action placement need explicit answers on ${targets}.`,
            "- **Permissions** — timing matters more than copy. Ask at the moment of use, never at launch.",
            "- **Connectivity** — the flow needs to survive a tunnel. This is the one that will actually bite.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

function reviewScaleRisk(brief: Brief): NodeResult {
  const findings: Finding[] = [
    finding(
      "scale_risk",
      "critical",
      "No abuse story for a flow strangers can reach",
      `This is going to production, which means the primary flow is reachable by people who aren't your users. Nothing states what stops repeated submission, junk records, or someone reaching another ${brief.actor}'s data through a guessed link.`,
      ["trust", "errors"]
    ),
    finding(
      "scale_risk",
      "medium",
      "Undefined error states become support volume",
      "Every state left undesigned resolves into a message someone has to answer. At production volume that's a recurring cost, paid in a channel that doesn't scale.",
      ["errors", "feedback"]
    ),
    finding(
      "scale_risk",
      "medium",
      "The list screens change shape with volume",
      `The ${plural(brief.entities[0]).toLowerCase()} list is designed for the handful of records an early user has. At a few hundred it needs search, sort, and pagination — three features that change the screen, not decorate it.`,
      ["data", "screens"]
    ),
  ];

  return {
    markdown: renderReview(
      "Scale risk review",
      [["Readiness target", scaleLabel(brief.scale)]],
      [
        {
          h: "What changes when nobody's watching",
          lines: [
            "- **Volume** — screens designed for 5 records behave differently at 500.",
            "- **Abuse** — any flow a stranger can reach will be reached by one.",
            "- **Support** — undesigned states convert directly into inbound messages.",
          ],
        },
      ],
      findings
    ),
    findings,
  };
}

// ---------------------------------------------------------------------------
// The stated worry — injected into whichever review is closest to it
// ---------------------------------------------------------------------------

const WORRY_ROUTES: {
  match: RegExp;
  tags: string[];
  prefer: string[];
  frame: string;
}[] = [
  {
    match: /trust|scam|safe|secur|privacy|money|payment|deposit|fraud|steal/i,
    tags: ["trust"],
    prefer: ["scale_risk", "liquidity", "flows"],
    frame:
      "Trust isn't established by a feature; it's established by what the product does at the moments money or data is at stake — and those are exactly the moments currently left undesigned.",
  },
  {
    match: /confus|complicat|hard|difficult|simple|learn|understand|onboard/i,
    tags: ["onboarding"],
    prefer: ["first_run", "adoption", "screens"],
    frame:
      "Complexity concerns almost always resolve to step count before first value. That count isn't written down anywhere yet, which is why the worry has nowhere to land.",
  },
  {
    match: /empty|nobody|no one|adopt|use it|come back|retention|churn|stick/i,
    tags: ["adoption"],
    prefer: ["liquidity", "first_run", "audience"],
    frame:
      "This is a day-two problem, and every review above is written about day one. Nothing in the brief describes what pulls someone back.",
  },
  {
    match: /data|lose|loss|wrong|sync|duplicate|corrupt|accurate/i,
    tags: ["data"],
    prefer: ["data_model", "edge_cases"],
    frame:
      "Data worries concentrate on the transitions — create, edit, delete, and two-people-at-once. Three of those four are unspecified.",
  },
  {
    match: /slow|scale|break|perform|volume|load|crash/i,
    tags: ["errors"],
    prefer: ["scale_risk", "edge_cases"],
    frame:
      "This shows up first as undesigned failure states, not as infrastructure. What the user sees while it's breaking is the part you control.",
  },
];

function worryFinding(
  brief: Brief,
  availableNodes: string[]
): { node: string; finding: Finding } | null {
  if (!brief.worry) return null;

  const route =
    WORRY_ROUTES.find((r) => r.match.test(brief.worry)) ?? {
      tags: ["scope"],
      prefer: ["audience", "flows"],
      frame:
        "It doesn't map cleanly onto any one review, which usually means it's a question about what the product is rather than how it works.",
      match: /.^/,
    };

  const node =
    route.prefer.find((n) => availableNodes.includes(n)) ??
    (availableNodes.includes("edge_cases") ? "edge_cases" : availableNodes[0]);

  return {
    node,
    finding: {
      id: `${node}:stated-worry`,
      node,
      severity: "critical",
      title: "The thing you said you were worried about",
      detail: `You wrote: "${brief.worry}"\n\n${route.frame}`,
      // Concern tag first so the checker can converge on it like any other.
      tags: [...route.tags, "stated-worry"],
    },
  };
}

// ---------------------------------------------------------------------------
// Checker — reads every review at once and looks for what none could see alone
// ---------------------------------------------------------------------------

const DEPENDENCY_RULES: {
  tags: [string, string];
  note: (brief: Brief) => string;
}[] = [
  {
    tags: ["empty-state", "onboarding"],
    note: () =>
      "**Onboarding depends on empty states.** The activation moment is designed on a screen whose empty version doesn't exist. Fix the empty state first or the onboarding work gets redone.",
  },
  {
    tags: ["identity", "permissions"],
    note: () =>
      "**Permissions depend on the data model.** Roles can't be enforced until something owns each record. Any permission UI built before that is decoration.",
  },
  {
    tags: ["data", "screens"],
    note: (b) =>
      `**Screens depend on deletion semantics.** The ${plural(
        b.entities[0]
      ).toLowerCase()} list can't be finished until you decide what a deleted ${b.entities[0].toLowerCase()} looks like — blocked, tombstoned, or gone.`,
  },
  {
    tags: ["errors", "feedback"],
    note: () =>
      "**Error copy and confirmation are the same piece of work.** They're currently split across two reviews and will be written twice, inconsistently, unless they're specified together.",
  },
  {
    tags: ["migration", "data"],
    note: () =>
      "**Import shapes the data model.** If existing records come in from a spreadsheet, the model has to tolerate their messiness — partial rows, duplicates, and fields that don't map.",
  },
  {
    tags: ["offline", "platform"],
    note: () =>
      "**Offline is a flow decision, not a platform detail.** It changes the primary flow's steps, so it can't be deferred to implementation.",
  },
  {
    tags: ["adoption", "audience"],
    note: () =>
      "**Adoption depends on narrowing the audience.** The switching argument can't be written until you know which person you're arguing with.",
  },
];

function raise(severity: Severity): Severity {
  if (severity === "low") return "medium";
  if (severity === "medium") return "critical";
  return "critical";
}

/**
 * Only these count as convergence.
 *
 * Tags like `data` or `screens` say which part of the product a finding lives
 * in — of course several reviews touch them, and treating that as agreement
 * raises almost everything to critical, which is the same as raising nothing.
 * These are the tags that describe a *concern*, so two reviews landing on one
 * independently is real signal.
 */
const CONCERN_TAGS = new Set([
  "empty-state",
  "errors",
  "offline",
  "permissions",
  "identity",
  "concurrency",
  "migration",
  "adoption",
  "trust",
  "feedback",
  "onboarding",
  "ia",
  "scope",
]);

const MAX_REPORTED_GROUPS = 6;

export function runChecker(
  brief: Brief,
  leafResults: Record<string, NodeResult>
): NodeResult {
  const all: Finding[] = Object.values(leafResults).flatMap((r) => r.findings);

  // tag -> distinct nodes that raised something with that tag
  const byTag = new Map<string, Set<string>>();
  for (const f of all) {
    for (const tag of f.tags) {
      if (!byTag.has(tag)) byTag.set(tag, new Set());
      byTag.get(tag)!.add(f.node);
    }
  }

  const crossCutting = [...byTag.entries()]
    .filter(([tag, nodes]) => nodes.size > 1 && CONCERN_TAGS.has(tag))
    .sort((a, b) => b[1].size - a[1].size);
  const crossTags = new Set(crossCutting.map(([tag]) => tag));

  // For each converging concern, one finding leads and gets raised — the most
  // severe statement of it. The rest keep their own severity but carry the
  // link, so the convergence is visible without promoting half the list.
  const leads = new Set<string>();
  for (const [tag] of crossCutting) {
    const candidates = all.filter((f) => f.tags[0] === tag);
    if (candidates.length === 0) continue;
    const lead = candidates.reduce((best, f) =>
      SEVERITY_RANK[f.severity] < SEVERITY_RANK[best.severity] ||
      (f.severity === best.severity && f.detail.length > best.detail.length)
        ? f
        : best
    );
    leads.add(lead.id);
  }

  const merged: Finding[] = all.map((f) => {
    const primary = f.tags[0];
    if (!crossTags.has(primary)) return f;
    const others = new Set<string>();
    for (const node of byTag.get(primary) ?? []) {
      if (node !== f.node) others.add(node);
    }
    if (others.size === 0) return f;
    if (!leads.has(f.id)) return { ...f, alsoIn: [...others] };
    const severity = raise(f.severity);
    return {
      ...f,
      severity,
      // Only record a promotion when one actually happened.
      ...(severity === f.severity ? {} : { raisedFrom: f.severity }),
      alsoIn: [...others],
    };
  });

  // Consolidating duplicates is the checker's job, not the summary's — doing it
  // here keeps the counts it reports the same as the ones the spec shows.
  const byTitle = new Set<string>();
  const consolidated = merged.filter((f) => {
    const key = f.title.toLowerCase();
    if (byTitle.has(key)) return false;
    byTitle.add(key);
    return true;
  });

  const presentTags = new Set(all.flatMap((f) => f.tags));
  const dependencies = DEPENDENCY_RULES.filter(
    (rule) => presentTags.has(rule.tags[0]) && presentTags.has(rule.tags[1])
  ).map((rule) => rule.note(brief));

  const worry = all.find((f) => f.tags.includes("stated-worry"));

  const lines: string[] = [`# Checker`, ""];
  lines.push(
    `**Reviews read:** ${Object.keys(leafResults).length}`,
    `**Findings in:** ${all.length}`,
    `**Cross-cutting concerns:** ${crossCutting.length}`,
    ""
  );

  lines.push("## Issues appearing in more than one review", "");
  if (crossCutting.length === 0) {
    lines.push(
      "None. Each review found its own problems and they don't overlap, which is unusual — worth checking the reviews were actually independent.",
      ""
    );
  } else {
    lines.push(
      "Each of these was raised by reviews that couldn't see each other's work. Convergence is the strongest signal available here, so everything below is one level more severe in the final list than the review that raised it thought.",
      ""
    );
    for (const [tag, nodes] of crossCutting.slice(0, MAX_REPORTED_GROUPS)) {
      const seen = new Set<string>();
      const related = all.filter((f) => {
        if (!f.tags.includes(tag) || !nodes.has(f.node)) return false;
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
      lines.push(
        `### ${tag} — raised in ${nodes.size} reviews`,
        "",
        `Surfaced independently by **${[...nodes].join("**, **")}**:`,
        ""
      );
      for (const f of related) {
        lines.push(`- \`${f.node}\` — ${f.title}`);
      }
      lines.push("");
    }
    if (crossCutting.length > MAX_REPORTED_GROUPS) {
      lines.push(
        `Plus ${crossCutting.length - MAX_REPORTED_GROUPS} smaller overlaps, carried into the final list without being called out here.`,
        ""
      );
    }
  }

  lines.push("## Cross-review dependencies", "");
  if (dependencies.length === 0) {
    lines.push("No ordering constraints found between reviews.", "");
  } else {
    lines.push(
      "These are the ones where doing the work in the wrong order means doing it twice.",
      ""
    );
    for (const dep of dependencies) lines.push(`- ${dep}`, "");
  }

  if (worry) {
    const echoed = crossCutting.filter(([tag]) => worry.tags.includes(tag));
    lines.push("## Your stated worry", "");
    lines.push(`> ${brief.worry}`, "");
    if (echoed.length > 0) {
      lines.push(
        `Independently confirmed. ${echoed
          .map(([tag, nodes]) => `**${tag}** came up in ${nodes.size} reviews`)
          .join(", ")} — none of which knew what you'd told us. Your instinct was right and it's the first thing on the list.`,
        ""
      );
    } else {
      lines.push(
        "None of the reviews surfaced this independently. That's worth knowing: either it's a smaller risk than it feels, or it's a question about the market rather than the design — and this graph only reviews the design.",
        ""
      );
    }
  }

  const criticals = consolidated.filter((f) => f.severity === "critical").length;
  const raised = consolidated.filter((f) => f.raisedFrom).length;
  const folded = merged.length - consolidated.length;
  lines.push("## Handing off", "");
  lines.push(
    `${consolidated.length} findings after folding ${folded} duplicate${
      folded === 1 ? "" : "s"
    }. ${criticals} ${
      criticals === 1 ? "is" : "are"
    } critical, ${raised} of which this pass raised. Passing to the summary for prioritisation.`
  );

  return { markdown: lines.join("\n").trim() + "\n", findings: consolidated };
}

// ---------------------------------------------------------------------------
// Summary — the prioritised list
// ---------------------------------------------------------------------------

export function runSummary(brief: Brief, checked: NodeResult): NodeResult {
  // The checker already folded duplicates; this only orders them.
  const findings = [...checked.findings]
    .sort((a, b) => {
      // The thing they told us they were worried about goes first.
      const worry =
        Number(b.tags.includes("stated-worry")) -
        Number(a.tags.includes("stated-worry"));
      if (worry !== 0) return worry;
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (bySeverity !== 0) return bySeverity;
      const byBreadth = (b.alsoIn?.length ?? 0) - (a.alsoIn?.length ?? 0);
      if (byBreadth !== 0) return byBreadth;
      return a.title.localeCompare(b.title);
    });

  const group = (s: Severity) => findings.filter((f) => f.severity === s);

  const lines: string[] = [`# ${brief.product || "Product spec"}`, ""];
  lines.push(
    `**For:** ${brief.actorPlural}`,
    `**Shape:** ${brief.typeLabel}`,
    `**Ships on:** ${brief.platforms.map(platformLabel).join(", ") || "Web"}`,
    `**Readiness:** ${scaleLabel(brief.scale)}`,
    ""
  );

  lines.push("## What we're building", "");
  lines.push(brief.product || "—", "");
  if (brief.job) {
    lines.push(
      `The one thing it must do: **${brief.job.replace(/\.$/, "")}.** Everything below is in service of that, or it isn't in v1.`,
      ""
    );
  }

  const sections: [string, Severity, string][] = [
    [
      "Fix first",
      "critical",
      "These block design work downstream. Each one is a decision that other decisions depend on.",
    ],
    [
      "Then",
      "medium",
      "Real gaps, but they can be settled while the critical work is in progress.",
    ],
    [
      "Later",
      "low",
      "Worth writing down so they don't get rediscovered as surprises.",
    ],
  ];

  for (const [heading, severity, blurb] of sections) {
    const group_ = group(severity);
    if (group_.length === 0) continue;
    lines.push(`## ${heading} — ${severity} (${group_.length})`, "", blurb, "");
    group_.forEach((f, i) => {
      const flags: string[] = [`\`${f.node}\``];
      if (f.alsoIn?.length) {
        const shown = f.alsoIn.slice(0, 3).join(", ");
        const extra = f.alsoIn.length - 3;
        flags.push(`also in ${shown}${extra > 0 ? ` +${extra} more` : ""}`);
      }
      if (f.raisedFrom) flags.push(`raised from ${f.raisedFrom}`);
      lines.push(`### ${i + 1}. ${f.title}`, "", `${flags.join(" · ")}`, "", f.detail, "");
    });
  }

  lines.push("## Open questions", "");
  const questions = [
    `Does this flow require an account before it starts? It changes the first two screens.`,
    `Is a **${brief.entities[0]}** owned by one person or shared? It decides the permission model.`,
    brief.entities.length > 1
      ? `Where does a **${brief.entities[1]}** get created? No flow currently makes one.`
      : `What's the second entity hiding inside **${brief.entities[0]}**?`,
    `What brings ${brief.actorPlural} back on day two?`,
  ];
  for (const q of questions) lines.push(`- ${q}`);
  lines.push("");

  lines.push("## Out of scope for v1", "");
  lines.push(
    brief.outOfScope
      ? `${brief.outOfScope}\n\nHold this line. Every item in the list above is inside it.`
      : "Nothing was declared out of scope, which means everything is arguably in it. Name three things you're not building before the first review meeting, or they'll be added for you.",
    ""
  );

  lines.push("---", "");
  lines.push(
    `${findings.length} findings · ${group("critical").length} critical · ${
      group("medium").length
    } medium · ${group("low").length} low`
  );

  return { markdown: lines.join("\n").trim() + "\n", findings };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const LEAF_REVIEWS: Record<
  string,
  (brief: Brief, answers: Answers) => NodeResult
> = {
  audience: reviewAudience,
  flows: reviewFlows,
  screens: reviewScreens,
  data_model: reviewDataModel,
  edge_cases: reviewEdgeCases,
  first_run: reviewFirstRun,
  roles: reviewRoles,
  liquidity: reviewLiquidity,
  decision_loop: reviewDecisionLoop,
  authoring: reviewAuthoring,
  adoption: reviewAdoption,
  platform_native: (brief) => reviewPlatformNative(brief),
  scale_risk: (brief) => reviewScaleRisk(brief),
};

export interface ExecuteInput {
  nodeId: string;
  answers: Answers;
  /** Ids of every leaf in the compiled graph — used to route the stated worry. */
  leafIds: string[];
  /** Results of this node's dependencies. */
  deps: Record<string, NodeResult>;
}

/** Run one node. Pure — same inputs always produce the same output. */
export function executeNode(input: ExecuteInput): NodeResult {
  const brief = deriveBrief(input.answers);

  if (input.nodeId === "checker") {
    return runChecker(brief, input.deps);
  }
  if (input.nodeId === "summary") {
    const checked = input.deps.checker;
    if (!checked) {
      return { markdown: "# Spec\n\nChecker output missing.\n", findings: [] };
    }
    return runSummary(brief, checked);
  }

  const review = LEAF_REVIEWS[input.nodeId];
  if (!review) {
    return { markdown: `# ${input.nodeId}\n\nNo review defined.\n`, findings: [] };
  }

  const result = review(brief, input.answers);

  // The stated worry rides along with whichever review is closest to it.
  const routed = worryFinding(brief, input.leafIds);
  if (routed && routed.node === input.nodeId) {
    return {
      markdown:
        result.markdown +
        `\n### [critical] ${routed.finding.title}\n\n${routed.finding.detail}\n`,
      findings: [routed.finding, ...result.findings],
    };
  }

  return result;
}

export { SEVERITY_RANK };
