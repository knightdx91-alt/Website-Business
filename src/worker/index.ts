import { gcalClientId, gcalLast, gtasksLast } from "./gcal.ts";
import { bareDomain, buyUrl, domainAvailable, DOMAIN_RE, suggestDomains, ourZone, wireDomain, type DomainStage } from "./domains.ts";
import { gaLastError, gaServiceAccount, gaState, grantViewer, queueGaBackfill, reportsUrl } from "./analytics.ts";
import { CHANGELOG, LATEST_CHANGE, changelogSeenKey, changesSince, unseenChanges } from "./changelog.ts";
import { relocate } from "./relocate.ts";
import { stockPhotosOf } from "../generator/scenes.ts";
import { addEntry, chicagoDay, clockIn, clockOut, clockStatus, deleteEntry, editEntry, EntryInput, remindOpenShifts, setHourly, teamWeek, timesheetCsv } from "./clock.ts";
import { AI_KEY_RE, aiKeyStatus, clearAiKey, saveAiKey, testAiKey, withAiKey } from "./ai-key.ts";
import { autoMatchPhotos, sectionSlug } from "../generator/packs/retail.ts";
import { kindWords, listKind } from "../generator/pricelist.ts";
import {
  applySiteFacts,
  cleanImages,
  extractSiteFacts,
  isDirectoryPage,
} from "../places/site-import.ts";
import { layoutOf } from "../generator/design.ts";
import { LAYOUT_IDS, LAYOUTS } from "../generator/layouts.ts";
import { z } from "zod";
import {
  DNA_ORDER,
  LEGACY_DNA,
  RECIPES,
  encodeDna,
  pickDna,
  settleDna,
} from "../generator/dna.ts";
import { designId, LOOKS, parseDesign } from "../generator/themes.ts";
import { menuToText } from "../generator/menu.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import { packFor } from "../generator/packs/index.ts";
import { galleryFromPlace, GOOGLE_IMPORT_FIELDS, refreshFromPlace } from "./google-import.ts";
import type { BusinessRecord, CategoryId, Copy } from "../generator/types.ts";
import {
  groupById,
  MARKET,
  SEARCH_GROUPS,
  searchesFor,
} from "../places/queries.ts";
import Anthropic from "@anthropic-ai/sdk";
import { writePitch } from "../copy/pitch.ts";
import {
  profileTextProblems,
  socialTextProblems,
  writeMonthlyPosts,
  writeProfileKit,
  writeReviewReply,
  writeSocialPosts,
  type GbpPost,
  type ProfileKit,
  type SocialPost,
} from "../copy/gbp.ts";
import { reviewTexts } from "../places/to-record.ts";
import {
  getPlace,
  RESTAURANT_FLAGS,
  searchText,
  type Place,
} from "../places/client.ts";
import {
  guessCategory,
  isChain,
  scorePlace,
  webPresence,
  type WebPresence,
} from "../places/qualify.ts";
import { resolvePresence } from "../places/web-presence.ts";
import { isManualPlaceId, manualPlace } from "../places/manual.ts";
import { LESSON_IDS, trainingCourse } from "./training.ts";
import { customerBoardPitch, customerPitchPage, guideById } from "./guides.ts";
import {
  LAST_ANNOUNCE_KEY,
  TICK_KEY,
  announceUpdate,
  fcmClientConfig,
  serviceAccount,
  serviceAccountProblem,
} from "./fcm.ts";
import {
  clientLink,
  republishDirty,
  saveAndRefresh,
  servePhoto,
  servePricesFeed,
  serveTankBoard,
} from "./tankboard.ts";
import {
  addSampleStock,
  hasSampleStock,
  removeSampleStock,
} from "./sample-stock.ts";
import { resetPracticeLead } from "./practice.ts";
import {
  applyBankedReferrals,
  founderOffer,
  markReferralApplied,
  onPlanPaid,
  referralSummary,
  setReferrer,
} from "./referrals.ts";
import { serveDisplay, serveDisplayMeta, serveStation } from "./tablet.ts";
import {
  addCaller,
  checkPassword,
  clearCookie,
  extrasToken,
  getSession,
  hasOwner,
  listCallers,
  loginAllowed,
  pruneLoginFailures,
  recordLoginFailure,
  removeCaller,
  sessionCookie,
  sessionToken,
  setupOwner,
  shareToken,
  signupToken,
  updateCaller,
  verifyExtras,
  verifyShare,
  verifySignup,
  type Session,
  boardPitchToken,
  verifyBoardPitch,
} from "./auth.ts";
import {
  previewFlyer,
  reviewCards,
  tableTents,
  windowSign,
  previewFlyerPdf,
  reviewCardsPdf,
  tableTentsPdf,
  windowSignPdf,
  priceTagsPdf,
} from "./cards.ts";
import { COMPANY_HOSTS, COMPANY_LEAD_ID, COMPANY_ORIGIN, serveCompany } from "./company.ts";
import {
  addDomain,
  getDomain,
  removeDomain,
  type PagesDomain,
} from "./pages.ts";
import { cadenceFor, nextCadenceStep, salesDashboard } from "./sales.ts";
import { portalSession } from "./checkout.ts";
import {
  achFormPdf,
  agreementPage,
  agreementPdf,
  appSignup,
  contractJson,
  contractPreviewPage,
  contractPreviewPdf,
  purchasesFor,
  serveExtras,
  serveSignup,
  signupPrefill,
  signupsFor,
  websiteOrders,
} from "./signup.ts";
import {
  ALERT_MODES,
  START_LESSONS,
  START_PRACTICE,
  healthItems,
  nextStepFor,
  publishChecklist,
  rankQueue,
} from "./queue.ts";
import { recordHit, siteReport } from "./stats.ts";
import { EXPIRE_SQL } from "./expire.ts";
import { assignMailCode, backfillMailCodes, mailCsv, mailList, markHandedOut, pruneCodeCounters } from "./mailcodes.ts";
import {
  addonPrice,
  addUsage,
  billingOptions,
  defaultTerms,
  getLead,
  getSetting,
  getSettings,
  MODEL_PRICES,
  setSetting,
  updateLead,
  type LeadRow,
  type RunRow,
  promoRules, isPayTest } from "./db.ts";
import { applyEdits, EditsSchema } from "./edits.ts";
import {
  HttpError,
  json,
  localDate,
  newId,
  now,
  type Env,
  type Job,
} from "./env.ts";
import { handleFormPost } from "./forms.ts";
import { mergeSettings } from "./db.ts";
import { commissionRules, commissionTable, quoteCommission } from "./commission.ts";
import { blockedSummary, pruneSpamCounters, turnstileState } from "./spam.ts";
import {
  allowedEndpoint,
  getAlertMode,
  latestForPush,
  setAlertMode,
  listEvents,
  markSeen,
  notify,
  pushTo,
  unreadCount,
  vapidPublicKey,
} from "./notify.ts";
import { stripeWebhook } from "./stripe.ts";
import { pdfResponse } from "./pdf.ts";
import {
  cardReady,
  completeCardSetup,
  completeTap,
  connectionToken,
  reconcileTaps,
  refundable,
  refundSignup,
  setupTap,
  startCardSetup,
  startTap,
  tapAuth,
  tapSession,
  tapStatus,
  TapLogBody,
  tapLog,
  tapLastFailure,
} from "./tap.ts";
import {
  DEFAULT_DOMAIN,
  googleSession,
  verifyGoogleIdToken,
} from "./google.ts";
import { editForm, editsFromForm } from "./editform.ts";
import { extraTerms } from "./contract.ts";
import { appContent } from "./content.ts";
import { plansOptions } from "./plan-options.ts";
import { mailReady, maskEmail, sendEmailDetailed } from "./mail.ts";
import { createTask, deleteTask, listTasks, pollGoogleTasks, updateTask, upgradeCalendars } from "./tasks.ts";
import { translateToSpanish } from "../copy/spanish.ts";
import {
  chooseLook,
  designFor,
  dnaHints,
  renderPreview,
  runBuild,
  runRestyle, runRelive, queueRelive,
  runSearch,
  importSitePhotos,
  forgetSiteImport,
  requeueStuck, recategorizeLead } from "./pipeline.ts";
import { lockDesign, lookOwner, soldDesigns, type SoldDesign } from "./exclusive.ts";
import { servePreview } from "./preview.ts";
import {
  costAlerts,
  costsReport,
  getCostOverrides,
  saveCostOverrides,
} from "./costs.ts";
import { flushUsage, installMeter } from "./meter.ts";
import { publishLead, zipLead } from "./publish.ts";

/** Lets the Android app (android/) open this site full-screen. The fingerprint is the app's public signing certificate. */
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.knightdx91.websitebusiness",
      // Every signing key the app has shipped with, so older installs stay full-screen: 1.0-1.1, then 1.2.
      sha256_cert_fingerprints: [
        "62:7F:C0:94:66:E4:CB:F7:D2:A7:AC:60:BA:D2:48:34:0C:3B:58:B2:06:26:99:5D:83:94:7F:B7:36:CC:FD:FA",
        "AB:07:5A:34:16:59:24:70:46:74:79:CF:E8:8A:47:5B:76:01:C3:27:49:F0:BD:08:16:EE:B5:18:50:CE:A3:16",
      ],
    },
  },
];

const PLACES_COST_PER_REQUEST = 0.04;
const PHOTO_COST = 0.007;
/** Weekly R2 backups kept (_backup/<date>.json). */
const BACKUP_KEEP = 8;
/** A build still "queued"/"building" after this long is stuck (the queue gave up) and may be retried. */
const STUCK_BUILD_MS = 20 * 60_000;
/** A run still searching or building this long after it started is treated as stalled. */
const STALLED_RUN_MS = 90 * 60_000;
/** Which scheduled trigger fired (wrangler.jsonc): the daily housekeeping run and the weekly backup. */
const CRON_WEEKLY_BACKUP = "0 9 * * SUN";
const CRON_MINUTE = "* * * * *";

/** Only web addresses: zod's url() alone would let a javascript: link through. */
const WEB_URL = (max: number) =>
  z
    .string()
    .trim()
    .url()
    .max(max)
    .refine(
      (u) => u.startsWith("https://") || u.startsWith("http://"),
      "Links must start with https://",
    );

async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new HttpError(400, "Expected JSON");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new HttpError(
      400,
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  return parsed.data;
}

/** `latest_signup_paid` comes from the list query (the newest sign-up's paid flag); lead GET passes it from signupsFor. */
/** Card wording per web presence (see src/places/qualify.ts and web-presence.ts). */
const PRESENCE_LABEL: Record<WebPresence, string> = {
  none: "No website",
  social: "Only a social page",
  free_builder: "Free-builder site",
  has_site: "Has a website",
  outdated: "Outdated website",
  elsewhere: "Page on another site",
};

/** Extra columns the Activity list (`/leads?activity=1`) selects: the newest note and how many there are. */
interface ActivityCols {
  last_note_json?: string | null;
  note_count?: number | null;
  last_activity?: number | null;
}

/**
 * The columns a lead card needs. The list query selects these instead of `leads.*`: the JSON blobs (Google place data, the
 * site record, copy, call guide) run to megabytes across a hundred leads and Home loads several lists at once, which made the
 * leads tab spin for seconds (Oct 2026). `has_pitch` stands in for pitch_json.
 */
const LIST_COLS =
  "id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, found_url, score, status, sales_status, look, lint_json, (pitch_json IS NOT NULL) AS has_pitch, follow_up, last_contact, contact, best_time, shown_at, lat, lng, custom_domain, domain_active, preview_opens, preview_opened_at, mail_code, mail_opens, mail_opened_at, error, rewrite, pages_project, live_url, published_at, fetched_at, created_at, updated_at";

function summary(
  l: LeadRow & {
    latest_signup_paid?: number | null;
    has_pitch?: number | null;
  } & ActivityCols,
) {
  const lint = l.lint_json
    ? (JSON.parse(l.lint_json) as {
        publishBlockers?: string[];
        errors?: string[];
        todos?: string[];
      })
    : null;
  const activity =
    l.last_note_json !== undefined
      ? {
          /** Newest call-log entry: {outcome, author, body, at}; null when the lead only has a task, sign-up or callback. */
          lastNote: l.last_note_json
            ? (JSON.parse(l.last_note_json) as {
                outcome: string | null;
                author: string;
                body: string;
                at: number;
              })
            : null,
          notes: l.note_count ?? 0,
          lastActivity: l.last_activity ?? null,
        }
      : {};
  const out = {
    ...activity,
    id: l.id,
    runId: l.run_id,
    category: l.category,
    name: l.name,
    phone: l.phone,
    address: l.address,
    rating: l.rating,
    reviewCount: l.review_count,
    presence: l.presence,
    reason: l.reason,
    /** A page the web-presence check found: their unlinked site or a page on a parent site (null when none). */
    foundUrl: l.found_url ?? null,
    score: l.score,
    status: l.status,
    salesStatus: l.sales_status,
    look: l.look,
    error: l.error,
    liveUrl: l.live_url,
    hasPitch: l.has_pitch !== undefined ? !!l.has_pitch : !!l.pitch_json,
    followUp: l.follow_up,
    lastContact: l.last_contact,
    placeId: l.place_id,
    /** The practice lead (training aid): $1 payments, never expires, never counted, resettable. */
    payTest: l.place_id === "paytest",
    lat: l.lat,
    lng: l.lng,
    customDomain: l.custom_domain,
    /** The custom domain works and is the site's address (else it is waiting on its DNS record). */
    domainActive: !!l.domain_active,
    previewOpens: l.preview_opens ?? 0,
    previewOpenedAt: l.preview_opened_at,
    /** Flyer code written on a mailed / left-behind flyer (undergroundassociates.com/code), and how often it was used. */
    mailCode: l.mail_code ?? null,
    mailOpens: l.mail_opens ?? 0,
    mailOpenedAt: l.mail_opened_at ?? null,
    contact: l.contact ?? null,
    bestTime: l.best_time ?? null,
    /** The newest sign-up exists and hasn't been paid: chase the payment. */
    unpaidSignup: l.latest_signup_paid === 0,
    todos: lint?.todos?.length ?? 0,
    blockers: lint
      ? (lint.publishBlockers?.length ?? 0) + (lint.errors?.length ?? 0)
      : null,
    createdAt: l.created_at,
  };
  /** The one thing to do next on this lead (title, one line, button, route), the same on every screen. */
  return { ...out, nextStep: nextStepFor(out, localDate()) };
}

interface NoteRow {
  id: string;
  lead_id: string;
  author: string;
  outcome: string | null;
  body: string;
  created_at: number;
}

// link_sent: a preview link was texted or copied (counts as contact, nothing else). reached: someone answered (no status change).
/** Phone outcomes (no_answer, reached), in-person outcomes (not_in = owner wasn't there, visited = talked in person, flyer = left the preview flyer) and the shared ones. */
const OUTCOMES = [
  "note",
  "no_answer",
  "reached",
  "not_in",
  "visited",
  "flyer",
  "link_sent",
  "callback",
  "shown",
  "sold",
  "not_interested",
] as const;
const OUTCOME_STATUS: Partial<
  Record<(typeof OUTCOMES)[number], LeadRow["sales_status"]>
> = {
  shown: "shown",
  sold: "sold",
  not_interested: "not_interested",
  flyer: "shown",
};
const PAY_LINK = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine(
    (u) => u.startsWith("https://"),
    "Payment links must start with https://",
  );
