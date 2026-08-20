import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

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

function PayPalEligibilityForm() {
  const [form, setForm] = useState<ClaimForm>(initialForm);
  const [result, setResult] = useState<"eligible" | "not-eligible" | "maybe" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

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

        {result === "eligible" && (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-success" />
              <div>
                <h2 className="text-xl font-semibold text-success-foreground">You may be eligible</h2>
                <p className="mt-2 text-success-foreground/80">
                  Based on your answers, your claim appears to fall within the{" "}
                  <span className="font-semibold">$10,000–$20,000</span> eligibility range and you
                  meet the key requirements. Consider speaking with a qualified attorney or claims
                  specialist to confirm your options and next steps.
                </p>
              </div>
            </div>
          </div>
        )}

        {result === "not-eligible" && (
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

        {result === "maybe" && (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-warning" />
              <div>
                <h2 className="text-xl font-semibold text-warning-foreground">Eligibility is uncertain</h2>
                <p className="mt-2 text-warning-foreground/80">
                  You meet some requirements, but we need more information (such as exact timing or
                  full documentation) to confirm eligibility. Consider gathering additional records
                  and consulting a claims specialist.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          This tool provides a preliminary screening only and is not legal advice. Eligibility is
          determined by the actual claims administrator or a court.
        </p>
      </div>
    </main>
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
