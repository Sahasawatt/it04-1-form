"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { OCCUPATIONS, MESSAGES, SEXES } from "@/lib/constants";

interface FormFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileBase64: string;
  birthDay: string;
  occupation: string;
  sex: string;
}

interface SaveSuccessResponse {
  id: number;
  message: string;
}

interface SaveErrorResponse {
  errors: Record<string, string>;
}

const EMPTY_FORM: FormFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  profileBase64: "",
  birthDay: "",
  occupation: "",
  sex: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{9,15}$/;
// The native date input (<input type="date">) hands us yyyy-mm-dd.
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// yyyy-mm-dd, a real calendar date, not in the future, year 1900..current.
function isValidBirthDay(value: string): boolean {
  const match = ISO_DATE_RE.exec(value.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;

  // Round-trip through Date to reject impossible dates (e.g. 31/02/2020),
  // since Date otherwise silently rolls them into the next month.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date <= todayMidnight;
}

// The API contract takes dd/mm/yyyy; the native date input gives yyyy-mm-dd.
function toDdMmYyyy(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function validate(f: FormFields): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!f.firstName.trim()) errors.firstName = MESSAGES.firstName;
  if (!f.lastName.trim()) errors.lastName = MESSAGES.lastName;
  if (!EMAIL_RE.test(f.email)) errors.email = MESSAGES.email;

  const phoneDigits = f.phone.replace(/[\s-]/g, "");
  if (!PHONE_RE.test(phoneDigits)) errors.phone = MESSAGES.phone;

  if (!isValidBirthDay(f.birthDay)) errors.birthDay = MESSAGES.birthDay;
  if (!(OCCUPATIONS as readonly string[]).includes(f.occupation)) {
    errors.occupation = MESSAGES.occupation;
  }
  if (!(SEXES as readonly string[]).includes(f.sex)) errors.sex = MESSAGES.sex;
  if (!f.profileBase64.startsWith("data:image/")) errors.profileBase64 = MESSAGES.profile;

  return errors;
}

export default function Page() {
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [profileFileName, setProfileFileName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successId, setSuccessId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      updateField("profileBase64", typeof result === "string" ? result : "");
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setProfileFileName("");
    setErrors({});
    setSuccessId(null);
    setSubmitError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, birthDay: toDdMmYyyy(form.birthDay) }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as SaveSuccessResponse;
        resetForm();
        setSuccessId(data.id);
      } else if (res.status === 400) {
        const data = (await res.json()) as SaveErrorResponse;
        setErrors(data.errors ?? {});
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleSave();
  }

  return (
    <main className="page">
      <div className="card">
        <div className="card-header">
          <span>IT 04-1</span>
          <Link href="/persons" className="header-link">
            View saved records →
          </Link>
        </div>

        <form className="card-body" noValidate onSubmit={handleSubmit}>
          {successId !== null && (
            <div className="success-banner">save data success !!! &nbsp;ID: {successId}</div>
          )}
          {submitError && <div className="form-error">{submitError}</div>}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
              {errors.firstName && <span className="error">{errors.firstName}</span>}
            </div>

            <div className="field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
              {errors.lastName && <span className="error">{errors.lastName}</span>}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="text"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              {errors.phone && <span className="error">{errors.phone}</span>}
            </div>

            <div className="field">
              <label>Profile</label>
              <div className="file-picker-row">
                <label className="file-picker-btn" htmlFor="profile">
                  Browse
                </label>
                <input
                  id="profile"
                  ref={fileInputRef}
                  className="file-input-hidden"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {profileFileName && <span className="file-name">{profileFileName}</span>}
                {form.profileBase64 && (
                  <img className="preview-img" src={form.profileBase64} alt="Profile preview" />
                )}
              </div>
              {errors.profileBase64 && <span className="error">{errors.profileBase64}</span>}
            </div>

            <div className="field">
              <label htmlFor="birthDay">Birth Day</label>
              <input
                id="birthDay"
                type="date"
                min="1900-01-01"
                value={form.birthDay}
                onChange={(e) => updateField("birthDay", e.target.value)}
              />
              {errors.birthDay && <span className="error">{errors.birthDay}</span>}
            </div>

            <div className="field full">
              <label htmlFor="occupation">Occupation</label>
              <select
                id="occupation"
                value={form.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
              >
                <option value="" disabled>
                  -- Select Occupation --
                </option>
                {OCCUPATIONS.map((occupation) => (
                  <option key={occupation} value={occupation}>
                    {occupation}
                  </option>
                ))}
              </select>
              {errors.occupation && <span className="error">{errors.occupation}</span>}
            </div>

            <div className="field full">
              <label>Sex</label>
              <div className="radio-group">
                {SEXES.map((sex) => (
                  <label className="radio-option" key={sex}>
                    <input
                      type="radio"
                      name="sex"
                      value={sex}
                      checked={form.sex === sex}
                      onChange={() => updateField("sex", sex)}
                    />
                    {sex}
                  </label>
                ))}
              </div>
              {errors.sex && <span className="error">{errors.sex}</span>}
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-save" disabled={submitting}>
              Save
            </button>
            <button type="button" className="btn btn-clear" onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