const CALLER_NAME = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[^\u0000-\u001f"\\<>]+$/, "Use letters and spaces only");
const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-09");

async function notesFor(env: Env, leadId: string) {
  const rows = await env.DB.prepare(
    "SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC LIMIT 100",
  )
    .bind(leadId)
    .all<NoteRow>();
  return rows.results.map((n) => ({
    id: n.id,
    author: n.author,
    outcome: n.outcome,
    body: n.body,
    createdAt: n.created_at,
  }));
}

/** Call guides name the caller; swap the cached name for whoever is opening it instead of paying for a rewrite. */
function pitchFor(raw: string, callerName: string | undefined): unknown {
  const { _caller, ...pitch } = JSON.parse(raw) as { _caller?: string };
  if (!_caller || !callerName || _caller === callerName) return pitch;
  return JSON.parse(
    JSON.stringify(pitch).split(_caller).join(callerName.replace(/["\\]/g, "")),
  );
}

interface GbpState {
  checks: Record<string, boolean>;
  kit?: ProfileKit & { createdAt: number; problems: string[] };
  posts: Array<
    GbpPost & {
      id: string;
      month: string;
      status: "draft" | "posted";
      createdAt: number;
      problems: string[];
    }
  >;
  notes?: string;
  /** Social media posts extra: Facebook/Instagram drafts. */
  social?: Array<
    SocialPost & {
      id: string;
      month: string;
      status: "draft" | "posted";
      createdAt: number;
      problems: string[];
    }
  >;
}

function gbpState(l: LeadRow): GbpState {
  return l.gbp_json
    ? (JSON.parse(l.gbp_json) as GbpState)
    : { checks: {}, posts: [] };
}

async function chargeAi(
  env: Env,
  model: string,
  usage: { input: number; output: number },
): Promise<void> {
  const price = MODEL_PRICES[model] ?? MODEL_PRICES["claude-opus-5-5"]!;
  await addUsage(env, {
    aiIn: usage.input,
    aiOut: usage.output,
    costMicro: Math.round(
      usage.input * price.input + usage.output * price.output,
    ),
  });
}

const CATEGORY_IDS = ["restaurant", "contractor", "salon", "auto", "landscaping", "cleaning", "print", "retail", "finance", "church", "general"] as const;

/** `o.sold`: the category's sold / live clients, so the look picker can mark their looks (GET lead and the editor data pass it). */
/** A client's domain name as typed in the app ("www.theirbusiness.com"). */
const DOMAIN_NAME = z
  .string()
  .trim()
  .toLowerCase()
  .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
  .pipe(z.string().max(253).regex(/^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/, "Type a domain like www.example.com"));

/** Where a site's own domain stands, as one stage the lead page and Edit can show (see domains.ts). */
async function domainStatus(env: Env, lead: LeadRow) {
  const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
  const domain = lead.custom_domain;
  const base = { domain, buyUrl: buyUrl(env.CF_ACCOUNT_ID), target: lead.pages_project ? `${lead.pages_project}.pages.dev` : null };
  if (!domain) return { ...base, stage: "none" as DomainStage, status: null, error: null, ours: false, pending: !lead.pages_project };
  const zone = await ourZone(auth, domain).catch(() => null);
  if (!lead.pages_project)
    return { ...base, stage: (zone ? "publish" : "buy") as DomainStage, status: "waiting to publish", error: null, ours: !!zone, pending: true };
  const d = await getDomain(auth, lead.pages_project, domain).catch(() => null);
  const stage: DomainStage = d?.status === "active" ? "working" : zone ? "connecting" : "buy";
  return {
    ...base,
    stage,
    status: d?.status ?? null,
    error: d?.verification_data?.error_message ?? d?.validation_data?.error_message ?? null,
    ours: !!zone,
    pending: false,
  };
}

/** Marks a client's domain working: it becomes the site's address, the live site republishes, the team is told. */
async function domainWorking(env: Env, lead: LeadRow): Promise<void> {
  if (lead.domain_active) return;
  await env.DB.prepare("UPDATE leads SET domain_active = 1, prices_dirty = CASE WHEN live_url IS NOT NULL THEN 1 ELSE prices_dirty END WHERE id = ?").bind(lead.id).run();
  await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
    .bind(newId(), lead.id, "App", `🌐 ${lead.custom_domain} is working. The site uses it as its address now.`, now())
    .run();
  await notify(env, { kind: "published", leadId: lead.id, text: `🌐 ${lead.custom_domain} is live: ${lead.name ?? "The site"} now uses its own domain.` });
}

/**
 * Sets (or clears, with null) the client's own domain (stored bare: "reyespizza.com"; www is connected too). Before the first
 * publish it is only remembered and publishing connects it; on a published site it is hooked up at once (domains.ts
 * wireDomain) and becomes the site's address when Cloudflare says it works (now, or later through checkDomains).
 */
async function setLeadDomain(env: Env, lead: LeadRow, typed: string | null, origin: string): Promise<Record<string, unknown>> {
  const domain = typed ? bareDomain(typed) : null;
  const prev = lead.custom_domain;
  const changed = (prev ?? null) !== (domain ?? null);
  if (!lead.pages_project) {
    await updateLead(env, lead.id, { custom_domain: domain, ...(changed ? { domain_active: 0 } : {}) });
    return await domainStatus(env, { ...lead, custom_domain: domain });
  }
  const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
  if (prev && changed) {
    await removeDomain(auth, lead.pages_project, prev).catch(() => null);
    await removeDomain(auth, lead.pages_project, `www.${bareDomain(prev)}`).catch(() => null);
  }
  const wired = domain ? await wireDomain(auth, lead.pages_project, domain) : null;
  const activeNow = wired?.stage === "working";
  const wasActive = !!prev && !!lead.domain_active;
  await updateLead(env, lead.id, { custom_domain: domain, domain_active: activeNow || (!changed && wasActive) ? 1 : 0 });
  let republish: string | undefined;
  if (changed && (activeNow || wasActive) && lead.sales_status === "live" && lead.live_url) {
    try {
      await publishLead(env, (await getLead(env, lead.id))!, origin);
      republish = "ok";
    } catch (err) {
      republish = `failed: ${(err as Error).message}`;
    }
  }
  if (activeNow && changed)
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
      .bind(newId(), lead.id, "App", `🌐 ${domain} is working. The site uses it as its address now.`, now())
      .run();
  return { ...(await domainStatus(env, { ...lead, custom_domain: domain, domain_active: activeNow ? 1 : 0 })), ...(republish ? { republish } : {}), ...(wired?.records ? { records: wired.records } : {}) };
}

/**
 * Minute cron (every fifth minute): client domains not working yet are hooked up again (a domain bought since shows up in our
 * account now) and checked; once one works it becomes the site's address and the team is told.
 */
async function checkDomains(env: Env): Promise<number> {
  if (new Date().getUTCMinutes() % 5 !== 0) return 0;
  const rows = await env.DB.prepare(
    "SELECT * FROM leads WHERE custom_domain IS NOT NULL AND pages_project IS NOT NULL AND COALESCE(domain_active, 0) = 0 AND status != 'expired' ORDER BY updated_at DESC LIMIT 10",
  ).all<LeadRow>();
  const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
  let n = 0;
  for (const lead of rows.results) {
    try {
      const w = await wireDomain(auth, lead.pages_project!, lead.custom_domain!);
      if (w.stage !== "working") continue;
      await domainWorking(env, lead);
      n++;
    } catch (err) {
      console.error("domain check", lead.id, (err as Error).message);
    }
  }
  return n;
}

function detail(l: LeadRow & { latest_signup_paid?: number | null }, o: { sold?: SoldDesign[] } = {}) {
  const record = l.record_json
    ? (JSON.parse(l.record_json) as BusinessRecord)
    : null;
  const copy = l.copy_json ? (JSON.parse(l.copy_json) as Copy) : null;
  const lint = l.lint_json ? JSON.parse(l.lint_json) : null;
  const pack = packFor(l.category as CategoryId);
  return {
    ...summary(l),
    record,
    copy,
    lint,
    menuText: record?.ext.restaurant?.menu
      ? menuToText(record.ext.restaurant.menu.sections)
      : "",
    variantLabel: record ? pack.variantLabel(record) : null,
    /** The live price list's words for this business (Tank board / Bench board / Case board / Stock board). */
    boardName: record ? kindWords(record).board : "Stock board",
    listKind: record ? listKind(record) : null,
    /** Sample items are on the price list (preview only; blocks publishing until removed). */
    sampleStock: record ? hasSampleStock(record) : false,
    /** Items on the live price list (any kind). >0 = the shop uses the inventory system, so the board card sits up top. */
    priceListItems: record?.ext.retail?.priceList?.sections?.reduce((n, sec) => n + (sec.items?.length ?? 0), 0) ?? 0,
    /** Their current website: the page our web check found, else the one Google links (never a social page). */
    website:
      l.found_url ||
      (() => {
        const w = l.place_json
          ? ((JSON.parse(l.place_json) as { websiteUri?: string }).websiteUri ??
            null)
          : null;
        return w &&
          !/facebook\.|instagram\.|linktr\.ee|tiktok\./i.test(w) &&
          !isDirectoryPage(w)
          ? w
          : null;
      })(),
    siteImport: record?.siteImport ?? null,
    googleImportedAt: record?.googleImportedAt ?? null,
    stockPhotos: record ? stockPhotosOf(record) : [],
    /** Typed in by hand: no Google Maps listing, so no Google import, review link or Google photos. */
    notOnGoogle: isManualPlaceId(l.place_id),
    /** The site has a Spanish page at /es/ (share buttons offer a Spanish link). */
    hasSpanish: !!copy?.es,
    /** Google Analytics on the live site: the ID in use, and the reports link + sharing when the app made the property. */
    analytics: record?.seo?.gaId
      ? { id: record.seo.gaId, auto: record.seo.ga?.measurementId === record.seo.gaId, reportsUrl: record.seo.ga?.measurementId === record.seo.gaId ? reportsUrl(record.seo.ga.property) : null }
      : null,
    existingSite: record?.existingSite
      ? {
          url: record.existingSite.url,
          fetchedAt: record.existingSite.fetchedAt,
          via: record.existingSite.via ?? "server",
          images: record.existingSite.images.length,
          paragraphs: record.existingSite.paragraphs.length,
        }
      : null,
    // A look borrowed from another category (an owner's style request) stays in the pickers, so a save never resets it.
    looks: [...new Set([...(l.look && !pack.looks.includes(parseDesign(l.look).look) && LOOKS[parseDesign(l.look).look] ? [parseDesign(l.look).look] : []), ...pack.looks])].map((id) => {
      const owner = o.sold ? lookOwner(o.sold, id) : undefined;
      return { id, name: LOOKS[id]?.name ?? id, ...(owner ? { soldTo: owner.name } : {}) };
    }),
    layouts: LAYOUT_IDS.map((id) => ({
      id,
      name: LAYOUTS[id].name,
      about: LAYOUTS[id].about,
    })),
    dnaOrder: DNA_ORDER,
    dnaRecipes: RECIPES[l.category as CategoryId] ?? [],
    /** The art director's concept and reason for this design, when it picked it (null for hand-rolled or older designs). */
    designNotes: record?.designNotes ? { concept: record.designNotes.concept, why: record.designNotes.why, at: record.designNotes.at, asked: record.designNotes.asked ?? null } : null,
    dna: l.look ? (parseDesign(l.look).dna ?? LEGACY_DNA) : null,
    layout: l.look ? layoutOf(l.look) : null,
    lookBase: l.look ? parseDesign(l.look).look : null,
    /** Finish & publish: every blocker with the Edit card that fixes it (empty = Publish works). */
    checklist: publishChecklist(lint, l.category),
    /** Shown leads: days since they were shown and the next follow-up step; null otherwise. */
    cadence:
      l.sales_status === "shown"
        ? cadenceFor(l.shown_at ?? l.last_contact ?? l.updated_at)
        : null,
  };
}

async function deletePrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const list = await env.BUCKET.list({ prefix, cursor });
    if (list.objects.length)
      await env.BUCKET.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}

/** Showing someone their preview books a check-in 2 days out, unless a callback is already coming up. */
function autoCallback(
  lead: LeadRow,
): { follow_up: string } | Record<string, never> {
  return lead.follow_up && lead.follow_up >= localDate()
    ? {}
    : { follow_up: localDate(2) };
}

/** Fields set the moment a lead becomes Shown: the day-2 callback and the cadence clock. */
function markShown(lead: LeadRow): Partial<LeadRow> {
  return {
    sales_status: "shown",
    shown_at: now(),
    last_contact: now(),
    ...autoCallback(lead),
  };
}

const SITE_UPDATE_COLLAPSE_MS = 15 * 60_000;

/** For Google-only tools on a lead that was typed in by hand. */
const NOT_ON_GOOGLE =
  "They aren't on Google Maps yet, so there's no Google listing to use. Set up their Google Business Profile first (the profile setup extra).";

/**
 * "X updated Y's website (hours, services)": one alert per editing session. The editor saves card by card, so saves by
 * the same person on the same site within 15 minutes fold into the latest alert (its text grows, its time moves up)
 * instead of pinging everyone again.
 */
async function siteUpdated(
  env: Env,
  session: Session,
  lead: LeadRow,
  what: string[],
): Promise<void> {
  const prefix = `${session.name} updated ${lead.name}'s website`;
  // substr(), not LIKE: D1 caps a LIKE pattern at 50 bytes, and a long business name ("Cullman First
  // Congregational") took the prefix past it, so every edit on that lead failed with "pattern too complex".
  const recent = await env.DB.prepare(
    "SELECT id, text FROM events WHERE lead_id = ?2 AND kind = 'status' AND actor_id IS ?3 AND created_at > ?4 AND substr(text, 1, length(?1)) = ?1 ORDER BY created_at DESC LIMIT 1",
  )
    .bind(prefix, lead.id, session.userId, now() - SITE_UPDATE_COLLAPSE_MS)
    .first<{ id: string; text: string }>();
  const parts = new Set<string>();
  const old = /\((.*)\)$/.exec(recent?.text ?? "");
  if (old?.[1]) old[1].split(", ").forEach((w) => parts.add(w));
  what.forEach((w) => parts.add(w));
  const text = `${prefix}${parts.size ? ` (${[...parts].slice(0, 8).join(", ")})` : ""}`;
  if (recent)
    await env.DB.prepare(
      "UPDATE events SET text = ?, created_at = ? WHERE id = ?",
    )
      .bind(text.slice(0, 500), now(), recent.id)
      .run();
  else
    await notify(env, {
      kind: "status",
      actor: session,
      leadId: lead.id,
      text,
    });
}

const EDIT_WORDS: Record<string, string> = {
  hours: "hours",
  services: "services",
  events: "events",
  offers: "offers",
  plans: "plans",
  links: "links",
  proof: "awards",
  closures: "closures",
  visit: "parking & payment",
  hiring: "hiring",
  ext: "details",
  media: "photos",
  faq: "FAQ",
  socials: "social links",
  about: "about",
};

/** Short words for an alert from an /edits payload: which parts of the site changed. */
function editWords(edits: {
  record?: Record<string, unknown>;
  copy?: unknown;
  look?: unknown;
  [k: string]: unknown;
}): string[] {
  const out: string[] = [];
  for (const k of Object.keys(edits.record ?? {}))
    out.push(
      EDIT_WORDS[k] ?? k.replace(/[A-Z]/g, (c) => " " + c.toLowerCase()),
    );
  if (edits.copy) out.push("text");
  if (edits.look) out.push("design");
  return out.length ? out : ["edits"];
}

/** Days since a Shown lead was shown (whole days). */
function daysSinceShown(lead: LeadRow): number {
  return Math.max(
    0,
    Math.floor(
      (now() - (lead.shown_at ?? lead.last_contact ?? lead.updated_at)) /
        86_400_000,
    ),
  );
}

async function requireLead(env: Env, id: string): Promise<LeadRow> {
  const lead = await getLead(env, id);
  if (!lead) throw new HttpError(404, "Lead not found");
  return lead;
}

async function api(env: Env, req: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, "");
  const m = req.method;

  // CSRF guard: browsers can't add custom headers to cross-site form posts.
  if (m !== "GET" && req.headers.get("x-wb") !== "1")
    throw new HttpError(403, "Missing request header");

  if (path === "/auth/state" && m === "GET") {
    const session = await getSession(env, req);
    return json({
      hasOwner: await hasOwner(env),
      loggedIn: !!session,
      role: session?.role ?? null,
      name: session?.name ?? null,
    });
  }
  if (path === "/auth/setup" && m === "POST") {
    const { password } = await body(
      req,
      z.object({ password: z.string().max(200) }),
    );
    await setupOwner(env, password);
    return json({ ok: true }, 200, {
      "set-cookie": await sessionCookie(env, {
        role: "owner",
        userId: "owner",
        name: "Owner",
      }),
    });
  }
  // How to sign in (public): the Google client id for the buttons, the domain allowed, and whether passwords are off.
  if (path === "/auth/config" && m === "GET") {
    const s = await getSettings(env);
    return json({
      googleClientId: s.googleClientId ?? null,
      domain: s.googleDomain || DEFAULT_DOMAIN,
      requireGoogle: !!(s.requireGoogle && s.googleClientId),
      hasOwner: await hasOwner(env),
    });
  }
  // Instant-push health (public, read-only, no secrets): does the Firebase secret parse, when did the minute cron last tick,
  // and how did the last update announcement go. Settings shows it; it also answers "did the push go out?" without logs.
  // The last Tap to Pay failure the phone reported (public, read-only, no secrets): step, Stripe code, cause, phone.
  if (path === "/tap/last" && m === "GET") return json(await tapLastFailure(env));
  if (path === "/push/status" && m === "GET") {
    const [tick, last, announced] = await Promise.all([
      getSetting(env, TICK_KEY),
      getSetting(env, LAST_ANNOUNCE_KEY),
      getSetting(env, "android_announced_code"),
    ]);
    return json({
      server: !!serviceAccount(env),
      problem: serviceAccountProblem(env),
      tick: tick ? Number(tick) : null,
      last: last ? JSON.parse(last) : null,
      announced: announced ? Number(announced) : null,
    });
  }
  // Google sign-in (web button or the Android app): a verified company Workspace account becomes the same signed session.
  if (path === "/auth/google" && m === "POST") {
    const ip = req.headers.get("cf-connecting-ip");
    if (!(await loginAllowed(env, ip)))
      throw new HttpError(
        429,
        "Too many tries. Wait 15 minutes and try again.",
      );
    const { idToken } = await body(
      req,
      z.object({ idToken: z.string().min(20).max(8192) }),
    );
    const s = await getSettings(env);
    if (!s.googleClientId)
      throw new HttpError(
        409,
        "Google sign-in isn't set up yet (Settings → Team → Google sign-in)",
      );
    let who: Session;
    try {
      who = await googleSession(
        env,
        await verifyGoogleIdToken(idToken, s.googleClientId),
      );
    } catch (err) {
      await recordLoginFailure(env, ip);
      throw err;
    }
    return json(
      {
        ok: true,
        role: who.role,
        name: who.name,
        userId: who.userId,
        token: await sessionToken(env, who),
      },
      200,
      { "set-cookie": await sessionCookie(env, who) },
    );
  }
  if (path === "/auth/login" && m === "POST") {
    const ip = req.headers.get("cf-connecting-ip");
    if (!(await loginAllowed(env, ip)))
      throw new HttpError(
        429,
        "Too many tries. Wait 15 minutes and try again.",
      );
    const { password } = await body(
      req,
      z.object({ password: z.string().max(200) }),
    );
    const cfg = await getSettings(env);
    if (cfg.requireGoogle && cfg.googleClientId)
      throw new HttpError(
        403,
        "Passwords are turned off. Sign in with your company Google account.",
      );
    const who = await checkPassword(env, password);
    if (!who) {
      await recordLoginFailure(env, ip);
      throw new HttpError(401, "Wrong password");
    }
    return json({ ok: true, role: who.role }, 200, {
      "set-cookie": await sessionCookie(env, who),
    });
  }
  if (path === "/auth/logout" && m === "POST")
    return json({ ok: true }, 200, { "set-cookie": clearCookie() });

  // The Android Tap to Pay screen: no cookie (it isn't Chrome), a short-lived token from /leads/:id/tap instead.
  if (
    (path === "/tap/session" ||
      path === "/tap/connection_token" ||
      path === "/tap/complete" ||
      path === "/tap/log") &&
    req.headers.has("authorization")
  ) {
    const row = await tapAuth(env, req.headers.get("authorization"));
    if (path === "/tap/session" && m === "GET")
      return json(await tapSession(env, row));
    if (path === "/tap/connection_token" && m === "POST")
      return json(await connectionToken(env));
    if (path === "/tap/log" && m === "POST")
      return json(await tapLog(env, row, await body(req, TapLogBody)));
    if (path === "/tap/complete" && m === "POST") {
      const { paymentIntentId } = await body(
        req,
        z.object({ paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9]+$/) }),
      );
      return json(
        await completeTap(env, {
          signupId: row.id,
          paymentIntentId,
          actorName: "Tap to Pay",
        }),
      );
    }
    throw new HttpError(404, "Not found");
  }

  const session = await getSession(env, req);
  if (!session) throw new HttpError(401, "Please log in");
  const isOwner = session.role === "owner";
  // Callers work leads like the owner (Oct 2026: edits, publish, payments); what stays owner-only is settings, prices, team,
  // runs, sales, inbox, costs, refunds, deleting leads and the practice reset.
  const ownerOnly = () => {
    if (!isOwner) throw new HttpError(403, "Only the owner can do that");
  };

  // Claude API key (owner): which key the app uses, swap in another account's key (checked first), or go back to the
  // Worker secret. The key itself never comes back; only its last 4 characters.
  if (path === "/aikey" && m === "GET") {
    ownerOnly();
    return json(await aiKeyStatus(env));
  }
  if (path === "/aikey" && m === "PUT") {
    ownerOnly();
    const { key } = await body(req, z.object({ key: z.string().trim().max(400) }));
    if (!AI_KEY_RE.test(key)) throw new HttpError(400, "That doesn't look like a Claude API key. It starts with sk-ant-.");
    const t = await testAiKey(key);
    if (!t.ok) throw new HttpError(400, t.error);
    await saveAiKey(env, key, session.name);
    await notify(env, { kind: "costs", actor: session, text: `🤖 ${session.name} switched the app to a new Claude API key (ending ${key.slice(-4)}).` });
    return json(await aiKeyStatus(env));
  }
  if (path === "/aikey" && m === "DELETE") {
    ownerOnly();
    await clearAiKey(env);
    return json(await aiKeyStatus(env));
  }

  // Mail list for a flyer mail-out: the best open leads with a street address, each with its flyer code (owner).
  if (path === "/mailing.csv" && m === "GET") {
    ownerOnly();
    const limit = Math.max(1, Math.min(250, Number(url.searchParams.get("limit")) || 50));
    const rows = await mailList(env, { limit, includeMailed: url.searchParams.get("all") === "1" });
    return new Response(mailCsv(rows), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="mail-list-${localDate()}.csv"` },
    });
  }

  // The agreement a business would sign, before signing: owner and callers show it on the phone.
  if (path === "/ach.pdf" && m === "GET")
    return achFormPdf(env, {
      leadId: url.searchParams.get("lead") ?? undefined,
    });
  if (path === "/contract.json" && m === "GET") {
    return contractJson(env, {
      leadId: url.searchParams.get("lead") ?? undefined,
      plan: url.searchParams.get("plan") ?? undefined,
      billing: url.searchParams.get("billing") ?? undefined,
      picks: url.searchParams.get("picks") ?? undefined,
    });
  }
  // Refunds from the app: what was charged, then refund part or all and optionally end the plan (owner only).
  const creditMatch = /^\/referrals\/([a-z0-9]+)\/applied$/.exec(path);
  if (creditMatch && m === "POST") {
    ownerOnly();
    return json(await markReferralApplied(env, creditMatch[1]!, session.name));
  }
  const refundMatch = /^\/signups\/([a-z0-9]+)\/refund$/.exec(path);
  if (refundMatch) {
    ownerOnly();
    if (m === "GET") return json(await refundable(env, refundMatch[1]!));
    if (m === "POST") {
      const input = await body(
        req,
        z.object({
          chargeId: z.string().regex(/^(ch|py)_[A-Za-z0-9]+$/),
          amountCents: z.number().int().min(1).max(10_000_000),
          cancelPlan: z.boolean().default(false),
          reason: z.string().trim().max(200).optional(),
        }),
      );
      return json(
        await refundSignup(env, {
          signupId: refundMatch[1]!,
          ...input,
          actorName: session.name,
        }),
      );
    }
  }
  // The Android app's native card entry (Stripe payment sheet) for a signed sign-up: owner and callers.
  const payMatch = /^\/signups\/([a-z0-9]+)\/pay\/(start|complete)$/.exec(path);
  if (payMatch && m === "POST") {
    const sid = payMatch[1]!;
    const owner = await env.DB.prepare(
      "SELECT lead_id FROM signups WHERE id = ?",
    )
      .bind(sid)
      .first<{ lead_id: string }>();
    if (!owner) throw new HttpError(404, "No such sign-up");
    if (payMatch[2] === "start")
      return json(
        await startCardSetup(env, { signupId: sid, leadId: owner.lead_id }),
      );
    const { setupIntentId } = await body(
      req,
      z.object({ setupIntentId: z.string().regex(/^seti_[A-Za-z0-9]+$/) }),
    );
    return json(
      await completeCardSetup(env, {
        signupId: sid,
        setupIntentId,
        actorName: session.name,
      }),
    );
  }
  if ((path === "/contract" || path === "/contract.pdf") && m === "GET") {
    const q = {
      leadId: url.searchParams.get("lead") ?? undefined,
      plan: url.searchParams.get("plan") ?? undefined,
      billing: url.searchParams.get("billing") ?? undefined,
    };
    return path.endsWith(".pdf")
      ? contractPreviewPdf(env, q)
      : contractPreviewPage(env, q);
  }
  if (path === "/tap/status" && m === "GET") {
    return json(await tapStatus(env));
  }
  if (path === "/tap/setup" && m === "POST") {
    ownerOnly();
    return json(await setupTap(env));
  }
  // 🎓 Training (owner and callers): the course from src/worker/training.ts plus this person's finished lessons.
  // 📖 Guides (owner and callers): how-tos from src/worker/guides.ts, prices filled from Settings.
  const guide = /^\/guides\/([a-z0-9-]+)$/.exec(path);
  if (guide && m === "GET") {
    const g = guideById(guide[1]!, await getSettings(env));
    if (!g) throw new HttpError(404, "No such guide");
    return json(g);
  }
  // 💵 Costs & usage (owner and full access): what we pay for, this month's usage, renewals. Edits save to settings key costs_json.
  if (path === "/costs" && m === "GET") {
    ownerOnly();
    return json(await costsReport(env, await getSettings(env)));
  }
  if (path === "/costs" && m === "PUT") {
    ownerOnly();
    const input = await body(
      req,
      z.object({
        services: z
          .record(
            z.string().max(40),
            z.object({
              monthlyCents: z
                .number()
                .int()
                .min(0)
                .max(100_000_000)
                .nullable()
                .optional(),
              renews: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .nullable()
                .optional(),
              account: z.string().max(200).nullable().optional(),
              notes: z.string().max(2000).nullable().optional(),
            }),
          )
          .optional(),
        rates: z
          .record(
            z.string().max(80),
            z.object({
              unitCents: z.number().min(0).max(1_000_000).optional(),
              freeQty: z.number().int().min(0).max(1_000_000_000).optional(),
            }),
          )
          .optional(),
        budgetCents: z.number().int().min(0).max(100_000_000).optional(),
      }),
    );
    const cur = await getCostOverrides(env);
    const services = { ...(cur.services ?? {}) };
    for (const [id, v] of Object.entries(input.services ?? {}))
      services[id] = { ...(services[id] ?? {}), ...v };
    const rates = { ...(cur.rates ?? {}) };
    for (const [metric, v] of Object.entries(input.rates ?? {}))
      rates[metric] = { ...(rates[metric] ?? {}), ...v };
    await saveCostOverrides(env, {
      services,
      rates,
      budgetCents: input.budgetCents ?? cur.budgetCents,
    });
    return json(await costsReport(env, await getSettings(env)));
  }
  if (path === "/training" && m === "GET") {
    const done = await env.DB.prepare(
      "SELECT lesson_id FROM training_done WHERE user_id = ?",
    )
      .bind(session.userId)
      .all<{ lesson_id: string }>();
    return json({
      ...trainingCourse(await getSettings(env)),
      done: done.results.map((r) => r.lesson_id),
    });
  }
  if (path === "/training/progress" && m === "PUT") {
    const input = await body(
      req,
      z.object({
        lesson: z.enum(LESSON_IDS as [string, ...string[]]),
        done: z.boolean(),
      }),
    );
    if (input.done)
      await env.DB.prepare(
        "INSERT OR REPLACE INTO training_done (user_id, lesson_id, done_at) VALUES (?, ?, ?)",
      )
        .bind(session.userId, input.lesson, now())
        .run();
    else
      await env.DB.prepare(
        "DELETE FROM training_done WHERE user_id = ? AND lesson_id = ?",
      )
        .bind(session.userId, input.lesson)
        .run();
    const done = await env.DB.prepare(
      "SELECT lesson_id FROM training_done WHERE user_id = ?",
    )
      .bind(session.userId)
      .all<{ lesson_id: string }>();
    return json({ done: done.results.map((r) => r.lesson_id) });
  }
  // Android app: the sales copy (Plans & answers, In-person guide, follow-up texts) and the per-plan ways to pay
  // with what is due today, so the native screens never carry their own copy or billing math. Owner and callers.
  if ((path === "/content" || path === "/plans/options") && m === "GET") {
    const settings = await getSettings(env);
    if (path === "/content") return json(appContent(settings));
    const leadId = url.searchParams.get("lead");
    const forLead = leadId ? await getLead(env, leadId) : null;
    if (leadId && !forLead) throw new HttpError(404, "Lead not found");
    const referrer = forLead?.referred_by
      ? await getLead(env, forLead.referred_by)
      : null;
    return json({
      ...plansOptions(settings, forLead?.category),
      /** Signer name / email the native sign-up starts with (from the lead's contact and known email). */
      prefill: forLead ? signupPrefill(forLead) : null,
      founder: await founderOffer(env, settings),
      referredBy: referrer
        ? {
            id: referrer.id,
            name: referrer.name ?? "",
            months: promoRules(settings).referralMonths,
          }
        : null,
    });
  }
  if (path === "/meta" && m === "GET") {
    const settings = await getSettings(env);
    // Callers see prices and plan names (Show plans, Plans & answers) but not commission, private addresses,
    // payment links or the agreement text.
    const {
      commission: _commission,
      directEmail: _direct,
      gbpEmail: _gbp,
      terms: _terms,
      calendarEmail: _cal,
      ...shared
    } = settings;
    const teamRows = await env.DB.prepare(
      "SELECT id, name FROM users WHERE disabled = 0 ORDER BY name",
    ).all<{ id: string; name: string }>();
    const team = [
      { id: "owner", name: settings.callerName || "Owner" },
      ...teamRows.results,
    ];
    const forCaller = {
      ...shared,
      plans: shared.plans.map(
        ({
          payLink: _a,
          payLinkFlex: _b,
          payLinkAnnual: _c,
          payLinkShort: _d,
          ...p
        }) => p,
      ),
      addons: shared.addons.map(({ terms: _t, ...a }) => a),
    };
    const doneRows = await env.DB.prepare(
      "SELECT lesson_id FROM training_done WHERE user_id = ?",
    )
      .bind(session.userId)
      .all<{ lesson_id: string }>();
    const doneIds = new Set(doneRows.results.map((r) => r.lesson_id));
    const course = trainingCourse(settings).lessons;
    const startLessons = [...START_LESSONS, START_PRACTICE].map((id) => ({
      id,
      title: course.find((l) => l.id === id)?.title ?? id,
      done: doneIds.has(id),
      practice: id === START_PRACTICE,
    }));
    const startDismissed = !!(await getSetting(env, `start_dismissed.${session.userId}`));
    return json({
      me: {
        role: session.role,
        name: session.name,
        id: session.userId,
        /** Alert preference: all / mine / important. */
        alertMode: await getAlertMode(env, session.userId),
      },
      /** What's new: the newest change-log entry and the last one this person saw (null = never). */
      whatsNew: await (async () => {
        const raw = await getSetting(env, changelogSeenKey(session.userId));
        return { latest: LATEST_CHANGE, seen: raw == null ? null : Number(raw) };
      })(),
      /** The Start-here card for new teammates: three lessons and the practice run; `show` false once done or dismissed. */
      start: {
        show: !startDismissed && startLessons.some((l) => !l.done),
        lessons: startLessons,
        /** The practice lead's id (Payment test), for the Start-here card's last step; null if it doesn't exist. */
        practiceLeadId:
          (
            await env.DB.prepare(
              "SELECT id FROM leads WHERE place_id = 'paytest' AND status != 'expired' LIMIT 1",
            ).first<{ id: string }>()
          )?.id ?? null,
      },
      team,
      checkout: {
        online: !!env.STRIPE_SECRET_KEY,
        webhook: !!env.STRIPE_WEBHOOK_SECRET,
        email: mailReady(env),
        publishableKey: settings.stripePublishableKey ?? null,
        cardReady: await cardReady(env, settings),
      },
      /** Firebase client values for the Android app's instant pushes; `server` says whether the Worker can send. */
      fcm: { client: fcmClientConfig(settings), server: !!serviceAccount(env) },
      tap: await tapStatus(env, settings),
      extraTerms: isOwner ? settings.addons.map((a) => extraTerms(a)) : [],
      // A to Z by label: the home filter, Find new leads picker and run summaries all show this list.
      categories: SEARCH_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        category: g.category,
        searches: searchesFor(g, false).length,
        widerSearches: searchesFor(g, true).length,
      })).sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      ),
      defaultTerms: isOwner ? defaultTerms(settings) : "",
      models: Object.entries(MODEL_PRICES).map(([id, p]) => ({
        id,
        label: p.label,
      })),
      settings: isOwner ? settings : forCaller,
    });
  }

  // The Home queue (owner and callers): every lead that needs something, most urgent first, with its one next step.
  if (path === "/queue" && m === "GET") {
    const rows = await env.DB.prepare(
      `SELECT ${LIST_COLS}, (SELECT s.paid FROM signups s WHERE s.lead_id = leads.id ORDER BY s.created_at DESC LIMIT 1) AS latest_signup_paid FROM leads WHERE status != 'expired' AND sales_status NOT IN ('not_interested', 'live') AND place_id != 'paytest' ORDER BY score DESC LIMIT 800`,
    ).all<LeadRow & { latest_signup_paid: number | null; has_pitch: number | null }>();
    const today = localDate();
    const ranked = rankQueue(rows.results.map(summary), today);
    return json({
      today,
      rows: ranked.rows.map((r) => ({ lead: r.lead, step: r.step })),
      counts: ranked.counts,
    });
  }
  // Settings health strip (owner / full access): is every outside piece connected.
  if (path === "/health" && m === "GET") {
    ownerOnly();
    const settings = await getSettings(env);
    const tap = await tapStatus(env, settings);
    return json({
      items: healthItems({
        stripeKey: !!env.STRIPE_SECRET_KEY,
        stripeWebhook: !!env.STRIPE_WEBHOOK_SECRET,
        stripePublishableKey: !!settings.stripePublishableKey,
        tap: { ready: tap.ready, why: tap.why },
        email: mailReady(env),
        companyEmail: settings.companyEmail ?? "",
        googleClientId: !!settings.googleClientId,
        fcmClient: !!fcmClientConfig(settings),
        fcmServer: !!serviceAccount(env),
        webPush: !!env.VAPID_PRIVATE_JWK,
        braveSearch: !!env.BRAVE_SEARCH_API_KEY,
        reviewLink: !!settings.companyReviewUrl,
        companyAddress: !!(settings.companyStreet && settings.companyCity),
        plansPriced: settings.plans.filter((p) => p.monthly).length,
        spam: {
          turnstile: turnstileState(env, settings),
          blocked: (await blockedSummary(env)).month,
        },
        analytics: {
          state: gaState(env, settings),
          serviceEmail: gaServiceAccount(env)?.client_email ?? null,
          lastError: (await gaLastError(env))?.error ?? null,
          sites:
            (await env.DB.prepare("SELECT COUNT(*) AS n FROM leads WHERE json_extract(record_json, '$.seo.ga.property') IS NOT NULL").first<{ n: number }>())?.n ?? 0,
        },
        calendar: { serviceAccount: !!gaServiceAccount(env), clientId: gcalClientId(env), last: await gcalLast(env), tasks: await gtasksLast(env) },
      }),
    });
  }
  // Commission calculator (everyone): the rules, every plan × way to pay, every extra, and an exact quote for any order.
  if (path === "/commission" && m === "GET") {
    const settings = await getSettings(env);
    const rules = commissionRules(settings);
    return json({
      rules,
      table: commissionTable(settings, rules),
      plans: settings.plans
        .filter((p) => p.monthly > 0)
        .map((p) => ({ id: p.id, name: p.name, monthly: p.monthly, options: billingOptions(p, settings).map((o) => ({ id: o.id, label: o.label })) })),
      addons: settings.addons.map((a, index) => ({ index, name: a.name, unit: a.unit, price: a.price, priceText: addonPrice(a), founderPick: !!a.founderPick })),
      churchYearly: !!(settings.churchAnnualMonthsFree ?? 4),
    });
  }
  if (path === "/commission/quote" && m === "POST") {
    const q = await body(
      req,
      z.object({
        plan: z.string().max(20),
        billing: z.string().max(20),
        picks: z.array(z.object({ index: z.number().int().min(0).max(99), qty: z.number().int().min(1).max(20) })).max(40).default([]),
        founder: z.number().int().min(0).max(99).nullish(),
        church: z.boolean().optional(),
        quoteDollars: z.number().min(0).max(100_000).optional(),
        who: z.enum(["solo", "split"]).optional(),
        owner: z.enum(["none", "seller", "opener", "closer"]).optional(),
      }),
    );
    const settings = await getSettings(env);
    return json(quoteCommission(settings, { ...q, founder: q.founder ?? null }));
  }
  // Alert preferences: everything / my leads / important only, per person.
  if (path === "/notifications/prefs" && m === "GET")
    return json({ mode: await getAlertMode(env, session.userId), modes: ALERT_MODES });
  if (path === "/notifications/prefs" && m === "PUT") {
    const { mode } = await body(req, z.object({ mode: z.enum(["all", "mine", "important"]) }));
    await setAlertMode(env, session.userId, mode);
    return json({ mode, modes: ALERT_MODES });
  }
  // "Report this": a problem from either app, with the screen and step, for the owner to read (and an alert).
  if (path === "/report" && m === "POST") {
    const r = await body(
      req,
      z.object({
        app: z.enum(["web", "android"]),
        screen: z.string().trim().max(120).optional(),
        step: z.string().trim().max(120).optional(),
        message: z.string().trim().min(1).max(1000),
        detail: z.string().trim().max(4000).optional(),
        device: z.string().trim().max(200).optional(),
        leadId: z.string().regex(/^[a-z0-9]+$/).optional(),
      }),
    );
    const id = newId();
    await env.DB.prepare(
      "INSERT INTO problem_reports (id, created_at, user_id, user_name, app, screen, step, message, detail, device, lead_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, now(), session.userId, session.name, r.app, r.screen ?? null, r.step ?? null, r.message, r.detail ?? null, r.device ?? null, r.leadId ?? null)
      .run();
    await notify(env, {
      kind: "problem",
      actor: session,
      leadId: r.leadId ?? null,
      text: `${session.name} reported a problem${r.screen ? ` on ${r.screen}` : ""}: ${r.message.slice(0, 160)}`,
    });
    return json({ ok: true, id });
  }
  if (path === "/problems" && m === "GET") {
    ownerOnly();
    const rows = await env.DB.prepare(
      "SELECT p.*, l.name AS lead_name FROM problem_reports p LEFT JOIN leads l ON l.id = p.lead_id ORDER BY (p.status = 'open') DESC, p.created_at DESC LIMIT 100",
    ).all<{
      id: string;
      created_at: number;
      user_name: string | null;
      app: string;
      screen: string | null;
      step: string | null;
      message: string;
      detail: string | null;
      device: string | null;
      lead_id: string | null;
      lead_name: string | null;
      status: string;
      done_at: number | null;
    }>();
    return json({
      problems: rows.results.map((p) => ({
        id: p.id,
        at: p.created_at,
        who: p.user_name,
        app: p.app,
        screen: p.screen,
        step: p.step,
        message: p.message,
        detail: p.detail,
        device: p.device,
        leadId: p.lead_id,
        leadName: p.lead_name,
        status: p.status,
        doneAt: p.done_at,
      })),
    });
  }
  const problemDone = /^\/problems\/([a-z0-9]+)\/(done|reopen)$/.exec(path);
  if (problemDone && m === "POST") {
    ownerOnly();
    const done = problemDone[2] === "done";
    await env.DB.prepare("UPDATE problem_reports SET status = ?, done_at = ? WHERE id = ?")
      .bind(done ? "done" : "open", done ? now() : null, problemDone[1]!)
      .run();
    return json({ ok: true });
  }
  // What's new: the team change log (changelog.ts). ?since=<android version> = what an update would bring.
  if (path === "/changelog" && m === "GET") {
    const since = url.searchParams.get("since");
    const raw = await getSetting(env, changelogSeenKey(session.userId));
    const seen = raw == null ? null : Number(raw);
    return json({
      latest: LATEST_CHANGE,
      seen,
      entries: since ? changesSince(since) : CHANGELOG,
      unseen: unseenChanges(seen),
    });
  }
  if (path === "/changelog/seen" && m === "POST") {
    await setSetting(env, changelogSeenKey(session.userId), String(LATEST_CHANGE));
    return json({ ok: true });
  }
  // "Start here" on Home: hidden once dismissed or finished.
  if (path === "/start/dismiss" && m === "POST") {
    await setSetting(env, `start_dismissed.${session.userId}`, String(now()));
    return json({ ok: true });
  }

  // Notifications: the owner and full-access team see what everyone else did; callers only see preview opens.
  if (path === "/notifications/count" && m === "GET")
    return json({ unread: await unreadCount(env, session.userId, !isOwner) });
  if (path === "/notifications" && m === "GET")
    return json(await listEvents(env, session.userId, 100, !isOwner));

  // Tasks: the whole team can read, add, edit and finish; deleting is the owner's or the task's author's.
  if (path === "/tasks" && m === "GET") {
    const scope = url.searchParams.get("scope") === "done" ? "done" : "open";
    const tasks = await listTasks(env, {
      scope,
      assignee:
        url.searchParams.get("mine") === "1" ? session.userId : undefined,
      leadId: url.searchParams.get("lead") ?? undefined,
      limit: scope === "done" ? 50 : 200,
    });
    return json({ tasks });
  }
  if (path === "/tasks" && m === "POST")
    return json({
      task: await createTask(env, session, await req.json().catch(() => ({}))),
    });
  {
    const tm = /^\/tasks\/([a-z0-9]+)$/.exec(path);
    if (tm && m === "PUT")
      return json({
        task: await updateTask(
          env,
          session,
          tm[1]!,
          await req.json().catch(() => ({})),
        ),
      });
    if (tm && m === "DELETE") {
      await deleteTask(env, session, tm[1]!);
      return json({ ok: true });
    }
  }
  if (path === "/notifications/seen" && m === "POST") {
    await markSeen(env, session.userId);
    return json({ ok: true });
  }
  if (path === "/notifications/latest" && m === "GET")
    return json(await latestForPush(env, session.userId, !isOwner));
  if (path === "/push/key" && m === "GET")
    return json({ key: vapidPublicKey(env) });
  if (path === "/push/subscribe" && (m === "POST" || m === "DELETE")) {
    const { endpoint } = await body(req, z.object({ endpoint: WEB_URL(1000) }));
    if (m === "DELETE")
      await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?")
        .bind(endpoint)
        .run();
    else {
      if (!allowedEndpoint(endpoint))
        throw new HttpError(400, "That push service isn't supported");
      await env.DB.prepare(
        "INSERT INTO push_subs (endpoint, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id",
      )
        .bind(endpoint, session.userId, now())
        .run();
    }
    return json({ ok: true });
  }
  if (path === "/push/test" && m === "POST") {
    const subs = await env.DB.prepare(
      "SELECT endpoint FROM push_subs WHERE user_id = ?",
    )
      .bind(session.userId)
      .all<{ endpoint: string }>();
    await setSetting(env, `push_test_${session.userId}`, String(now()));
    return json({
      sent: await pushTo(
        env,
        subs.results.map((s) => s.endpoint),
      ),
    });
  }

  if (path === "/settings" && m === "PUT") {
    ownerOnly();
    const patch = await body(
      req,
      z.object({
        defaultCap: z.number().int().min(1).max(500),
        copyModel: z.enum(Object.keys(MODEL_PRICES) as [string, ...string[]]),
        companyName: z.string().trim().max(80).nullish(),
        legalName: z.string().trim().max(120).nullish(),
        companyPhone: z.string().trim().max(30).nullish(),
        companyEmail: z.string().trim().email().max(120).nullish(),
        billingEmail: z.string().trim().email().max(120).nullish().or(z.literal("")),
        supportEmail: z.string().trim().email().max(120).nullish().or(z.literal("")),
        googleClientId: z
          .string()
          .trim()
          .regex(
            /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/,
            "A Google client ID ends in .apps.googleusercontent.com",
          )
          .nullish(),
        googleDomain: z
          .string()
          .trim()
          .toLowerCase()
          .regex(
            /^[a-z0-9.-]+\.[a-z]{2,}$/,
            "A domain like undergroundassociates.com",
          )
          .nullish(),
        ownerEmail: z.string().trim().toLowerCase().email().max(120).nullish(),
        requireGoogle: z.boolean().nullish(),
        stripePublishableKey: z
          .string()
          .trim()
          .regex(
            /^pk_(live|test)_[A-Za-z0-9]+$/,
            "A Stripe publishable key starts with pk_live_ or pk_test_",
          )
          .nullish(),
        siteHeadline: z.string().trim().max(120).nullish(),
        siteLead: z.string().trim().max(400).nullish(),
        siteBio: z.string().trim().max(1200).nullish(),
        siteTestimonials: z.string().trim().max(3000).nullish(),
        siteTowns: z.string().trim().max(400).nullish(),
        turnstileSiteKey: z
          .string()
          .trim()
          .regex(
            /^[0-9A-Za-z_-]{10,80}$/,
            "A Turnstile site key looks like 0x4AAAAAAA… (from Cloudflare → Turnstile)",
          )
          .nullish(),
        gaAccountId: z
          .string()
          .trim()
          .regex(/^(accounts\/)?\d{4,20}$/, "The Google Analytics Account ID is a number (Admin → Account settings)")
          .nullish(),
        fcmAppId: z
          .string()
          .trim()
          .regex(
            /^1:\d+:android:[a-f0-9]+$/,
            "A Firebase App ID looks like 1:123456:android:abc123",
          )
          .nullish(),
        fcmApiKey: z
          .string()
          .trim()
          .regex(
            /^AIza[A-Za-z0-9_-]{20,}$/,
            "A Firebase API key starts with AIza",
          )
          .nullish(),
        fcmProjectId: z
          .string()
          .trim()
          .regex(
            /^[a-z0-9-]{4,40}$/,
            "The Firebase project ID is lower-case letters, digits and dashes",
          )
          .nullish(),
        fcmSenderId: z
          .string()
          .trim()
          .regex(/^\d{6,}$/, "The sender ID is a number")
          .nullish(),
        companyStreet: z.string().trim().max(120).nullish(),
        companyCity: z.string().trim().max(60).nullish(),
        companyState: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{2}$/, "Two-letter state")
          .nullish(),
        companyZip: z
          .string()
          .trim()
          .regex(/^\d{5}(-\d{4})?$/, "ZIP code")
          .nullish(),
        directEmail: z.string().trim().email().max(120).nullish(),
        companyReviewUrl: WEB_URL(500).nullish(),
        companyFacebookUrl: WEB_URL(500).nullish(),
        calendarEmail: z.string().trim().email().max(120).nullish(),
        gaMeasurementId: z
          .string()
          .trim()
          .toUpperCase()
          .regex(
            /^G-[A-Z0-9]{4,16}$/,
            "A Google tag ID looks like G-XXXXXXXXXX",
          )
          .nullish(),
        gbpEmail: z.string().trim().email().max(120).nullish(),
        callerName: z.string().trim().max(60).nullish(),
        plans: z
          .array(
            z.object({
              id: z.enum(["basic", "plus", "pro", "list"]),
              name: z.string().trim().min(1).max(40),
              setup: z.number().min(0).max(100_000),
              monthly: z.number().min(0).max(10_000),
              // The Price list plan's includes text runs past 500 characters, and there are four plans since Oct 2026:
              // the old limits made every Settings save fail ("plans: Too big"), found through Report a problem.
              includes: z.string().trim().max(2000),
              payLink: PAY_LINK.nullish(),
              payLinkFlex: PAY_LINK.nullish(),
              payLinkAnnual: PAY_LINK.nullish(),
              payLinkShort: PAY_LINK.nullish(),
            }),
          )
          .max(4),
        minMonths: z.number().int().min(0).max(36).nullish(),
        shortMonths: z.number().int().min(0).max(36).nullish(),
        flexSetup: z.number().min(0).max(10_000).nullish(),
        lateFee: z.number().min(0).max(500).nullish(),
        payoffDiscount: z.number().int().min(0).max(100).nullish(),
        interestRate: z.number().min(0).max(8).nullish(),
        reinstatementFee: z.number().min(0).max(500).nullish(),
        returnedPaymentFee: z.number().min(0).max(100).nullish(),
        invoiceForAll: z.boolean().nullish(),
        annualMonthsFree: z.number().int().min(0).max(6).nullish(),
        addons: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(60),
              price: z.number().min(0).max(10_000),
              unit: z.enum(["month", "each", "one-time", "quote"]),
              about: z.string().trim().max(200).nullish(),
              terms: z.string().trim().max(1500).nullish(),
              group: z.enum(["general", "inventory"]).nullish(),
              founderPick: z.boolean().nullish(),
            }),
          )
          .max(24)
          .nullish(),
        terms: z.string().trim().max(6000).nullish(),
        commission: z.number().min(0).max(10_000).nullish(),
        commissionPlan: z
          .object({
            bonusMonths: z.number().min(0).max(12),
            setupPct: z.number().min(0).max(100),
            oneTimePct: z.number().min(0).max(100),
            quotePct: z.number().min(0).max(100),
            residualPct: z.number().min(0).max(100),
            residualCapMonths: z.number().int().min(0).max(240),
            openerPct: z.number().min(0).max(100),
            openerDays: z.number().int().min(1).max(365),
            clawbackDays: z.number().int().min(0).max(365),
            ownerEarns: z.boolean(),
            teamPoolPct: z.number().min(0).max(100),
          })
          .partial()
          .nullish(),
        /** Calls per day the team aims for (home screen progress). */
        dailyCalls: z.number().int().min(0).max(200).nullish(),
        /** Months free for churches and nonprofits paying yearly. */
        churchAnnualMonthsFree: z.number().int().min(0).max(11).nullish(),
        /** Discount programs: founding-customer spots and the referral rules (0 turns a program off). */
        founderSlots: z.number().int().min(0).max(1000).nullish(),
        referralMonths: z.number().int().min(0).max(12).nullish(),
        referralMaxPerYear: z.number().int().min(0).max(24).nullish(),
        referralMinMonths: z.number().int().min(1).max(24).nullish(),
      }),
    );
    // A key the app leaves out keeps its value (an older app, or one without the field, can't wipe it); null clears it.
    const before = await getSettings(env);
    const stored = JSON.parse((await getSetting(env, "app_settings")) ?? "{}") as Record<string, unknown>;
    const s = mergeSettings(before, patch);
    await setSetting(env, "app_settings", JSON.stringify(mergeSettings(stored, patch)));
    // Call guides quote these, so saved guides are rewritten on next open.
    const sales = (x: Partial<typeof s>) =>
      JSON.stringify([
        x.companyName,
        x.legalName,
        x.callerName,
        x.minMonths,
        x.shortMonths,
        x.flexSetup,
        x.lateFee,
        x.payoffDiscount,
        x.interestRate,
        x.reinstatementFee,
        x.returnedPaymentFee,
        x.annualMonthsFree,
        x.addons,
        (x.plans ?? []).map((p) => [p.name, p.setup, p.monthly, p.includes]),
      ]);
    if (sales(before) !== sales(s))
      await env.DB.prepare(
        "UPDATE leads SET pitch_json = NULL WHERE pitch_json IS NOT NULL",
      ).run();
    return json({ ok: true });
  }

  // The Android app (android/), for any logged-in user to install. Uploaded to R2 by `npm run android:upload`.
  // The Android app checks this on start and in Settings; build.sh writes it next to the APK.
  if (path === "/android/version" && m === "GET") {
    const v = await env.BUCKET.get("_build/website-business.json");
    if (!v) throw new HttpError(404, "No Android build uploaded yet");
    const info = (await v.json()) as {
      versionCode: number;
      versionName: string;
      uploadedAt?: string;
    };
    return json({ ...info, url: `${url.origin}/api/android.apk` });
  }
  if (path === "/android.apk" && m === "GET") {
    const apk = await env.BUCKET.get("_build/website-business.apk");
    if (!apk)
      throw new HttpError(404, "The Android app hasn't been uploaded yet");
    // content-length lets the app show real progress (a streamed body is chunked otherwise and the phone sees no total).
    return new Response(apk.body, {
      headers: {
        "content-type": "application/vnd.android.package-archive",
        "content-length": String(apk.size),
        "content-disposition": 'attachment; filename="website-business.apk"',
        "cache-control": "no-store",
        "accept-ranges": "none",
      },
    });
  }

  // Settings → "Send me a test email": proves the email key and the sender domain work, to the owner's own address.
  if (path === "/mail/test" && m === "POST") {
    ownerOnly();
    const s = await getSettings(env);
    const to = s.directEmail || s.companyEmail;
    if (!s.companyEmail)
      throw new HttpError(
        400,
        "Add your business email in Settings first; emails are sent from it.",
      );
    if (!to)
      throw new HttpError(
        400,
        "Add a business or direct email in Settings first.",
      );
    if (!mailReady(env))
      throw new HttpError(
        400,
        "No email key is set. Add RESEND_API_KEY as a Worker secret.",
      );
    const r = await sendEmailDetailed(env, {
      from: s.companyEmail,
      fromName: s.companyName || "Underground Associates",
      to,
      replyTo: s.companyEmail,
      subject: "Test email from your app",
      text: `This is a test from the ${s.companyName || "Underground Associates"} app. If you're reading it, client emails (Buy extras links) will go out fine.\n\nSent as ${s.companyEmail}.`,
    });
    return json({
      ok: r.ok,
      provider: r.provider,
      to: maskEmail(to),
      error: r.error ?? null,
    });
  }

  // Everything in the database as one JSON file (the weekly cron writes the same to R2 _backup/).
  if (path === "/backup" && m === "GET") {
    ownerOnly();
    const data = await backupData(env);
    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="website-business-${data.day}.json"`,
        "cache-control": "no-store",
      },
    });
  }

  if (path === "/runs") ownerOnly();
  if (path === "/runs" && m === "POST") {
    const input = await body(
      req,
      z.object({
        categories: z.array(z.string()).min(1).max(SEARCH_GROUPS.length),
        cap: z.number().int().min(1).max(500),
        wider: z.boolean().default(false),
        badSites: z.boolean().default(false),
      }),
    );
    const groups = input.categories.map(groupById).filter((g) => !!g);
    if (!groups.length) throw new HttpError(400, "Pick at least one category");
    const jobs: Job[] = groups.flatMap((g) =>
      searchesFor(g, input.wider).map((p) => ({
        type: "search" as const,
        runId: "",
        category: g.category,
        query: p.query,
        center: p.center,
        radiusMeters: p.radiusMeters,
        badSites: input.badSites,
      })),
    );
    const id = newId();
    await env.DB.prepare(
      "INSERT INTO runs (id, created_at, categories, cap, searches_total, options_json) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        id,
        now(),
        groups.map((g) => g.id).join(","),
        input.cap,
        jobs.length,
        JSON.stringify({ wider: input.wider, badSites: input.badSites }),
      )
      .run();
    // Queues take at most 100 messages per batch; a big run (every category + nearby towns) is more than that.
    try {
      for (let i = 0; i < jobs.length; i += 100)
        await env.JOBS.sendBatch(
          jobs
            .slice(i, i + 100)
            .map((j) => ({ body: { ...j, runId: id } as Job })),
        );
    } catch (err) {
      await env.DB.prepare("DELETE FROM runs WHERE id = ?").bind(id).run();
      throw new HttpError(
        502,
        `Couldn't start the run: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await notify(env, {
      kind: "run",
      actor: session,
      text: `${session.name} started a search run: ${groups.map((g) => g.label).join(", ")} (up to ${input.cap} sites)`,
    });
    return json({ id });
  }

  const runDismiss = /^\/runs\/([a-z0-9]+)\/dismiss$/.exec(path);
  if (runDismiss && m === "POST") {
    ownerOnly();
    await env.DB.prepare("UPDATE runs SET status = 'dismissed' WHERE id = ?")
      .bind(runDismiss[1])
      .run();
    return json({ ok: true });
  }

  if (path === "/runs" && m === "GET") {
    const runs = await env.DB.prepare(
      "SELECT * FROM runs WHERE status != 'dismissed' ORDER BY created_at DESC LIMIT 10",
    ).all<RunRow>();
    const out = [];
    for (const r of runs.results) {
      const counts = await env.DB.prepare(
        "SELECT status, COUNT(*) AS n FROM leads WHERE run_id = ? GROUP BY status",
      )
        .bind(r.id)
        .all<{ status: string; n: number }>();
      const by = Object.fromEntries(counts.results.map((c) => [c.status, c.n]));
      const searching = r.searches_done < r.searches_total;
      const pending = (by.queued ?? 0) + (by.building ?? 0);
      const total = Object.values(by).reduce((a, b) => a + b, 0);
      let status = r.status;
      // A run that is still "searching" or "building" long after it started has lost its queue messages
      // (an enqueue that failed, a consumer crash). Mark it so the app stops showing a spinner forever;
      // one that found nothing is dropped outright.
      if (
        status === "running" &&
        (searching || pending > 0) &&
        now() - r.created_at > STALLED_RUN_MS
      ) {
        status = total === 0 ? "dismissed" : "stalled";
        await env.DB.prepare(
          "UPDATE runs SET status = ? WHERE id = ? AND status = 'running'",
        )
          .bind(status, r.id)
          .run();
        if (status === "dismissed") continue;
      }
      out.push({
        id: r.id,
        createdAt: r.created_at,
        categories: r.categories.split(","),
        options: r.options_json ? JSON.parse(r.options_json) : {},
        cap: r.cap,
        searchesDone: r.searches_done,
        searchesTotal: r.searches_total,
        counts: by,
        status,
        stalled: status === "stalled",
        done: status !== "running" || (!searching && pending === 0),
      });
    }
    return json({ runs: out });
  }

  // Time clock: anyone clocks themselves in and out; the owner / full access see everyone's week, fix punches and set pay.
  if (path === "/clock" && m === "GET") return json(await clockStatus(env, session.userId));
  if ((path === "/clock/in" || path === "/clock/out") && m === "POST") {
    const { note } = await body(req, z.object({ note: z.string().max(300).optional() }));
    const entry = await (path === "/clock/in" ? clockIn : clockOut)(env, session, note ?? "");
    return json({ entry, status: await clockStatus(env, session.userId) });
  }
  if (path === "/clock/team" && m === "GET") {
    ownerOnly();
    const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("week") ?? "") ? url.searchParams.get("week")! : chicagoDay(now());
    return json(await teamWeek(env, from));
  }
  if (path === "/clock/team.csv" && m === "GET") {
    ownerOnly();
    const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("week") ?? "") ? url.searchParams.get("week")! : chicagoDay(now());
    const w = await teamWeek(env, from);
    return new Response(timesheetCsv(w), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="timesheet-${w.from}.csv"` },
    });
  }
  if (path === "/clock/entries" && m === "POST") {
    ownerOnly();
    const i = await body(req, EntryInput.extend({ userId: z.string().max(40) }));
    return json({ entry: await addEntry(env, i.userId, i, session.name) });
  }
  const clockEntry = /^\/clock\/entries\/([a-z0-9]+)$/.exec(path);
  if (clockEntry && m === "PUT") {
    ownerOnly();
    return json({ entry: await editEntry(env, clockEntry[1]!, await body(req, EntryInput), session.name) });
  }
  if (clockEntry && m === "DELETE") {
    ownerOnly();
    await deleteEntry(env, clockEntry[1]!);
    return json({ ok: true });
  }
  const clockPay = /^\/clock\/pay\/([a-z0-9]+)$/.exec(path);
  if (clockPay && m === "PUT") {
    ownerOnly();
    const { hourlyCents } = await body(req, z.object({ hourlyCents: z.number().int().min(0).max(100_000).nullable() }));
    await setHourly(env, clockPay[1]!, hourlyCents);
    return json({ ok: true });
  }

  if (path === "/callers" || path.startsWith("/callers/")) ownerOnly();
  if (path === "/callers" && m === "GET")
    return json({ callers: await listCallers(env) });
  if (path === "/callers" && m === "POST") {
    const input = await body(
      req,
      z.object({
        name: CALLER_NAME,
        password: z.string().max(200).optional(),
        admin: z.boolean().optional(),
        email: z.string().trim().toLowerCase().email().max(120).optional(),
      }),
    );
    return json({
      id: await addCaller(
        env,
        input.name,
        input.password || null,
        input.admin,
        input.email,
      ),
    });
  }
  const callerMatch = /^\/callers\/([a-z0-9]+)$/.exec(path);
  if (callerMatch && m === "PUT") {
    const change = await body(
      req,
      z.object({
        name: CALLER_NAME.optional(),
        password: z.string().max(200).optional(),
        disabled: z.boolean().optional(),
        admin: z.boolean().optional(),
        email: z
          .string()
          .trim()
          .toLowerCase()
          .email()
          .max(120)
          .nullable()
          .optional(),
      }),
    );
    if (change.admin === false && callerMatch[1] === session.userId)
      throw new HttpError(400, "You can't take away your own full access");
    await updateCaller(env, callerMatch[1]!, change);
    return json({ ok: true });
  }
  if (callerMatch && m === "DELETE") {
    await removeCaller(env, callerMatch[1]!);
    return json({ ok: true });
  }

  // A signed agreement, opened from the app (any team member who can see the lead).
  const agreement = /^\/agreements\/([sp])\/([a-z0-9]+)(\.pdf)?$/.exec(path);
  if (agreement && m === "GET")
    return (agreement[3] ? agreementPdf : agreementPage)(env, "", {
      kind: agreement[1] as "s" | "p",
      id: agreement[2]!,
    });

  if (path === "/sales" && m === "GET") {
    ownerOnly();
    return json({
      ...(await salesDashboard(env)),
      websiteOrders: await websiteOrders(env),
    });
  }

  // Look up one business by name to add it by hand (owner and callers; one Google request per search).
  if (path === "/places/search" && m === "GET") {
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (q.length < 3) throw new HttpError(400, "Type at least 3 letters");
    const places = await searchText(env.GOOGLE_PLACES_API_KEY, {
      textQuery: /\b(al|alabama)\b/i.test(q) ? q : `${q} near ${MARKET.name}`,
      center: MARKET.center,
      radiusMeters: MARKET.radiusMeters,
      maxPages: 1,
    });
    await addUsage(env, { places: 1 });
    const results = [];
    for (const p of places.slice(0, 10)) {
      const existing = await env.DB.prepare(
        "SELECT id, status, sales_status, name FROM leads WHERE place_id = ?",
      )
        .bind(p.id)
        .first<{
          id: string;
          status: string;
          sales_status: string;
          name: string | null;
        }>();
      results.push({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        type: p.primaryTypeDisplayName?.text ?? null,
        address: p.formattedAddress ?? "",
        phone: p.nationalPhoneNumber ?? null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        website: p.websiteUri ?? null,
        presence: webPresence(p.websiteUri) as string,
        foundUrl: null as string | null,
        open: p.businessStatus === "OPERATIONAL",
        chain: isChain(p.displayName?.text ?? ""),
        category: guessCategory(p),
        existing:
          existing && existing.status !== "expired"
            ? {
                id: existing.id,
                status: existing.status,
                salesStatus: existing.sales_status,
              }
            : null,
      });
    }
    // Before Fox adds one: the same web search the run does, for the first few "no website" results (one at a time,
    // Brave's free plan allows one request a second), so the list already says "Page on …" or "Has a website at …".
    if (env.BRAVE_SEARCH_API_KEY) {
      let checks = 0;
      for (const r of results) {
        if (checks >= 4) break;
        if (
          !r.open ||
          r.existing ||
          (r.presence !== "none" && r.presence !== "social")
        )
          continue;
        checks++;
        const place = places.find((p) => p.id === r.placeId);
        const found = place
          ? await resolvePresence(env.BRAVE_SEARCH_API_KEY, place)
          : null;
        if (found) {
          r.presence = found.presence;
          r.foundUrl = found.url;
          r.website = r.website ?? found.url;
        }
      }
    }
    return json({ results });
  }
  if (path === "/leads/add" && m === "POST") {
    const input = await body(
      req,
      z.object({
        placeId: z.string().min(5).max(300),
        category: z.enum([
          "restaurant",
          "contractor",
          "salon",
          "auto",
          "landscaping",
          "cleaning",
          "print",
          "retail",
          "finance",
          "church",
          "general",
        ]),
        phone: z.string().trim().max(30).optional(),
      }),
    );
    const existing = await env.DB.prepare(
      "SELECT id, status FROM leads WHERE place_id = ?",
    )
      .bind(input.placeId)
      .first<{ id: string; status: string }>();
    if (existing && existing.status !== "expired")
      return json({ id: existing.id, existed: true });
    const p = await getPlace(
      env.GOOGLE_PLACES_API_KEY,
      input.placeId,
      input.category === "restaurant" ? RESTAURANT_FLAGS : [],
    );
    await addUsage(env, { places: 1 });
    // Google sometimes has no number (e.g. a BBQ stand on Facebook only). The team can type it in from their sign,
    // Facebook or the owner; the owner still confirms the phone before anything is published.
    let typedPhone = false;
    if (!p.nationalPhoneNumber) {
      const typed = normalizeUsPhone(input.phone ?? "");
      if (!typed)
        throw new HttpError(
          400,
          input.phone
            ? "That doesn't look like a 10-digit US phone number."
            : "Google has no phone number for this business. Type it in (from their sign, Facebook or the owner) to add it.",
        );
      p.nationalPhoneNumber = typed.display;
      typedPhone = true;
    }
    let presence = webPresence(p.websiteUri) as WebPresence;
    const count = p.userRatingCount ?? 0;
    let label: string = PRESENCE_LABEL[presence];
    let foundUrl: string | null = null;
    // Google shows no website: one web search may still find their page (own domain or a parent company's site).
    if (presence === "none" || presence === "social") {
      const found = await resolvePresence(env.BRAVE_SEARCH_API_KEY, p);
      if (found) ({ presence, label, url: foundUrl } = found);
    }
    const reason = `${label} · ${count} Google reviews · added by ${session.name}`;
    const fields = [
      p.displayName?.text ?? "",
      p.nationalPhoneNumber,
      p.formattedAddress ?? "",
      p.rating ?? null,
      p.userRatingCount ?? null,
      presence,
      reason,
      scorePlace(p, presence),
      JSON.stringify(p),
      p.location?.latitude ?? null,
      p.location?.longitude ?? null,
      now(),
      now(),
    ];
    let id = existing?.id;
    if (id) {
      // An expired lead (old Google data was cleared): bring it back with fresh data.
      await env.DB.prepare(
        "UPDATE leads SET category = ?, name = ?, phone = ?, address = ?, rating = ?, review_count = ?, presence = ?, reason = ?, score = ?, place_json = ?, lat = ?, lng = ?, fetched_at = ?, updated_at = ?, found_url = ?, status = 'queued', sales_status = 'new', record_json = NULL, copy_json = NULL, lint_json = NULL, pitch_json = NULL, look = NULL, created_at = ? WHERE id = ?",
      )
        .bind(input.category, ...fields, foundUrl, now(), id)
        .run();
    } else {
      id = newId();
      await env.DB.prepare(
        `INSERT INTO leads (id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, score, status, place_json, lat, lng, fetched_at, created_at, updated_at, found_url)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, p.id, input.category, ...fields, now(), foundUrl)
        .run();
    }
    await env.DB.prepare(
      "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
    )
      .bind(
        newId(),
        id,
        session.name,
        typedPhone
          ? `Added by hand from a Google search. Google has no phone number for them, so ${p.nationalPhoneNumber} was typed in: double-check it, and suggest adding it to their Google listing.`
          : "Added by hand from a Google search",
        now(),
      )
      .run();
    await env.JOBS.send({ type: "build", leadId: id });
    await notify(env, {
      kind: "added",
      actor: session,
      leadId: id,
      text: `${session.name} added ${p.displayName?.text ?? "a business"} by hand`,
    });
    return json({ id, existed: false });
  }

  // A business that isn't on Google Maps (VIP Rents): built from what the team types in (owner and callers).
  if (path === "/leads/manual" && m === "POST") {
    const input = await body(
      req,
      z.object({
        name: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(7).max(30),
        town: z.string().trim().min(2).max(60),
        street: z.string().trim().max(120).optional(),
        zip: z.string().trim().max(10).optional(),
        category: z.enum(CATEGORY_IDS),
        kind: z.string().trim().max(60).optional(),
        web: z.string().trim().max(300).optional(),
        comesToCustomers: z.boolean().optional(),
      }),
    );
    const phone = normalizeUsPhone(input.phone);
    if (!phone)
      throw new HttpError(400, "That doesn't look like a 10-digit US phone number.");
    if (input.web && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(input.web))
      throw new HttpError(400, "The web page should start with https:// (or leave it blank).");
    // Same phone already in the app (from a run or an earlier hand-add): open that one instead of making a twin.
    const digits = phone.e164.replace(/\D/g, "").slice(-10);
    const dupe = await env.DB.prepare(
      "SELECT id FROM leads WHERE status != 'expired' AND replace(replace(replace(replace(replace(phone, '(', ''), ')', ''), '-', ''), ' ', ''), '+1', '') = ? LIMIT 1",
    )
      .bind(digits)
      .first<{ id: string }>();
    if (dupe) return json({ id: dupe.id, existed: true });
    const id = newId();
    const p = manualPlace(id, input);
    let presence = webPresence(p.websiteUri) as WebPresence;
    let label: string = PRESENCE_LABEL[presence];
    let foundUrl: string | null = null;
    if (presence === "none" || presence === "social") {
      const found = await resolvePresence(env.BRAVE_SEARCH_API_KEY, p);
      if (found) ({ presence, label, url: foundUrl } = found);
    }
    const reason = `Not on Google Maps · ${label} · added by ${session.name}`;
    await env.DB.prepare(
      `INSERT INTO leads (id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, score, status, place_json, lat, lng, fetched_at, created_at, updated_at, found_url)
       VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        p.id,
        input.category,
        p.displayName?.text ?? input.name,
        p.nationalPhoneNumber,
        p.formattedAddress ?? "",
        presence,
        reason,
        scorePlace(p, presence),
        JSON.stringify(p),
        p.location?.latitude ?? null,
        p.location?.longitude ?? null,
        now(),
        now(),
        now(),
        foundUrl,
      )
      .run();
    await env.DB.prepare(
      "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
    )
      .bind(
        newId(),
        id,
        session.name,
        "Added by hand: not on Google Maps, so everything came from what was typed in. Double-check the details with the owner, and offer to set up their Google Business Profile.",
        now(),
      )
      .run();
    await env.JOBS.send({ type: "build", leadId: id });
    await notify(env, {
      kind: "added",
      actor: session,
      leadId: id,
      text: `${session.name} added ${input.name} by hand (not on Google Maps)`,
    });
    return json({ id, existed: false });
  }

  if (path === "/leads" && m === "GET") {
    const where: string[] = ["status != 'expired'"];
    const binds: unknown[] = [];
    const sales = url.searchParams.get("sales");
    const category = url.searchParams.get("category");
    const callbacks = url.searchParams.get("callbacks");
    let order = "score DESC";
    let cols = "";
    if (url.searchParams.get("activity")) {
      // Leads somebody has worked: a call or note logged (not just "Added by hand"), a task, a sign-up, a typed-in contact or
      // callback, or a prospect who opened their preview. Newest activity first, with the latest note on the card.
      const worked =
        "lead_notes n WHERE n.lead_id = leads.id AND n.body NOT LIKE 'Added by hand%'";
      where.push(
        `(EXISTS (SELECT 1 FROM ${worked}) OR EXISTS (SELECT 1 FROM tasks t WHERE t.lead_id = leads.id) OR EXISTS (SELECT 1 FROM signups s WHERE s.lead_id = leads.id) OR contact IS NOT NULL OR follow_up IS NOT NULL OR preview_opens > 0)`,
      );
      cols = `, (SELECT json_object('outcome', n.outcome, 'author', n.author, 'body', n.body, 'at', n.created_at) FROM ${worked} ORDER BY n.created_at DESC LIMIT 1) AS last_note_json, (SELECT COUNT(*) FROM ${worked}) AS note_count, MAX(COALESCE((SELECT MAX(n.created_at) FROM ${worked}), 0), COALESCE(last_contact, 0), COALESCE(preview_opened_at, 0), COALESCE((SELECT MAX(t.updated_at) FROM tasks t WHERE t.lead_id = leads.id), 0), COALESCE((SELECT MAX(s.created_at) FROM signups s WHERE s.lead_id = leads.id), 0)) AS last_activity`;
      order = "last_activity DESC";
    } else if (url.searchParams.get("opened") === "recent") {
      // Prospects who opened their preview in the last 7 days and haven't bought yet: call them now.
      where.push("preview_opened_at >= ?", "sales_status IN ('new', 'shown')");
      binds.push(now() - 7 * 86_400_000);
      order = "preview_opened_at DESC";
    } else if (callbacks) {
      // "due": today or overdue; "all": every scheduled callback. Closed leads drop off.
      where.push("follow_up IS NOT NULL", "sales_status IN ('new', 'shown')");
      if (callbacks === "due") {
        where.push("follow_up <= ?");
        binds.push(localDate());
      }
      order = "follow_up ASC, score DESC";
    } else if (sales) {
      where.push("sales_status = ?");
      binds.push(sales);
    }
    if (category) {
      where.push("category = ?");
      binds.push(category);
    }
    const rows = await env.DB.prepare(
      `SELECT ${LIST_COLS}, (SELECT s.paid FROM signups s WHERE s.lead_id = leads.id ORDER BY s.created_at DESC LIMIT 1) AS latest_signup_paid${cols} FROM leads WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 500`,
    )
      .bind(...binds)
      .all<
        LeadRow & {
          latest_signup_paid: number | null;
          has_pitch: number | null;
        } & ActivityCols
      >();
    return json({ leads: rows.results.map(summary) });
  }

  // Actions are letters, optionally ".pdf" (flyer.pdf, reviewcard.pdf, tents.pdf, window.pdf for the Android app).
  const leadMatch =
    /^\/leads\/([a-z0-9]+)(\/[a-z]+(?:\.pdf)?)?(?:\/([a-z0-9]+))?$/.exec(path);
  if (leadMatch) {
    const id = leadMatch[1]!;
    const action = leadMatch[2] ?? "";
    const sub = leadMatch[3];
    const lead: LeadRow = await requireLead(env, id);
    // Callers work leads end to end (edits, publish, payments, links). Only destructive, money-out or training-reset
    // actions stay with the owner / full access; settings, team, runs, sales, inbox and costs are gated elsewhere.
    const ownerOnlyAction =
      (action === "" && m === "DELETE") ||
      action === "/practice" ||
      (action === "/clientlink" && m === "DELETE");
    if (ownerOnlyAction) ownerOnly();

    if (action === "" && m === "GET") {
      const signups = await signupsFor(env, id);
      return json({
        ...detail(
          {
            ...lead,
            latest_signup_paid: signups[0] ? (signups[0].paid ? 1 : 0) : null,
          },
          { sold: await soldDesigns(env, lead.category, id) },
        ),
        notes: await notesFor(env, id),
        // Callers take payments too, so they see what is owed; only the signer's email stays with the owner.
        signups: isOwner
          ? signups
          : signups.map(({ signerEmail: _e, ...rest }) => rest),
        purchases: await purchasesFor(env, id),
        referral: await referralSummary(env, lead),
      });
    }
    // Referral program: who sent this lead (a Sold / Live client), set or cleared by anyone on the team.
    if (action === "/referrer" && m === "PUT") {
      const { leadId } = await body(
        req,
        z.object({ leadId: z.string().regex(/^[a-z0-9]+$/).nullable() }),
      );
      const out = await setReferrer(env, lead, leadId, session.name);
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: out.referredBy
          ? `${session.name} noted ${lead.name} was referred by ${out.referredBy.name}`
          : `${session.name} cleared who referred ${lead.name}`,
      });
      return json(out);
    }
    // Who to ask for and when to catch them (callers too).
    if (action === "/contact" && m === "PUT") {
      const input = await body(
        req,
        z.object({
          contact: z.string().trim().max(80).optional(),
          bestTime: z.string().trim().max(120).optional(),
        }),
      );
      const fields: Partial<LeadRow> = {};
      if (input.contact !== undefined) fields.contact = input.contact || null;
      if (input.bestTime !== undefined)
        fields.best_time = input.bestTime || null;
      if (Object.keys(fields).length) {
        await updateLead(env, id, fields);
        const what = [
          fields.contact ? `Ask for: ${fields.contact}` : null,
          fields.best_time ? `best time: ${fields.best_time}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        await notify(env, {
          kind: "status",
          actor: session,
          leadId: id,
          text: what
            ? `${session.name} noted ${lead.name}'s contact (${what})`
            : `${session.name} cleared ${lead.name}'s contact note`,
        });
      }
      return json(summary((await getLead(env, id))!));
    }
    // The client's Stripe billing portal (update card, see invoices), opened from the client screen.
    if (action === "/portal" && m === "GET") {
      const row = await env.DB.prepare(
        "SELECT stripe_customer FROM signups WHERE lead_id = ? AND stripe_customer IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      )
        .bind(id)
        .first<{ stripe_customer: string }>();
      if (!row?.stripe_customer)
        throw new HttpError(409, "No Stripe customer yet");
      const portal = await portalSession(
        env,
        row.stripe_customer,
        `${url.origin}/#/lead/${id}`,
      );
      if (!portal)
        throw new HttpError(
          409,
          "Online checkout isn't set up (STRIPE_SECRET_KEY)",
        );
      return Response.redirect(portal, 303);
    }
    if (action === "/extraslink" && (m === "POST" || m === "GET")) {
      if (!["sold", "live"].includes(lead.sales_status))
        throw new HttpError(
          409,
          "Extras links are for clients who've signed up",
        );
      const token = await extrasToken(env, id);
      // GET (opened while logged in) goes straight to the client's Buy extras page.
      if (m === "GET")
        return Response.redirect(`${url.origin}/x/${token}`, 302);
      return json({ url: `${url.origin}/x/${token}`, expiresInDays: 30 });
    }
    // In-app sign-up: the client signs on the owner's (or a caller's) phone with the native signature pad.
    if (action === "/signups" && m === "POST") {
      const input = await body(
        req,
        z.object({
          plan: z.enum(["basic", "plus", "pro", "list"]),
          billing: z.string().trim().max(20),
          picks: z
            .array(
              z.object({
                index: z.number().int().min(0).max(50),
                qty: z.number().int().min(1).max(20).default(1),
              }),
            )
            .max(30)
            .default([]),
          business: z.string().trim().max(120).optional(),
          name: z.string().trim().max(100),
          title: z.string().trim().max(60).optional(),
          email: z.string().trim().max(120),
          signature: z.string().max(300_000),
          consent: z.boolean(),
          founder: z.number().int().min(0).max(999).nullable().optional(),
        }),
      );
      const settings = await getSettings(env);
      const ready = await tapStatus(env, settings);
      return json(
        await appSignup(env, req, {
          lead,
          origin: url.origin,
          input,
          sentBy: session.name,
          tapReady: ready.ready,
          cardReady: await cardReady(env, settings),
        }),
      );
    }
    if (action === "/signup" && m === "POST") {
      const { plan } = await body(
        req,
        z.object({ plan: z.enum(["basic", "plus", "pro", "list"]) }),
      );
      const settings = await getSettings(env);
      const p = settings.plans.find((x) => x.id === plan);
      if (!p) throw new HttpError(400, "Set up your plans in Settings first");
      if (lead.status !== "ready")
        throw new HttpError(409, "The preview isn't ready yet");
      const token = await signupToken(env, id, plan);
      await env.DB.prepare(
        "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, 'signup_sent', ?, ?)",
      )
        .bind(newId(), id, session.name, `Sign-up link for ${p.name}`, now())
        .run();
      await notify(env, {
        kind: "signup_sent",
        actor: session,
        leadId: id,
        text: `${session.name} sent ${lead.name} a ${p.name} sign-up link`,
      });
      return json({
        url: `${url.origin}/a/${token}`,
        plan: p.name,
        expiresInDays: 30,
      });
    }
    // In-person card payment for a signed sign-up (owner, Android app): returns the intent:// link that opens the Tap to Pay screen.
    if (action === "/tap" && m === "POST") {
      const { signupId } = await body(
        req,
        z.object({ signupId: z.string().regex(/^[a-z0-9]+$/) }),
      );
      return json(
        await startTap(env, {
          signupId,
          leadId: id,
          origin: url.origin,
          session,
        }),
      );
    }
    if (action === "/paid" && m === "POST") {
      const { signupId, paid } = await body(
        req,
        z.object({
          signupId: z.string().regex(/^[a-z0-9]+$/),
          paid: z.boolean(),
        }),
      );
      await env.DB.prepare(
        "UPDATE signups SET paid = ? WHERE id = ? AND lead_id = ?",
      )
        .bind(paid ? 1 : 0, signupId, id)
        .run();
      if (paid)
        await onPlanPaid(env, id, signupId).catch((err) =>
          console.error("referral credit", err),
        );
      await notify(env, {
        kind: "paid",
        actor: session,
        leadId: id,
        text: paid
          ? `${session.name} marked ${lead.name}'s payment as set up 💵`
          : `${session.name} marked ${lead.name} as not paid`,
      });
      return json({ ok: true });
    }
    // Leaving a flyer counts as showing them (keeps the preview around longer): the app POSTs first, then opens the GET,
    // which only renders the printable.
    if (action === "/flyer" && m === "POST") {
      if (lead.status !== "ready")
        throw new HttpError(409, "The preview isn't ready yet");
      if (lead.sales_status === "new") {
        await updateLead(env, id, markShown(lead));
        await notify(env, {
          kind: "status",
          actor: session,
          leadId: id,
          text: `${session.name} left ${lead.name} a preview flyer (marked Shown)`,
        });
      }
      return json(summary((await getLead(env, id))!));
    }
    if (action === "/flyer.pdf" && m === "GET") {
      if (lead.status !== "ready")
        throw new HttpError(409, "The preview isn't ready yet");
      const days = 60;
      const token = await shareToken(env, id, days);
      const settings = await getSettings(env);
      return pdfResponse(
        previewFlyerPdf({
          business: lead.name ?? "your business",
          previewUrl: `${url.origin}/s/${token}/`,
          company: settings.companyName,
          phone: settings.companyPhone,
          caller: isOwner ? settings.callerName : session.name,
          days,
        }),
        `flyer-${id}.pdf`,
      );
    }
    if (action === "/flyer" && m === "GET") {
      if (lead.status !== "ready")
        throw new HttpError(409, "The preview isn't ready yet");
      const days = 60;
      const token = await shareToken(env, id, days);
      const settings = await getSettings(env);
      return previewFlyer({
        business: lead.name ?? "your business",
        previewUrl: `${url.origin}/s/${token}/`,
        company: settings.companyName,
        phone: settings.companyPhone,
        caller: isOwner ? settings.callerName : session.name,
        days,
      });
    }
    if (action === "/gbp") {
      if (!lead.record_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const state = gbpState(lead);
      const save = (s: GbpState) =>
        updateLead(env, id, { gbp_json: JSON.stringify(s) });
      const settings = await getSettings(env);
      const ai = () => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const website = lead.custom_domain && lead.domain_active
        ? `https://${lead.custom_domain}`
        : (lead.live_url ?? undefined);
      if (m === "GET" && !sub)
        return json({
          ...state,
          website,
          mapsUrl: record.mapsUrl,
          gbpEmail: settings.gbpEmail ?? null,
        });
      if (m === "PUT" && !sub) {
        const input = await body(
          req,
          z.object({
            check: z
              .string()
              .regex(/^[a-z_]+$/)
              .optional(),
            done: z.boolean().optional(),
            postId: z
              .string()
              .regex(/^[a-z0-9]+$/)
              .optional(),
            posted: z.boolean().optional(),
            removePost: z.boolean().optional(),
            notes: z.string().max(1000).optional(),
          }),
        );
        if (input.check) state.checks[input.check] = !!input.done;
        if (input.postId) {
          // Google posts and social posts share the post controls; ids are unique across both.
          if (input.removePost) {
            state.posts = state.posts.filter((p) => p.id !== input.postId);
            state.social = (state.social ?? []).filter(
              (p) => p.id !== input.postId,
            );
          } else
            for (const p of [...state.posts, ...(state.social ?? [])])
              if (p.id === input.postId)
                p.status = input.posted ? "posted" : "draft";
        }
        if (input.notes !== undefined) state.notes = input.notes;
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "kit") {
        const { kit, usage } = await writeProfileKit(ai(), {
          record,
          pack: packFor(record.category),
          website,
          model: settings.copyModel,
        });
        await chargeAi(env, settings.copyModel, usage);
        state.kit = {
          ...kit,
          createdAt: now(),
          problems: profileTextProblems(kit.description, 750),
        };
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "posts") {
        const { count, notes } = await body(
          req,
          z.object({
            count: z.number().int().min(1).max(4).default(2),
            notes: z.string().trim().max(1000).optional(),
          }),
        );
        const month = new Date().toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          month: "long",
          year: "numeric",
        });
        const { posts, usage } = await writeMonthlyPosts(ai(), {
          record,
          pack: packFor(record.category),
          month,
          count,
          recentTopics: state.posts.slice(-8).map((p) => p.topic),
          ownerNotes: notes ?? state.notes,
          model: settings.copyModel,
        });
        await chargeAi(env, settings.copyModel, usage);
        if (notes !== undefined) state.notes = notes;
        state.posts.push(
          ...posts.map((p) => ({
            ...p,
            id: newId(),
            month,
            status: "draft" as const,
            createdAt: now(),
            problems: profileTextProblems(p.text, 1500),
          })),
        );
        state.posts = state.posts.slice(-30);
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "social") {
        const { count, notes } = await body(
          req,
          z.object({
            count: z.number().int().min(1).max(12).default(8),
            notes: z.string().trim().max(1000).optional(),
          }),
        );
        const month = new Date().toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          month: "long",
          year: "numeric",
        });
        const social = state.social ?? [];
        const { posts, usage } = await writeSocialPosts(ai(), {
          record,
          pack: packFor(record.category),
          month,
          count,
          recentTopics: social.slice(-12).map((p) => p.topic),
          ownerNotes: notes ?? state.notes,
          website,
          model: settings.copyModel,
        });
        await chargeAi(env, settings.copyModel, usage);
        if (notes !== undefined) state.notes = notes;
        state.social = [
          ...social,
          ...posts.map((p) => ({
            ...p,
            id: newId(),
            month,
            status: "draft" as const,
            createdAt: now(),
            problems: socialTextProblems(p.text),
          })),
        ].slice(-40);
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "reply") {
        const input = await body(
          req,
          z.object({
            review: z.string().trim().min(1).max(4000),
            stars: z.number().int().min(1).max(5),
            reviewer: z.string().trim().max(80).optional(),
          }),
        );
        const { reply, usage } = await writeReviewReply(ai(), {
          record,
          ...input,
          model: settings.copyModel,
        });
        await chargeAi(env, settings.copyModel, usage);
        return json({ reply, problems: profileTextProblems(reply, 4000) });
      }
    }
    if (action === "/reviewcard.pdf" && m === "GET") {
      if (isManualPlaceId(lead.place_id))
        throw new HttpError(409, NOT_ON_GOOGLE);
      if (
        lead.category === "finance" &&
        lead.record_json &&
        (JSON.parse(lead.record_json) as BusinessRecord).variant ===
          "financial_advisor"
      )
        throw new HttpError(409, "Financial advisors can't use review cards");
      return pdfResponse(
        reviewCardsPdf(lead.name ?? "us", lead.place_id),
        `review-cards-${id}.pdf`,
      );
    }
    if ((action === "/tents.pdf" || action === "/window.pdf") && m === "GET") {
      if (isManualPlaceId(lead.place_id))
        throw new HttpError(409, NOT_ON_GOOGLE);
      const siteUrl = lead.custom_domain && lead.domain_active
        ? `https://${lead.custom_domain}/`
        : lead.live_url;
      if (!siteUrl)
        throw new HttpError(
          409,
          "Publish the site first: the QR codes point to the live website",
        );
      const record = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      const menu = !!record?.ext.restaurant?.menu;
      const o = {
        business: lead.name ?? "Us",
        siteUrl: menu ? `${siteUrl.replace(/\/$/, "")}/menu/` : siteUrl,
        menu,
        placeId: lead.place_id,
        phone: record?.phone.display,
      };
      return pdfResponse(
        action === "/tents.pdf" ? tableTentsPdf(o) : windowSignPdf(o),
        `${action === "/tents.pdf" ? "table-tents" : "window-sign"}-${id}.pdf`,
      );
    }
    if (action === "/pricetags.pdf" && m === "GET") {
      const siteUrl = lead.custom_domain && lead.domain_active
        ? `https://${lead.custom_domain}/`
        : lead.live_url;
      if (!siteUrl)
        throw new HttpError(
          409,
          "Publish the site first: the QR codes point to the live price list",
        );
      const record = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      const pl = record?.ext.retail?.priceList;
      if (!pl?.sections.length)
        throw new HttpError(
          409,
          "Add a price list first (Edit → Shop details → Price list)",
        );
      return pdfResponse(
        priceTagsPdf({
          business: lead.name ?? "Us",
          siteUrl,
          title: pl.title?.trim() || kindWords(record!).title,
          sections: pl.sections.map((x) => ({
            name: x.name,
            slug: sectionSlug(x.name),
          })),
        }),
        `price-tags-${id}.pdf`,
      );
    }
    if (action === "/reviewcard" && m === "GET") {
      if (isManualPlaceId(lead.place_id))
        throw new HttpError(409, NOT_ON_GOOGLE);
      if (
        lead.category === "finance" &&
        lead.record_json &&
        (JSON.parse(lead.record_json) as BusinessRecord).variant ===
          "financial_advisor"
      )
        throw new HttpError(409, "Financial advisors can't use review cards");
      return reviewCards(lead.name ?? "us", lead.place_id);
    }
    if ((action === "/tents" || action === "/window") && m === "GET") {
      if (isManualPlaceId(lead.place_id))
        throw new HttpError(409, NOT_ON_GOOGLE);
      const siteUrl = lead.custom_domain && lead.domain_active
        ? `https://${lead.custom_domain}/`
        : lead.live_url;
      if (!siteUrl)
        throw new HttpError(
          409,
          "Publish the site first: the QR codes point to the live website",
        );
      const record = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      const menu = !!record?.ext.restaurant?.menu;
      const o = {
        business: lead.name ?? "Us",
        siteUrl: menu ? `${siteUrl.replace(/\/$/, "")}/menu/` : siteUrl,
        menu,
        placeId: lead.place_id,
        phone: record?.phone.display,
      };
      return action === "/tents" ? tableTents(o) : windowSign(o);
    }
    if (action === "/stats" && m === "GET")
      return json(await siteReport(env, id));
    // Name ideas for their domain with whether each is free (public RDAP), and where to buy it (our Cloudflare).
    if (action === "/domain" && sub === "suggest" && m === "GET") {
      const q = url.searchParams.get("q");
      const record = lead.record_json ? (JSON.parse(lead.record_json) as BusinessRecord) : null;
      // A typed full name ("reyespizza.com") is checked first, then ideas from its words; plain words give ideas only.
      const typed = q ? bareDomain(q) : "";
      const names = q
        ? [...(DOMAIN_RE.test(typed) ? [typed] : []), ...suggestDomains(typed.replace(/\.[a-z.]+$/, "").replace(/[-.]/g, " "))]
        : suggestDomains(record?.name ?? lead.name ?? "", record?.address.city);
      const list = [...new Set(names)].slice(0, 6);
      const avail = await Promise.all(list.map((d) => domainAvailable(d)));
      return json({ suggestions: list.map((domain, i) => ({ domain, available: avail[i] })), buyUrl: buyUrl(env.CF_ACCOUNT_ID) });
    }
    // "I bought it": hook it up now instead of waiting for the 5-minute check.
    if (action === "/domain" && sub === "check" && m === "POST") {
      if (lead.custom_domain && lead.pages_project) {
        const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
        const w = await wireDomain(auth, lead.pages_project, lead.custom_domain);
        if (w.stage === "working") await domainWorking(env, lead);
        return json({ ...(await domainStatus(env, (await getLead(env, id))!)), records: w.records });
      }
      return json(await domainStatus(env, lead));
    }
    if (action === "/domain") {
      if (m === "GET") return json(await domainStatus(env, lead));
      if (m === "PUT") {
        const { domain } = await body(req, z.object({ domain: DOMAIN_NAME }));
        return json(await setLeadDomain(env, lead, domain, url.origin));
      }
      if (m === "DELETE") return json({ ok: true, ...(await setLeadDomain(env, lead, null, url.origin)) });
    }
    if (action === "/log" && m === "POST") {
      const input = await body(
        req,
        z.object({
          outcome: z.enum(OUTCOMES),
          note: z.string().trim().max(2000).default(""),
          followUp: DATE.nullable().optional(),
        }),
      );
      if (input.outcome === "note" && !input.note)
        throw new HttpError(400, "Write a note first");
      if (input.outcome === "callback" && !input.followUp)
        throw new HttpError(400, "Pick a day to call back");
      // Left a flyer: its code went out, so the preview is kept for it.
      if (input.outcome === "flyer") await markHandedOut(env, lead.id);
      if (input.followUp && input.followUp < localDate())
        throw new HttpError(400, "Pick today or a later day");
      const fields: Partial<LeadRow> = {};
      let nextStep: ReturnType<typeof nextCadenceStep> = null;
      if (input.outcome !== "note") fields.last_contact = now();
      const status =
        OUTCOME_STATUS[input.outcome] ??
        (input.outcome === "callback" && lead.sales_status === "new"
          ? "shown"
          : undefined);
      if (status && lead.sales_status !== "live") fields.sales_status = status;
      const becomesShown =
        fields.sales_status === "shown" && lead.sales_status !== "shown";
      if (becomesShown) fields.shown_at = now();
      if (input.followUp !== undefined) fields.follow_up = input.followUp;
      else if (becomesShown) Object.assign(fields, autoCallback(lead));
      else if (
        (input.outcome === "no_answer" ||
          input.outcome === "reached" ||
          input.outcome === "visited" ||
          input.outcome === "not_in") &&
        lead.sales_status === "shown"
      ) {
        // Already shown: the next step on the cadence (day 5 text, day 10 walk-in, day 21 last text), dated from the day shown.
        const days = daysSinceShown(lead);
        nextStep = nextCadenceStep(days);
        if (nextStep)
          fields.follow_up = localDate(Math.max(1, nextStep.day - days));
      } else if (input.outcome === "no_answer" || input.outcome === "not_in")
        fields.follow_up = localDate(1);
      else if (input.outcome === "sold" || input.outcome === "not_interested")
        fields.follow_up = null;
      await env.DB.prepare(
        "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(
          newId(),
          id,
          session.name,
          input.outcome === "note" ? null : input.outcome,
          input.note,
          now(),
        )
        .run();
      if (Object.keys(fields).length) await updateLead(env, id, fields);
      const what = {
        note: `added a note on ${lead.name}`,
        no_answer: `called ${lead.name}: no answer`,
        reached: `reached ${lead.name}`,
        not_in: `stopped by ${lead.name}: the owner wasn't in`,
        visited: `talked to ${lead.name} in person`,
        flyer: `left a flyer at ${lead.name}`,
        link_sent: `sent ${lead.name} their preview link`,
        callback:
          `called ${lead.name}: call back ${fields.follow_up ?? ""}`.trim(),
        shown: `called ${lead.name}: they're interested 👍`,
        sold: `SOLD ${lead.name}! 🎉`,
        not_interested: `called ${lead.name}: not interested`,
      }[input.outcome];
      await notify(env, {
        kind: input.outcome === "note" ? "note" : "call",
        actor: session,
        leadId: id,
        text: `${session.name} ${what}${input.note ? `: "${input.note.slice(0, 160)}"` : ""}`,
      });
      return json({
        ok: true,
        followUp:
          fields.follow_up === undefined ? lead.follow_up : fields.follow_up,
        nextStep: nextStep?.next ?? null,
      });
    }
    if (action === "/followup" && m === "PUT") {
      const { date } = await body(req, z.object({ date: DATE.nullable() }));
      if (date && date < localDate())
        throw new HttpError(400, "Pick today or a later day");
      await updateLead(env, id, { follow_up: date });
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: id,
        text: date
          ? `${session.name} set ${lead.name}'s callback to ${date}`
          : `${session.name} cleared ${lead.name}'s callback`,
      });
      return json({ ok: true });
    }
    if (action === "/notes" && sub && m === "DELETE") {
      const note = await env.DB.prepare(
        "SELECT * FROM lead_notes WHERE id = ? AND lead_id = ?",
      )
        .bind(sub, id)
        .first<NoteRow>();
      if (!note) throw new HttpError(404, "Note not found");
      if (!isOwner && note.author !== session.name)
        throw new HttpError(403, "You can only delete your own notes");
      await env.DB.prepare("DELETE FROM lead_notes WHERE id = ?")
        .bind(sub)
        .run();
      await notify(env, {
        kind: "note",
        actor: session,
        leadId: id,
        text: `${session.name} deleted a note on ${lead.name}${note.body ? `: “${note.body.slice(0, 80)}”` : ""}`,
      });
      return json({ ok: true });
    }
    if (action === "" && m === "DELETE") {
      if (lead.sales_status === "live")
        throw new HttpError(
          409,
          "This site is live. It can't be deleted from here.",
        );
      await deletePrefix(env, `previews/${id}/`);
      await deletePrefix(env, `owner/${id}/`);
      await env.DB.batch([
        // Its flyer code is retired, never handed to another business (an old flyer must not open someone else's site).
        env.DB.prepare("INSERT OR IGNORE INTO retired_codes (code, retired_at) SELECT mail_code, ? FROM leads WHERE id = ? AND mail_code IS NOT NULL").bind(now(), id),
        env.DB.prepare("DELETE FROM lead_notes WHERE lead_id = ?").bind(id),
        env.DB.prepare("DELETE FROM site_stats WHERE lead_id = ?").bind(id),
        env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id),
      ]);
      return json({ ok: true });
    }
    if (action === "/status" && m === "POST") {
      const { salesStatus } = await body(
        req,
        z.object({
          salesStatus: z.enum(["new", "shown", "sold", "not_interested"]),
        }),
      );
      if (lead.sales_status === "live")
        throw new HttpError(409, "This site is already live");
      await updateLead(
        env,
        id,
        salesStatus === "shown" && lead.sales_status !== "shown"
          ? markShown(lead)
          : {
              sales_status: salesStatus,
              ...(salesStatus === "new" ? { shown_at: null } : {}),
            },
      );
      // Sold: the design is theirs now; open leads in the category that share its look get a new one.
      if (salesStatus === "sold" && lead.sales_status !== "sold") await lockDesign(env, lead);
      if (salesStatus !== lead.sales_status) {
        const label = {
          new: "New",
          shown: "Shown",
          sold: "Sold 🎉",
          not_interested: "Not interested",
        }[salesStatus];
        await notify(env, {
          kind: "status",
          actor: session,
          leadId: id,
          text: `${session.name} marked ${lead.name} as ${label}`,
        });
      }
      return json({ ok: true });
    }
    // "Import from their Google page": the listing's latest hours, phone, rating, type, payment / parking info and social
    // link into the record (never over what the owner confirmed), then a rewrite so the words follow Google's newest
    // summary and reviews and the main photo is the newest Google photo. Costs one Place Details call + the copy.
    if (action === "/googleimport" && m === "POST") {
      if (isManualPlaceId(lead.place_id))
        throw new HttpError(409, NOT_ON_GOOGLE);
      if (isPayTest(lead)) throw new HttpError(409, "The practice lead has no Google page");
      if (!lead.record_json) throw new HttpError(409, "This site hasn't been built yet");
      const place = await getPlace(
        env.GOOGLE_PLACES_API_KEY,
        lead.place_id,
        [...(lead.category === "restaurant" ? RESTAURANT_FLAGS : []), ...GOOGLE_IMPORT_FIELDS],
      ).catch((e: unknown) => {
        throw new HttpError(502, `Couldn't read their Google page: ${e instanceof Error ? e.message : String(e)}`);
      });
      await addUsage(env, { places: 1 });
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const changed = refreshFromPlace(record, place);
      const photos = galleryFromPlace(record, place);
      if (photos) changed.push(`${photos} Google photo${photos === 1 ? "" : "s"} (preview only)`);
      await updateLead(env, id, {
        place_json: JSON.stringify(place),
        record_json: JSON.stringify(record),
        rating: place.rating ?? lead.rating,
        review_count: place.userRatingCount ?? lead.review_count,
        fetched_at: now(),
        pitch_json: null,
        rewrite: 1,
        status: "queued",
        error: null,
      });
      await env.JOBS.send({ type: "build", leadId: id });
      await siteUpdated(env, session, lead, [`refreshed from their Google page${changed.length ? ` (${changed.join(", ")})` : ""}: rewriting`]);
      return json({ ok: true, changed });
    }
    // Flyer code: the 5 digits to write in the box on a flyer for this business (owner + callers).
    if (action === "/mailcode" && m === "POST") {
      if (lead.status !== "ready") throw new HttpError(409, "The preview has to finish building first");
      return json({ code: await assignMailCode(env, lead.id), url: `${COMPANY_ORIGIN}/code` });
    }
    // "Re-check website": run the web-presence search for this lead now (owner). Updates the card when a page is found.
    if (action === "/webcheck" && m === "POST") {
      if (!env.BRAVE_SEARCH_API_KEY)
        throw new HttpError(
          409,
          "The Brave Search key isn't set yet (Worker secret BRAVE_SEARCH_API_KEY)",
        );
      const place = (
        lead.place_json
          ? JSON.parse(lead.place_json)
          : {
              displayName: { text: lead.name ?? "" },
              formattedAddress: lead.address ?? "",
              id: lead.place_id,
            }
      ) as Parameters<typeof scorePlace>[0];
      const found = await resolvePresence(env.BRAVE_SEARCH_API_KEY, place);
      if (!found)
        return json({
          found: false,
          presence: lead.presence,
          reason: lead.reason,
          foundUrl: lead.found_url ?? null,
        });
      const suffix = / · added by .+$/.exec(lead.reason ?? "")?.[0] ?? "";
      const reason = `${found.label} · ${lead.review_count ?? 0} Google reviews${suffix}`;
      await updateLead(env, id, {
        presence: found.presence,
        reason,
        found_url: found.url,
        score: scorePlace(place, found.presence),
        pitch_json: null,
      });
      return json({
        found: true,
        presence: found.presence,
        label: found.label,
        reason,
        foundUrl: found.url,
      });
    }
    if (action === "/restyle" && m === "POST") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      if (lead.sales_status === "live")
        throw new HttpError(
          409,
          "This site is already live. Change its design from Edit.",
        );
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      // With a style recipe: keep the colors and layout, rebuild the structure from that recipe (the rest re-rolled).
      const want = req.headers.get("content-type")?.includes("json")
        ? ((await req.json().catch(() => ({}))) as {
            recipe?: string;
            structureOnly?: boolean;
            /** What the owner asked for ("hippie", "bright and happy kids' world"); the art director follows it. */
            brief?: string;
            /** Also rewrite the words in that style (keeps the new design). */
            rewrite?: boolean;
          })
        : {};
      const brief = typeof want.brief === "string" ? want.brief.replace(/\s+/g, " ").trim().slice(0, 200) : "";
      if (brief && !env.ANTHROPIC_API_KEY)
        throw new HttpError(409, "Designing from a description needs the Claude key on the server");
      const recipe = want.recipe
        ? (RECIPES[record.category] ?? []).find((r) => r.id === want.recipe)
        : undefined;
      let look: string;
      if ((recipe || want.structureOnly) && lead.look) {
        const cur = parseDesign(lead.look);
        const base = pickDna(`${id}:${Date.now()}`, record.category, {
          avoid: cur.dna ? [cur.dna] : [],
          hints: dnaHints(record),
        });
        look = designId(
          cur.look,
          layoutOf(lead.look),
          recipe ? settleDna({ ...base, ...recipe.dna }) : base,
        );
      } else {
        // "Try another design": the art director proposes a different design that fits the business, with a new reason.
        const d = await designFor(env, record, `${id}:${Date.now()}`, {
          place: lead.place_json ? (JSON.parse(lead.place_json) as Place) : undefined,
          current: lead.look ?? undefined,
          brief: brief || undefined,
        });
        if (brief && !d.notes) throw new HttpError(502, "The designer couldn't answer just now. Try again in a minute.");
        look = d.look;
        if (d.notes) record.designNotes = d.notes;
        else delete record.designNotes;
      }
      if (recipe || want.structureOnly) delete record.designNotes; // the concept no longer matches a hand-rolled structure
      await renderPreview(env, lead, record, JSON.parse(lead.copy_json), look);
      // The words follow the request too: the rebuild keeps this design and hands its tone notes to the copywriter.
      const rewriting = !!(brief && want.rewrite && !recipe && !want.structureOnly);
      if (rewriting) {
        await updateLead(env, id, { rewrite: 1, status: "queued" });
        await env.JOBS.send({ type: "build", leadId: id });
      }
      await siteUpdated(env, session, lead, [brief ? `new design: "${brief}"` : "new design", ...(rewriting ? ["text rewritten"] : [])]);
      return json({ ok: true, look, rewriting, concept: record.designNotes?.concept ?? null });
    }
    // The site editor as data for the Android app: cards + fields in, field values out (same edits as the web editor).
    if (action === "/editform" && m === "GET") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      return json(editForm(detail(lead, { sold: await soldDesigns(env, lead.category, id) }) as Parameters<typeof editForm>[0]));
    }
    if (action === "/editform" && m === "PUT") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const { values } = await body(
        req,
        z.object({
          values: z.record(z.string(), z.union([z.string(), z.boolean()])),
        }),
      );
      const built = editsFromForm(
        detail(lead) as Parameters<typeof editForm>[0],
        values,
      );
      const edits = EditsSchema.parse(built.edits);
      const next = applyEdits(
        JSON.parse(lead.record_json),
        JSON.parse(lead.copy_json),
        edits,
      );
      if (next.look) {
        // A paying client's look is theirs alone.
        const owner = lookOwner(await soldDesigns(env, lead.category, id), next.look);
        if (owner)
          throw new HttpError(
            409,
            `The "${LOOKS[parseDesign(next.look).look]?.name ?? "chosen"}" look is ${owner.name}'s now (they bought it). Pick another.`,
          );
      }
      await relocate(env, id, JSON.parse(lead.record_json), next.record);
      await renderPreview(
        env,
        lead,
        next.record,
        next.copy,
        next.look ?? lead.look ?? "",
      );
      // Edit → Their domain name: a changed domain is remembered (before publishing) or connected + republished (after).
      let domainNote: string | null = null;
      if (typeof values.customDomain === "string") {
        const typed = values.customDomain.trim();
        const parsed = typed ? DOMAIN_NAME.safeParse(typed) : null;
        if (parsed && !parsed.success) throw new HttpError(400, "Their domain name: type a domain like www.theirbusiness.com");
        const domain = parsed ? parsed.data : null;
        if ((domain ?? null) !== (lead.custom_domain ?? null)) {
          await setLeadDomain(env, (await getLead(env, id))!, domain, url.origin);
          domainNote = domain ? `domain ${domain}` : "domain removed";
        }
      }
      // A new kind of shop needs new words: queue a rewrite (the preview above already has the new sections).
      if (
        edits.record?.autoKind &&
        edits.record.autoKind !==
          (JSON.parse(lead.record_json) as { variant?: string }).variant
      ) {
        await updateLead(env, id, { rewrite: 1, status: "queued" });
        await env.JOBS.send({ type: "build", leadId: id });
      }
      // The "Kind of business" select (Android's Edit): a different kind rebuilds the whole site after the edits above are saved.
      const kind = values.category;
      const words = editWords(edits as Parameters<typeof editWords>[0]);
      if (typeof kind === "string" && kind !== lead.category && (CATEGORY_IDS as readonly string[]).includes(kind)) {
        await recategorizeLead(env, (await getLead(env, id))!, kind as CategoryId);
        words.push(`kind of business changed to ${packFor(kind as CategoryId).label.toLowerCase()}: rebuilding`);
      }
      if (domainNote) words.push(domainNote);
      await siteUpdated(env, session, lead, words);
      return json({
        ...detail((await getLead(env, id))!),
        warnings: built.warnings,
      });
    }
    if (action === "/edits" && m === "PUT") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const edits = await body(req, EditsSchema);
      const next = applyEdits(
        JSON.parse(lead.record_json),
        JSON.parse(lead.copy_json),
        edits,
      );
      if (next.look) {
        // A paying client's look is theirs alone.
        const owner = lookOwner(await soldDesigns(env, lead.category, id), next.look);
        if (owner)
          throw new HttpError(
            409,
            `The "${LOOKS[parseDesign(next.look).look]?.name ?? "chosen"}" look is ${owner.name}'s now (they bought it). Pick another.`,
          );
      }
      await relocate(env, id, JSON.parse(lead.record_json), next.record);
      await renderPreview(
        env,
        lead,
        next.record,
        next.copy,
        next.look ?? lead.look ?? "",
      );
      // A new kind of shop needs new words: queue a rewrite (the preview above already has the new sections).
      if (
        edits.record?.autoKind &&
        edits.record.autoKind !==
          (JSON.parse(lead.record_json) as { variant?: string }).variant
      ) {
        await updateLead(env, id, { rewrite: 1, status: "queued" });
        await env.JOBS.send({ type: "build", leadId: id });
      }
      await siteUpdated(
        env,
        session,
        lead,
        editWords(edits as Parameters<typeof editWords>[0]),
      );
      return json(detail((await getLead(env, id))!));
    }
    if (action === "/photo" && m === "POST") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const type = req.headers.get("content-type") ?? "";
      const ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[type];
      if (!ext) throw new HttpError(415, "Send a JPEG, PNG or WebP photo");
      const bytes = await req.arrayBuffer();
      if (bytes.byteLength > 8_000_000)
        throw new HttpError(413, "That photo is over 8 MB");
      await deletePrefix(env, `owner/${id}/hero.`);
      await env.BUCKET.put(`owner/${id}/hero.${ext}`, bytes, {
        httpMetadata: { contentType: type },
      });
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const w = Number(url.searchParams.get("w")) || undefined;
      const h = Number(url.searchParams.get("h")) || undefined;
      record.media.hero = {
        src: `/assets/owner/hero.${ext}`,
        alt: url.searchParams.get("alt")?.slice(0, 150) || `${record.name}`,
        source: "owner",
        width: w,
        height: h,
      };
      await renderPreview(
        env,
        lead,
        record,
        JSON.parse(lead.copy_json),
        lead.look ?? "",
      );
      await siteUpdated(env, session, lead, ["main photo"]);
      return json(detail((await getLead(env, id))!));
    }
    if (action === "/photo" && m === "DELETE") {
      // Back to no main photo of their own: the site falls back to its stock photo (or Google's in previews).
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      if (!record.media.hero || record.media.hero.source === "google") throw new HttpError(409, "There's no uploaded main photo to remove");
      await deletePrefix(env, `owner/${id}/hero.`);
      record.media.hero = undefined;
      await renderPreview(env, lead, record, JSON.parse(lead.copy_json), lead.look ?? "");
      await siteUpdated(env, session, lead, ["main photo"]);
      return json(detail((await getLead(env, id))!));
    }
    // Photo gallery (owner photos, e.g. from the photo shoot extra, or brought over from their old site): up to 24, each owner/<id>/<key>.<ext>.
    if (action === "/gallery" && m === "POST") {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const type = req.headers.get("content-type") ?? "";
      const ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[type];
      if (!ext) throw new HttpError(415, "Send a JPEG, PNG or WebP photo");
      const bytes = await req.arrayBuffer();
      if (bytes.byteLength > 8_000_000)
        throw new HttpError(413, "That photo is over 8 MB");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      if (record.media.gallery.length >= 24)
        throw new HttpError(
          409,
          "The gallery holds 24 photos. Remove one first.",
        );
      const key = `g${newId().slice(0, 10)}`;
      await env.BUCKET.put(`owner/${id}/${key}.${ext}`, bytes, {
        httpMetadata: { contentType: type },
      });
      const w = Number(url.searchParams.get("w")) || undefined;
      const h = Number(url.searchParams.get("h")) || undefined;
      record.media.gallery.push({
        src: `/assets/owner/${key}.${ext}`,
        alt:
          url.searchParams.get("alt")?.slice(0, 150) ||
          `Photo of ${record.name}`,
        source: "owner",
        width: w,
        height: h,
      });
      await renderPreview(
        env,
        lead,
        record,
        JSON.parse(lead.copy_json),
        lead.look ?? "",
      );
      await siteUpdated(env, session, lead, ["gallery"]);
      return json(detail((await getLead(env, id))!));
    }
    if (action === "/gallery" && m === "DELETE" && leadMatch[3]) {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const key = leadMatch[3];
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      // "google" removes every preview-only Google photo at once; "google-3" one of them; anything else is an owner file.
      const gone = record.media.gallery.filter((p) =>
        key === "google" ? p.source === "google" : p.src.startsWith(`/assets/owner/${key}.`) || p.src.startsWith(`/assets/img/${key}.`),
      );
      record.media.gallery = record.media.gallery.filter(
        (p) => !gone.includes(p),
      );
      for (const p of gone)
        if (p.src.startsWith("/assets/owner/"))
          await env.BUCKET.delete(
            `owner/${id}/${p.src.slice("/assets/owner/".length)}`,
          );
      await renderPreview(
        env,
        lead,
        record,
        JSON.parse(lead.copy_json),
        lead.look ?? "",
      );
      await siteUpdated(env, session, lead, ["gallery"]);
      return json(detail((await getLead(env, id))!));
    }
    // Spanish page (extra): AI translation of the current text, stored in copy.es; DELETE removes the page.
    if (action === "/spanish" && (m === "POST" || m === "DELETE")) {
      if (!lead.record_json || !lead.copy_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const copy = JSON.parse(lead.copy_json) as Copy;
      if (m === "DELETE") delete copy.es;
      else {
        const settings = await getSettings(env);
        const { es, usage } = await translateToSpanish(
          new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
          { record, copy, model: settings.copyModel },
        );
        await chargeAi(env, settings.copyModel, usage);
        // strings: {} = translate every line of every page afresh (renderPreview → syncSpanish fills it).
        copy.es = { ...es, strings: {} };
      }
      await renderPreview(env, lead, record, copy, lead.look ?? "");
      await siteUpdated(env, session, lead, [
        m === "DELETE" ? "Spanish page removed" : "Spanish page",
      ]);
      return json(detail((await getLead(env, id))!));
    }
    // The owner's phone read their current website in a real browser view (scripts run, lazy photos loaded) and sends the page
    // + image addresses here: the server extracts the facts, downloads the photos, and rebuilds the text with them.
    if (action === "/siteimport" && m === "POST") {
      if (!lead.record_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const input = await body(
        req,
        z.object({
          url: WEB_URL(2000),
          html: z.string().min(200).max(3_000_000),
          images: z
            .array(
              z.object({
                src: z.string().max(2000),
                alt: z.string().max(300).optional(),
              }),
            )
            .max(80)
            .default([]),
        }),
      );
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const facts = extractSiteFacts(input.url, input.html);
      if (isDirectoryPage(input.url, facts.title))
        throw new HttpError(
          422,
          "That page is a directory's listing for them, not their own website. Nothing was imported.",
        );
      const fromPage = cleanImages(input.images, input.url, 40);
      facts.images = [
        ...fromPage,
        ...facts.images.filter((i) => !fromPage.some((f) => f.src === i.src)),
      ].slice(0, 40);
      facts.via = "app";
      if (
        !facts.paragraphs.length &&
        !facts.headings.length &&
        !facts.images.length
      )
        throw new HttpError(
          422,
          "That page had nothing we could use (no text or photos)",
        );
      record.existingSite = facts;
      record.siteImport = undefined;
      applySiteFacts(record, facts);
      const photos = await importSitePhotos(env, id, record, facts.images);
      if (photos && record.ext.retail?.priceList)
        autoMatchPhotos(
          record.ext.retail.priceList.sections,
          record.media.gallery,
        );
      await updateLead(env, id, {
        record_json: JSON.stringify(record),
        rewrite: 1,
        status: "queued",
      });
      await env.JOBS.send({ type: "build", leadId: id });
      await siteUpdated(env, session, lead, ["details from their website"]);
      return json({
        ok: true,
        paragraphs: facts.paragraphs.length,
        headings: facts.headings.length,
        images: facts.images.length,
        photos,
        notices: facts.notices,
        foundedYear: facts.foundedYear ?? null,
        email: facts.emails[0] ?? null,
      });
    }
    if (action === "/clientlink" && m === "POST") {
      // The board: the client's own live price-list editor (any category; see tankboard.ts).
      const link = await clientLink(env, lead, url.origin);
      const recW = lead.record_json
        ? kindWords(JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      const board = (recW?.board ?? "Stock board").toLowerCase();
      const secW = (recW?.section ?? "tank").toLowerCase();
      const text = `Hi! Here's your ${lead.name} ${board}: ${link}  Open it on your phone and tap "Add" when it offers your home screen, so it opens like an app. Change what's in each ${secW} any time. Prices and "sold out" show on your website within a minute. Have your stock in a spreadsheet? "Put a whole list on at once" on the board takes it.`;
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: `${session.name} sent ${lead.name} their ${board} link`,
      });
      return json({ url: link, text });
    }
    if (action === "/lookuplink" && m === "POST") {
      // The stock lookup: one search box over the board's list, for a shop that only wants to know "do we have it?" (lookup.ts).
      const link = (await clientLink(env, lead, url.origin)).replace(/\/?$/, "/find/");
      const text = `Hi! Here's your ${lead.name} stock lookup: ${link}  Type a size or name and it shows how many you have. Tap "Add" when it offers your home screen so it opens like an app. To refresh it, export your item list from QuickBooks and pick the file under "Update the list".`;
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: `${session.name} sent ${lead.name} their stock lookup link`,
      });
      return json({ url: link, text });
    }
    if (action === "/practice" && sub === "reset" && m === "POST") {
      // The training aid goes back to square one for the next trainee (refunds, sign-ups, notes, tasks, Pages project, uploads, fresh samples).
      const out = await resetPracticeLead(env, lead, session.name);
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: `${session.name} reset the practice lead for the next run${out.refundedCents ? ` (refunded ${(out.refundedCents / 100).toFixed(2)} dollars)` : ""}`,
      });
      return json({ ok: true, ...out });
    }
    if (action === "/samplestock" && (m === "POST" || m === "DELETE")) {
      // Preview-only sample stock for a prospect: believable items for their kind of business, removable in one tap, never published.
      const rec = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      if (!rec) throw new HttpError(409, "The preview isn't built yet");
      if (m === "POST") {
        const added = addSampleStock(rec);
        await saveAndRefresh(env, lead, rec);
        await notify(env, {
          kind: "status",
          actor: session,
          leadId: lead.id,
          text: `${session.name} put ${added.items} sample items on ${lead.name}'s price list (preview only)`,
        });
        return json({ ok: true, ...added, sampleStock: true });
      }
      const removed = removeSampleStock(rec);
      await saveAndRefresh(env, lead, rec);
      if (removed)
        await notify(env, {
          kind: "status",
          actor: session,
          leadId: lead.id,
          text: `${session.name} removed the sample items from ${lead.name}'s price list`,
        });
      return json({ ok: true, removed, sampleStock: false });
    }
    if (action === "/showboard" && m === "GET") {
      // Customer-facing "Show them the board" page (owner + callers): the pitch for this shop, the tablet view address.
      const live = !!lead.live_url;
      const rec = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      return json({
        ...customerBoardPitch(await getSettings(env), {
          business: lead.name ?? "",
          live,
          kind: rec ? listKind(rec) : undefined,
        }),
        displayUrl: `${url.origin}/d/${lead.id}/`,
        live,
        phone: lead.phone,
      });
    }
    if (action === "/boardlink" && m === "POST") {
      // Text the shop the customer-facing board page (public, signed, 30 days).
      const link = `${url.origin}/b/${await boardPitchToken(env, lead.id)}`;
      const boardW = lead.record_json
        ? kindWords(JSON.parse(lead.record_json) as BusinessRecord).board
        : "Stock board";
      const text = `Hi! Here's how the ${boardW} would work for ${lead.name}: what you'd do, what your customers see, and what it costs. ${link}`;
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: `${session.name} sent ${lead.name} the ${boardW} page`,
      });
      return json({ url: link, text });
    }
    if (action === "/clientlink" && m === "DELETE") {
      // Revoke: a new key means every board link sent so far stops working; the next "Text them" makes a fresh one.
      await updateLead(env, id, { client_key: newId() });
      await notify(env, {
        kind: "status",
        actor: session,
        leadId: lead.id,
        text: `${session.name} revoked ${lead.name}'s board links`,
      });
      return json({ ok: true });
    }
    if (action === "/siteimport" && m === "DELETE") {
      // "Not their website": undo the import (text, photos, found page) and rebuild with a fresh rewrite.
      if (!lead.record_json)
        throw new HttpError(409, "This site hasn't finished building yet");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      await forgetSiteImport(env, lead, record);
      await siteUpdated(env, session, lead, [
        "imported website text and photos removed",
      ]);
      return json({ ok: true });
    }
    if (action === "/recategorize" && m === "POST") {
      const { category } = await body(req, z.object({ category: z.enum(CATEGORY_IDS) }));
      if (category === lead.category) throw new HttpError(409, "That is already its kind");
      await recategorizeLead(env, lead, category);
      await siteUpdated(env, session, lead, [`kind of business changed to ${packFor(category).label.toLowerCase()}: rebuilding`]);
      return json({ ok: true });
    }
    if (action === "/rewrite" && m === "POST") {
      await updateLead(env, id, { rewrite: 1, status: "queued" });
      await env.JOBS.send({ type: "build", leadId: id });
      await siteUpdated(env, session, lead, ["text rewritten"]);
      return json({ ok: true });
    }
    if (action === "/retry" && m === "POST") {
      const stuck =
        (lead.status === "queued" || lead.status === "building") &&
        now() - lead.updated_at > STUCK_BUILD_MS;
      if (lead.status !== "failed" && !stuck)
        throw new HttpError(
          409,
          "Only failed builds (or builds stuck for over 20 minutes) can be retried",
        );
      await updateLead(env, id, { status: "queued", error: null });
      await env.JOBS.send({ type: "build", leadId: id });
      return json({ ok: true });
    }
    if (action === "/publish" && m === "POST") {
      const out = await publishLead(env, lead, url.origin);
      await notify(env, {
        kind: "published",
        actor: session,
        leadId: id,
        text: `${session.name} published ${lead.name}'s website 🚀 ${out.url}`,
      });
      return json(out);
    }
    // Google Analytics: "Give the owner access" (their Google address becomes a viewer on the property the app made).
    if (action === "/analytics" && sub === "access" && m === "POST") {
      const { email } = await body(req, z.object({ email: z.string().trim().toLowerCase().email().max(200) }));
      if (!lead.record_json) throw new HttpError(409, "This site hasn't finished building yet");
      try {
        await grantViewer(env, JSON.parse(lead.record_json) as BusinessRecord, email);
      } catch (err) {
        throw new HttpError(502, (err as Error).message);
      }
      await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
        .bind(newId(), id, session.name, `📊 Gave ${email} access to their Google Analytics.`, now())
        .run();
      return json({ ok: true });
    }
    // Google Analytics now (live sites without it): set the property up and republish with the tag.
    if (action === "/analytics" && !sub && m === "POST") {
      if (!lead.live_url) throw new HttpError(409, "Publish the site first; Google Analytics is set up when it goes live");
      const s = await getSettings(env);
      if (gaState(env, s) !== "on") throw new HttpError(409, "Google Analytics isn't connected yet: see Settings → Website");
      const out = await publishLead(env, lead, url.origin);
      const after = (await getLead(env, id))!;
      const rec = after.record_json ? (JSON.parse(after.record_json) as BusinessRecord) : null;
      if (!rec?.seo?.gaId) throw new HttpError(502, (await gaLastError(env))?.error ?? "Google Analytics couldn't be set up");
      return json({ ...out, analytics: detail(after).analytics });
    }
    if (action === "/share" && m === "POST") {
      if (lead.status !== "ready")
        throw new HttpError(409, "The preview isn't ready yet");
      // {lang: "es"} links straight to the Spanish page (/es/), for owners who read Spanish first.
      const body = (await req.json().catch(() => ({}))) as { lang?: string };
      const es = body?.lang === "es";
      if (es && !(lead.copy_json && (JSON.parse(lead.copy_json) as Copy).es))
        throw new HttpError(409, "There's no Spanish page yet. Edit → Spanish page → Write Spanish page first.");
      const token = await shareToken(env, id);
      return json({ url: `${url.origin}/s/${token}/${es ? "es/" : ""}`, expiresInDays: 14 });
    }
    if (action === "/pitch" && (m === "GET" || m === "POST")) {
      const settings = await getSettings(env);
      const callerName = isOwner ? settings.callerName : session.name;
      if (m === "GET" && lead.pitch_json)
        return json({ pitch: pitchFor(lead.pitch_json, callerName) });
      if (!lead.record_json || !lead.lint_json)
        throw new HttpError(409, "The preview isn't ready yet");
      const lint = JSON.parse(lead.lint_json) as {
        todos?: string[];
        suggestions?: string[];
      };
      const place = lead.place_json
        ? (JSON.parse(lead.place_json) as Place)
        : undefined;
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const result = await writePitch(
        new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
        {
          record,
          pack: packFor(record.category),
          reason: lead.reason ?? "",
          reviewContext: place ? reviewTexts(place) : [],
          todos: lint.todos ?? [],
          suggestions: lint.suggestions ?? [],
          sales: {
            ...settings,
            callerName,
            billing: settings.plans[0]
              ? billingOptions(settings.plans[0], settings).map(
                  (o) =>
                    `${o.label}: ${o.id === "short" || o.id === "standard" ? "no setup fee" : o.id === "flex" ? `no minimum, one-time $${settings.flexSetup} setup fee` : `pay for ${12 - (settings.annualMonthsFree ?? 0)} months up front, get 12 (${settings.annualMonthsFree} free)`}`,
                )
              : [],
            addons: settings.addons.map(
              (a) =>
                `${a.name}: ${addonPrice(a)}${a.about ? ` (${a.about})` : ""}`,
            ),
          },
          model: settings.copyModel,
        },
      );
      const price =
        MODEL_PRICES[result.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
      await addUsage(env, {
        aiIn: result.usage.input,
        aiOut: result.usage.output,
        costMicro: Math.round(
          result.usage.input * price.input + result.usage.output * price.output,
        ),
      });
      await updateLead(env, id, {
        pitch_json: JSON.stringify({ ...result.pitch, _caller: callerName }),
      });
      return json({ pitch: result.pitch });
    }
    if (action === "/zip" && m === "GET") {
      const zip = await zipLead(env, lead, url.origin);
      const name = (lead.pages_project ?? lead.name ?? "site")
        .replace(/[^a-z0-9-]+/gi, "-")
        .toLowerCase();
      return new Response(zip, {
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${name}.zip"`,
        },
      });
    }
  }

  if (path === "/inbox" || path.startsWith("/inbox/") || path === "/usage")
    ownerOnly();
  if (path === "/inbox" && m === "GET") {
    const rows = await env.DB.prepare(
      "SELECT s.id, s.lead_id, s.created_at, s.data_json, s.read, l.name AS business FROM submissions s LEFT JOIN leads l ON l.id = s.lead_id ORDER BY s.created_at DESC LIMIT 200",
    ).all<{
      id: string;
      lead_id: string;
      created_at: number;
      data_json: string;
      read: number;
      business: string;
    }>();
    return json({
      items: rows.results.map((r) => ({
        id: r.id,
        leadId: r.lead_id,
        business:
          r.lead_id === COMPANY_LEAD_ID ? "your own website" : r.business,
        createdAt: r.created_at,
        read: !!r.read,
        data: JSON.parse(r.data_json),
      })),
      // Posts dropped as spam this month, with the last few (who, why, a snippet), so a "did you get my message?" can be checked.
      blocked: await blockedSummary(env),
    });
  }
  const inboxMatch = /^\/inbox\/([a-z0-9]+)\/read$/.exec(path);
  if (inboxMatch && m === "POST") {
    await env.DB.prepare("UPDATE submissions SET read = 1 WHERE id = ?")
      .bind(inboxMatch[1])
      .run();
    return json({ ok: true });
  }

  if (path === "/usage" && m === "GET") {
    const all = await env.DB.prepare(
      "SELECT COALESCE(SUM(places_requests),0) AS places, COALESCE(SUM(photo_requests),0) AS photos, COALESCE(SUM(ai_input),0) AS aiIn, COALESCE(SUM(ai_output),0) AS aiOut, COALESCE(SUM(ai_cost_microdollars),0) AS aiMicro FROM usage WHERE day >= ?",
    )
      .bind(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
      .first<{
        places: number;
        photos: number;
        aiIn: number;
        aiOut: number;
        aiMicro: number;
      }>();
    const u = all ?? { places: 0, photos: 0, aiIn: 0, aiOut: 0, aiMicro: 0 };
    return json({
      last30Days: {
        googleRequests: u.places,
        googlePhotos: u.photos,
        googleCostEstimate:
          Math.round(
            (u.places * PLACES_COST_PER_REQUEST + u.photos * PHOTO_COST) * 100,
          ) / 100,
        aiTokensIn: u.aiIn,
        aiTokensOut: u.aiOut,
        aiCost: Math.round(u.aiMicro / 10_000) / 100,
      },
    });
  }

  throw new HttpError(404, "Not found");
}

