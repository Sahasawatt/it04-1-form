// Pure, framework-free validation for the IT 04-1 registration form.
// No next/prisma imports — only shared constants, so this can be exercised
// standalone (see scripts/verify-validation.mjs).
import { OCCUPATIONS, SEXES, MESSAGES } from "@/lib/constants";

export type PersonInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDay: string;
  occupation: string;
  sex: string;
  profileBase64: string;
};

export type ValidatedPerson = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDay: Date;
  occupation: string;
  sex: string;
  profileBase64: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{9,15}$/;
const BIRTHDAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Parses a "dd/mm/yyyy" string into a UTC Date.
 * Returns null when the string isn't in that format, the year is outside
 * 1900..currentYear, the date doesn't exist on the calendar (e.g. 31/02), or
 * the date is in the future.
 */
export function parseBirthDay(s: string): Date | null {
  const match = BIRTHDAY_RE.exec(s);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const currentYear = new Date().getUTCFullYear();

  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > currentYear) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC() rolls invalid days into the next month (e.g. 31/02 -> Mar 3);
  // a round-trip mismatch means the input wasn't a real calendar date.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > todayUTC) return null;

  return date;
}

export function validatePerson(
  input: unknown
): { ok: true; value: ValidatedPerson } | { ok: false; errors: Record<string, string> } {
  const obj = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;

  const firstName = String(obj.firstName ?? "").trim();
  const lastName = String(obj.lastName ?? "").trim();
  const email = String(obj.email ?? "").trim();
  const phone = String(obj.phone ?? "").trim();
  const birthDayRaw = String(obj.birthDay ?? "").trim();
  const occupation = String(obj.occupation ?? "").trim();
  const sex = String(obj.sex ?? "").trim();
  const profileBase64 = String(obj.profileBase64 ?? "").trim();

  const errors: Record<string, string> = {};

  if (firstName === "") errors.firstName = MESSAGES.firstName;
  if (lastName === "") errors.lastName = MESSAGES.lastName;
  if (!EMAIL_RE.test(email)) errors.email = MESSAGES.email;

  const phoneCleaned = phone.replace(/[\s-]/g, "");
  if (!PHONE_RE.test(phoneCleaned)) errors.phone = MESSAGES.phone;

  const birthDay = parseBirthDay(birthDayRaw);
  if (!birthDay) errors.birthDay = MESSAGES.birthDay;

  if (!(OCCUPATIONS as readonly string[]).includes(occupation)) {
    errors.occupation = MESSAGES.occupation;
  }
  if (!(SEXES as readonly string[]).includes(sex)) {
    errors.sex = MESSAGES.sex;
  }
  if (profileBase64 === "" || !profileBase64.startsWith("data:image/")) {
    errors.profileBase64 = MESSAGES.profile;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      phone,
      birthDay: birthDay!,
      occupation,
      sex,
      profileBase64,
    },
  };
}
