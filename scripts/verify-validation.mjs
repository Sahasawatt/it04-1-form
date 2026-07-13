// Standalone self-check for lib/validation.ts. Plain Node, no test framework,
// not imported anywhere, .mjs so it's outside the TS build (tsc/next build
// only include **/*.ts, **/*.tsx).
//
// Run from the project root:  node scripts/verify-validation.mjs
//
// lib/validation.ts imports from "@/lib/constants" (a bundler-only path
// alias that plain Node can't resolve). ponytail: this registers a tiny
// inline loader that rewrites "@/x" -> "<cwd>/x.ts" so the REAL file can be
// exercised without pulling in a build tool; upgrade to the project's real
// tsconfig-paths resolution if this script ever needs more than one alias.
import { register } from "node:module";
import assert from "node:assert/strict";

register(
  `data:text/javascript,${encodeURIComponent(`
  import { pathToFileURL } from "node:url";
  const root = pathToFileURL(process.cwd() + "/").href;
  export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(specifier.slice(2) + ".ts", root).href, context);
    }
    return nextResolve(specifier, context);
  }
`)}`,
  import.meta.url
);

const { validatePerson, parseBirthDay } = await import("@/lib/validation");
const { MESSAGES, OCCUPATIONS, SEXES } = await import("@/lib/constants");

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}\n  ${err.message}`);
  }
}

function fmt(date) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const today = new Date();
const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

const validPayload = {
  firstName: "Somchai",
  lastName: "Jaidee",
  email: "somchai@example.com",
  phone: "081-234-5678",
  birthDay: "15/06/1995",
  occupation: OCCUPATIONS[0],
  sex: "Male",
  profileBase64: "data:image/png;base64,iVBORw0KGgo=",
};

// --- parseBirthDay -----------------------------------------------------
check("parseBirthDay: valid date", () => {
  const d = parseBirthDay("15/06/1995");
  assert.ok(d instanceof Date);
  assert.equal(d.getUTCFullYear(), 1995);
  assert.equal(d.getUTCMonth(), 5);
  assert.equal(d.getUTCDate(), 15);
});
check("parseBirthDay: rejects non-existent calendar date (31/02)", () => {
  assert.equal(parseBirthDay("31/02/2020"), null);
});
check("parseBirthDay: rejects future date", () => {
  assert.equal(parseBirthDay(fmt(tomorrow)), null);
});
check("parseBirthDay: accepts today", () => {
  assert.ok(parseBirthDay(fmt(today)) instanceof Date);
});
check("parseBirthDay: rejects bad format", () => {
  assert.equal(parseBirthDay("1995-06-15"), null);
  assert.equal(parseBirthDay("15-06-1995"), null);
  assert.equal(parseBirthDay(""), null);
});
check("parseBirthDay: rejects year before 1900", () => {
  assert.equal(parseBirthDay("01/01/1899"), null);
});
check("parseBirthDay: rejects year after current", () => {
  assert.equal(parseBirthDay(`01/01/${today.getUTCFullYear() + 1}`), null);
});

// --- validatePerson: happy path ----------------------------------------
check("validatePerson: valid payload -> ok:true", () => {
  const result = validatePerson(validPayload);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.value.birthDay instanceof Date);
    assert.equal(result.value.firstName, "Somchai");
    assert.equal(result.value.phone, "081-234-5678"); // stored as entered, not de-formatted
  }
});
check("validatePerson: phone with spaces/dashes normalizes for the check", () => {
  const result = validatePerson({ ...validPayload, phone: "+66 81 234 5678" });
  assert.equal(result.ok, true);
});

// --- validatePerson: crash-proofing -------------------------------------
check("validatePerson: null input never crashes", () => {
  const result = validatePerson(null);
  assert.equal(result.ok, false);
});
check("validatePerson: non-object input (string) never crashes", () => {
  const result = validatePerson("not an object");
  assert.equal(result.ok, false);
});
check("validatePerson: missing fields all report field-specific messages", () => {
  const result = validatePerson({});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.firstName, MESSAGES.firstName);
    assert.equal(result.errors.lastName, MESSAGES.lastName);
    assert.equal(result.errors.email, MESSAGES.email);
    assert.equal(result.errors.phone, MESSAGES.phone);
    assert.equal(result.errors.birthDay, MESSAGES.birthDay);
    assert.equal(result.errors.occupation, MESSAGES.occupation);
    assert.equal(result.errors.sex, MESSAGES.sex);
    assert.equal(result.errors.profileBase64, MESSAGES.profile);
  }
});

// --- validatePerson: per-field rules ------------------------------------
check("validatePerson: invalid email", () => {
  const result = validatePerson({ ...validPayload, email: "not-an-email" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.email, MESSAGES.email);
});
check("validatePerson: phone too short", () => {
  const result = validatePerson({ ...validPayload, phone: "12345" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.phone, MESSAGES.phone);
});
check("validatePerson: birthDay wrong format", () => {
  const result = validatePerson({ ...validPayload, birthDay: "1995/06/15" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.birthDay, MESSAGES.birthDay);
});
check("validatePerson: occupation not in list", () => {
  const result = validatePerson({ ...validPayload, occupation: "Astronaut" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.occupation, MESSAGES.occupation);
});
check("validatePerson: sex not in list", () => {
  const result = validatePerson({ ...validPayload, sex: "Other" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.sex, MESSAGES.sex);
});
check("validatePerson: sex accepts every SEXES entry", () => {
  for (const s of SEXES) {
    const result = validatePerson({ ...validPayload, sex: s });
    assert.equal(result.ok, true, `sex "${s}" should be valid`);
  }
});
check("validatePerson: occupation accepts every OCCUPATIONS entry", () => {
  for (const o of OCCUPATIONS) {
    const result = validatePerson({ ...validPayload, occupation: o });
    assert.equal(result.ok, true, `occupation "${o}" should be valid`);
  }
});
check("validatePerson: profileBase64 must be a data:image/ URL", () => {
  const result = validatePerson({ ...validPayload, profileBase64: "not-a-data-url" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.profileBase64, MESSAGES.profile);
});
check("validatePerson: whitespace-only firstName is required, not accepted", () => {
  const result = validatePerson({ ...validPayload, firstName: "   " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.firstName, MESSAGES.firstName);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