/** Serves a preview through a share link: rewrites internal links to the share path and adds a preview banner. */
async function serveShared(
  env: Env,
  req: Request,
  leadId: string,
  token: string,
  rest: string,
): Promise<Response> {
  const res = await servePreview(env, req, leadId, rest);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("text/html") && !type.startsWith("text/css")) return res;
  let text = (await res.text()).split(`/p/${leadId}/`).join(`/s/${token}/`);
  if (type.startsWith("text/html")) {
    const lead = await getLead(env, leadId);
    const settings = await getSettings(env);
    const esc = (t: string) =>
      t.replace(
        /[<>&"]/g,
        (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!,
      );
    const name = esc(lead?.name ?? "your business");
    const from = settings.companyName ? ` by ${esc(settings.companyName)}` : "";
    // The way back to us: a prospect who likes it (from a flyer code or a texted link) can call or text right from the banner.
    const digits = (settings.companyPhone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    const reach = digits.length === 10
      ? ` <span style="white-space:nowrap">Like it? <a href="tel:+1${digits}" style="color:#fca311">Call</a> or <a href="sms:+1${digits}" style="color:#fca311">text</a> ${esc(settings.companyPhone!)}.</span>`
      : "";
    const spanish = rest.startsWith("/es/") || rest === "/es";
    const reachEs = digits.length === 10
      ? ` <span style="white-space:nowrap">¿Le gusta? <a href="tel:+1${digits}" style="color:#fca311">Llame</a> o <a href="sms:+1${digits}" style="color:#fca311">envíe un texto</a> al ${esc(settings.companyPhone!)}.</span>`
      : "";
    const banner = spanish
      ? `<div role="note" lang="es" style="position:relative;z-index:60;background:#14213d;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">Vista previa gratis hecha para ${name}${settings.companyName ? ` por ${esc(settings.companyName)}` : ""}. Todavía no está publicada; revisaremos las fotos y los datos con usted primero.${reachEs}</div>`
      : `<div role="note" style="position:relative;z-index:60;background:#14213d;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">Free preview made for ${name}${from}. Not live yet; photos and details will be checked with you first.${reach}</div>`;
    // Link-preview bots (texts, Facebook) fetch the page but don't run scripts, so only a real visit after a moment counts.
    const beacon = `<script>setTimeout(function(){try{if(sessionStorage.getItem("wbo"))return;sessionStorage.setItem("wbo","1")}catch(e){}if(document.visibilityState!=="hidden"&&navigator.sendBeacon)navigator.sendBeacon("/s/${token}/opened")},3000)</script>`;
    text = text
      .replace(/<body([^>]*)>/, `<body$1>${banner}`)
      .replace(/<\/body>/, `${beacon}</body>`);
  }
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(text, { status: res.status, headers });
}

/** A prospect opened their shared preview: count it and tell the team (once per 30 minutes; our own logins don't count). */
async function previewOpened(
  env: Env,
  req: Request,
  leadId: string,
): Promise<Response> {
  if (await getSession(env, req)) return new Response(null, { status: 204 });
  const t = now();
  const row = await env.DB.prepare(
    "UPDATE leads SET preview_opens = preview_opens + 1, preview_opened_at = ? WHERE id = ? AND status != 'expired' AND COALESCE(preview_opened_at, 0) < ? RETURNING preview_opens, name",
  )
    .bind(t, leadId, t - 30 * 60_000)
    .first<{ preview_opens: number; name: string | null }>();
  if (row) {
    const n = row.preview_opens;
    const times =
      n === 1
        ? ""
        : ` (${n}${n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : n % 10 === 1 && n % 100 !== 11 ? "st" : "th"} time)`;
    await notify(env, {
      kind: "preview_open",
      leadId,
      text: `${row.name ?? "A prospect"} just opened their preview${times}. Good time to call.`,
    });
  }
  return new Response(null, { status: 204 });
}

async function expireStaleLeads(env: Env): Promise<void> {
  const cutoffNew = now() - 30 * 86_400_000;
  const cutoffShown = now() - 60 * 86_400_000;
  const stale = await env.DB.prepare(EXPIRE_SQL)
    // A scheduled callback keeps a lead around, but never past 90 days of Google data.
    .bind(cutoffNew, cutoffShown, localDate(), now() - 90 * 86_400_000)
    .all<{ id: string }>();
  for (const { id } of stale.results) {
    await deletePrefix(env, `previews/${id}/`);
    await deletePrefix(env, `owner/${id}/`);
    // Keep only the Place ID (allowed indefinitely) so the lead isn't re-found as new.
    await updateLead(env, id, {
      status: "expired",
      place_json: null,
      record_json: null,
      copy_json: null,
      lint_json: null,
      name: null,
      phone: null,
      address: null,
      lat: null,
      lng: null,
    });
  }
}

/** Housekeeping: old notifications and handled Stripe event ids, and login counters whose window has passed. */
async function pruneOldRows(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM events WHERE created_at < ?")
    .bind(now() - 180 * 86_400_000)
    .run();
  await env.DB.prepare("DELETE FROM stripe_events WHERE created_at < ?")
    .bind(now() - 90 * 86_400_000)
    .run();
  await pruneLoginFailures(env);
  await pruneSpamCounters(env);
  await pruneCodeCounters(env);
}

/* ---------- Backups ---------- */

// settings is read separately above (owner password and the saved Claude key left out); listing it here overwrote that.
const BACKUP_TABLES = [
  "users",
  "leads",
  "lead_notes",
  "signups",
  "purchases",
  "submissions",
  "site_stats",
  "usage",
  "stripe_events",
  "time_entries",
] as const;

/** Every row of a table, read in pages so one big table (leads carry whole sites) can't blow a single response. */
async function allRows(
  env: Env,
  sql: string,
  binds: unknown[] = [],
  page = 200,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += page) {
    const rows = await env.DB.prepare(`${sql} LIMIT ? OFFSET ?`)
      .bind(...binds, page, offset)
      .all<Record<string, unknown>>();
    out.push(...rows.results);
    if (rows.results.length < page) return out;
  }
}

/** Everything needed to rebuild the database (the owner's password hash left out). */
async function backupData(env: Env): Promise<{
  day: string;
  at: number;
  tables: Record<string, Record<string, unknown>[]>;
}> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  tables.settings = await allRows(
    env,
    "SELECT key, value FROM settings WHERE key != 'owner_password' AND key != 'anthropic_key' AND key NOT LIKE 'login_failures%' ORDER BY key",
  );
  for (const t of BACKUP_TABLES)
    tables[t] = await allRows(env, `SELECT * FROM ${t} ORDER BY rowid`);
  tables.events = await allRows(
    env,
    "SELECT * FROM events WHERE created_at >= ? ORDER BY created_at",
    [now() - 90 * 86_400_000],
  );
  return { day: localDate(), at: now(), tables };
}

