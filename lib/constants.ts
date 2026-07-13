// Shared between the API (server) and the form page (client): the single source
// of truth for the Occupation combo-box options and the validation messages
// shown under each field in the mockup.

export const OCCUPATIONS = [
  "Software Engineer",
  "Teacher",
  "Doctor",
  "Nurse",
  "Accountant",
  "Civil Servant",
  "Business Owner",
  "Student",
  "Other",
] as const;

export type Occupation = (typeof OCCUPATIONS)[number];

export const SEXES = ["Male", "Female"] as const;
export type Sex = (typeof SEXES)[number];

// Field-keyed messages. Wording matches the red helper text in the mockup.
export const MESSAGES = {
  required: "This field is required",
  firstName: "Please provide a First Name",
  lastName: "Please provide a Last Name",
  email: "Please provide a valid Email",
  phone: "Please provide a valid Phone",
  birthDay: "Please provide a valid Birth Day",
  profile: "Please select a valid profile",
  occupation: "Please select an Occupation",
  sex: "Please select Sex",
} as const;

// The exact keys the API returns in its `errors` object and the form renders.
export type PersonField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "birthDay"
  | "occupation"
  | "sex"
  | "profileBase64";