/** Weekly cron: _backup/<date>.json in R2, keeping the newest BACKUP_KEEP. */
async function writeBackup(env: Env): Promise<void> {
  const data = await backupData(env);
  await env.BUCKET.put(`_backup/${data.day}.json`, JSON.stringify(data), {
    httpMetadata: { contentType: "application/json" },
  });
  const list = await env.BUCKET.list({ prefix: "_backup/" });
  const old = list.objects
    .map((o) => o.key)
    .sort()
    .reverse()
    .slice(BACKUP_KEEP);
  if (old.length) await env.BUCKET.delete(old);
}

installMeter();

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      env = await withAiKey(env);
      return await handle(req, env);
    } finally {
      ctx.waitUntil(flushUsage(env));
    }
  },

  async queue(batch: MessageBatch<Job>, env: Env): Promise<void> {
    try {
      env = await withAiKey(env);
      await handleQueue(batch, env);
    } finally {
      await flushUsage(env);
    }
  },

  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    try {
      env = await withAiKey(env);
      await handleScheduled(event, env);
    } finally {
      await flushUsage(env);
    }
  },
} satisfies ExportedHandler<Env, Job>;

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  try {
    // Buy extras links (/x/) also work on the company domain, so emailed links show our own address.
    if (COMPANY_HOSTS.includes(url.hostname) && !url.pathname.startsWith("/x/"))
      return (await serveCompany(env, req, url)) ?? env.ASSETS.fetch(req);
    if (url.pathname.startsWith("/api/")) return await api(env, req, url);
    const preview = /^\/p\/([a-z0-9]+)(\/.*)?$/.exec(url.pathname);
    if (preview) {
      if (!(await getSession(env, req)))
        return Response.redirect(
          `${url.origin}/?next=${encodeURIComponent(url.pathname)}`,
          302,
        );
      if (!url.pathname.startsWith(`/p/${preview[1]}/`))
        return Response.redirect(`${url.origin}/p/${preview[1]}/`, 301);
      return await servePreview(env, req, preview[1]!, preview[2] ?? "/");
    }
    const share = /^\/s\/([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)(\/.*)?$/.exec(
      url.pathname,
    );
    if (share) {
      const [, leadId, exp, sig, rest] = share as unknown as [
        string,
        string,
        string,
        string,
        string | undefined,
      ];
      if (!(await verifyShare(env, leadId, exp, sig))) {
        return new Response(
          "This preview link has expired. Ask us for a new one.",
          {
            status: 410,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-robots-tag": "noindex",
            },
          },
        );
      }
      const token = `${leadId}.${exp}.${sig}`;
      if (rest === "/opened" && req.method === "POST")
        return await previewOpened(env, req, leadId);
      if (!rest) return Response.redirect(`${url.origin}/s/${token}/`, 301);
      return await serveShared(env, req, leadId, token, rest);
    }
    const client = /^\/c\/([a-z0-9]+)\.([A-Za-z0-9_-]+)(\/.*)?$/.exec(
      url.pathname,
    );
    if (client)
      return await serveTankBoard(
        env,
        req,
        client[1]!,
        client[2]!,
        client[3] ?? "",
        url.origin,
      );
    const pitchLink = /^\/b\/([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)\/?$/.exec(
      url.pathname,
    );
    if (pitchLink && req.method === "GET") {
      const [, leadId, exp, sig] = pitchLink as unknown as [
        string,
        string,
        string,
        string,
      ];
      const lead = (await verifyBoardPitch(env, leadId, exp, sig))
        ? await getLead(env, leadId)
        : null;
      if (!lead || lead.status === "expired")
        return new Response("This link has expired. Ask us for a new one.", {
          status: 410,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "noindex",
          },
        });
      const s = await getSettings(env);
      const rec = lead.record_json
        ? (JSON.parse(lead.record_json) as BusinessRecord)
        : null;
      const pitch = customerBoardPitch(s, {
        business: lead.name ?? "",
        live: !!lead.live_url,
        kind: rec ? listKind(rec) : undefined,
      });
      return customerPitchPage(pitch, {
        business: lead.name ?? "your shop",
        company: s.companyName || "Underground Associates",
        phone: s.companyPhone,
        boardUrl: await clientLink(env, lead, url.origin),
        displayUrl: `${url.origin}/d/${lead.id}/`,
        board: rec ? kindWords(rec).board : undefined,
        pricingUrl: "https://undergroundassociates.com/pricing#price-list",
      });
    }
    const displayMeta =
      /^\/d\/([a-z0-9]+)\/(manifest\.webmanifest|icon\.svg)$/.exec(
        url.pathname,
      );
    if (displayMeta && req.method === "GET")
      return await serveDisplayMeta(
        env,
        displayMeta[1]!,
        displayMeta[2] === "icon.svg" ? "icon" : "manifest",
        url.searchParams.get("tank") ?? "",
      );
    const display = /^\/d\/([a-z0-9]+)(?:\/([a-z0-9-]*))?$/.exec(url.pathname);
    if (display && req.method === "GET")
      return await serveDisplay(env, display[1]!, display[2] ?? "", url.origin);
    const station =
      /^\/l\/([a-z0-9]+)(\/(?:unlock|staff)\/[A-Za-z0-9_-]+)$/.exec(
        url.pathname,
      );
    if (station)
      return await serveStation(env, req, station[1]!, station[2]!, url.origin);
    const live =
      /^\/l\/([a-z0-9]+)\/(prices\.json|photo\/([A-Za-z0-9_.-]+))$/.exec(
        url.pathname,
      );
    if (live)
      return live[2] === "prices.json"
        ? await servePricesFeed(env, live[1]!, url.origin)
        : await servePhoto(env, live[1]!, live[3]!);
    if (url.pathname === "/.well-known/assetlinks.json")
      return json(ASSET_LINKS, 200, {
        "cache-control": "public, max-age=3600",
      });
    const signup =
      /^\/a\/([a-z0-9]+)\.(basic|plus|pro|list)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(
        url.pathname,
      );
    if (signup && (req.method === "GET" || req.method === "POST")) {
      const [, leadId, plan, exp, sig] = signup as unknown as [
        string,
        string,
        string,
        string,
        string,
      ];
      if (!(await verifySignup(env, leadId, plan, exp, sig))) {
        return new Response(
          "This sign-up link has expired. Ask us for a new one.",
          {
            status: 410,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-robots-tag": "noindex",
            },
          },
        );
      }
      return await serveSignup(env, req, leadId, plan, url.origin);
    }
    if (url.pathname === "/stripe/webhook" && req.method === "POST")
      return await stripeWebhook(env, req);
    if (url.pathname.startsWith("/agreement/") && req.method === "GET") {
      const tok = url.pathname.slice("/agreement/".length);
      return tok.endsWith(".pdf")
        ? await agreementPdf(env, tok.slice(0, -4))
        : await agreementPage(env, tok);
    }
    const extras = /^\/x\/([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(
      url.pathname,
    );
    if (extras && (req.method === "GET" || req.method === "POST")) {
      const [, leadId, exp, sig] = extras as unknown as [
        string,
        string,
        string,
        string,
      ];
      if (!(await verifyExtras(env, leadId, exp, sig))) {
        return new Response("This link has expired. Ask us for a new one.", {
          status: 410,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "noindex",
          },
        });
      }
      return await serveExtras(env, req, leadId, url.origin);
    }
    const hit = /^\/t\/([a-z0-9]+)$/.exec(url.pathname);
    if (hit && req.method === "POST")
      return await recordHit(env, req, hit[1]!, url.searchParams.get("e"));
    const form = /^\/f\/([a-z0-9]+)$/.exec(url.pathname);
    if (form && req.method === "POST")
      return await handleFormPost(env, req, form[1]!);
    return env.ASSETS.fetch(req);
  } catch (err) {
    if (err instanceof HttpError)
      return json({ error: err.message, ...err.extra }, err.status);
    console.error(err);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}

async function handleQueue(batch: MessageBatch<Job>, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    try {
      if (msg.body.type === "search") await runSearch(env, msg.body);
      else if (msg.body.type === "build") await runBuild(env, msg.body);
      else if (msg.body.type === "restyle") await runRestyle(env, msg.body);
      else if (msg.body.type === "relive") await runRelive(env, msg.body);
      msg.ack();
    } catch (err) {
      console.error("job failed", msg.body, err);
      // A build that blew up outside runBuild's own catch (e.g. D1 hiccup) gets another go (max_retries in wrangler.jsonc);
      // a search job isn't worth re-running against Google.
      if (msg.body.type === "build") msg.retry();
      else msg.ack();
    }
  }
}

async function handleScheduled(
  event: ScheduledController,
  env: Env,
): Promise<void> {
  if (event.cron === CRON_MINUTE) {
    // A new Android build in R2 → one push to every phone (no-op without the Firebase secret).
    await announceUpdate(env);
    // Once Google Analytics is connected, every live site is republished once to get its own property (analytics.ts).
    await queueGaBackfill(env).catch((e) => console.error("ga backfill", e));
    // Client domains waiting on their DNS record: switch the site over once Cloudflare says it works.
    await checkDomains(env).catch((e) => console.error("domain check", e));
    // Tasks still on someone's calendar as an emailed invite move straight into it once Google allows it (gcal.ts).
    if (new Date().getUTCMinutes() % 3 === 0) {
      await upgradeCalendars(env).catch((e) => console.error("calendar upgrade", e));
      // Ticked off in the Google Tasks app → finished in ours (gcal.ts / tasks.ts).
      await pollGoogleTasks(env).catch((e) => console.error("google tasks poll", e));
    }
    await republishDirty(env);
    await requeueStuck(env);
    await queueRelive(env);
    await backfillMailCodes(env);
    await remindOpenShifts(env);
    return;
  }
  if (event.cron === CRON_WEEKLY_BACKUP) {
    await writeBackup(env);
    return;
  }
  await expireStaleLeads(env);
  await pruneOldRows(env);
  await reconcileTaps(env);
  await applyBankedReferrals(env).catch((err) =>
    console.error("banked referrals", err),
  );
  await costAlerts(env, await getSettings(env)).catch((err) =>
    console.error("cost alerts", err),
  );
}
