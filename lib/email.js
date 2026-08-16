import { Resend } from "resend";
import { formatCurrency } from "@/lib/calculations";

// Lazily-checked, not lazily-constructed: reading process.env.RESEND_API_KEY
// at module load time (rather than inside sendEmail) means a missing key
// fails the same way whether this module is imported once or a hundred
// times, and it's checked once instead of on every call.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Wrapped so the cron route never has to special-case "Resend isn't set up
// yet" itself - it just calls this and gets back { skipped: true, reason }
// instead of a thrown error, so the notifications feature degrades to a
// silent no-op (not a crash) until RESEND_API_KEY and EMAIL_FROM are both
// configured in the environment.
export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }
  if (!process.env.EMAIL_FROM) {
    return { skipped: true, reason: "EMAIL_FROM is not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) return { skipped: false, error: error.message || String(error) };
    return { skipped: false, id: data?.id };
  } catch (err) {
    return { skipped: false, error: err.message || String(err) };
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// One digest email per user per cron run, not one email per fund - a user
// with 5 funds all due around the same time gets a single email listing
// all of them, not 5 separate emails. dueSoon/underfunded are already-
// filtered arrays (idempotency and cooldown checks happen in the cron
// route before this is called).
//
// @param {Array<{name: string, remaining: number, type: 'due_in_7'|'due_in_1'}>} dueSoon
// @param {Array<{name: string, behindBy: number, expectedByNow: number}>} underfunded
// @param {Array<{name: string}>} [inactive] - funds with nothing logged in
//   a while (see lib/notifications.js's shouldSendInactivityNudge)
export function buildDigestEmail({ dueSoon, underfunded, inactive = [] }) {
  const sections = [];

  if (dueSoon.length > 0) {
    const items = dueSoon
      .map((f) => {
        const when = f.type === "due_in_1" ? "due tomorrow" : "due in 7 days";
        return `<li style="margin-bottom:6px;"><strong>${escapeHtml(f.name)}</strong> — ${when}, ${formatCurrency(
          f.remaining
        )} still needed</li>`;
      })
      .join("");
    sections.push(
      `<h2 style="font-size:15px; margin:20px 0 8px;">Coming up</h2><ul style="padding-left:20px; margin:0;">${items}</ul>`
    );
  }

  if (underfunded.length > 0) {
    const items = underfunded
      .map(
        (f) =>
          `<li style="margin-bottom:6px;"><strong>${escapeHtml(f.name)}</strong> is ${formatCurrency(
            f.behindBy
          )} behind an even pace — you'd have ${formatCurrency(f.expectedByNow)} saved by now on track</li>`
      )
      .join("");
    sections.push(
      `<h2 style="font-size:15px; margin:20px 0 8px;">Behind pace</h2><ul style="padding-left:20px; margin:0;">${items}</ul>`
    );
  }

  if (inactive.length > 0) {
    const items = inactive
      .map((f) => `<li style="margin-bottom:6px;"><strong>${escapeHtml(f.name)}</strong> — nothing logged in a while</li>`)
      .join("");
    sections.push(
      `<h2 style="font-size:15px; margin:20px 0 8px;">Gone quiet</h2><ul style="padding-left:20px; margin:0;">${items}</ul>`
    );
  }

  const subjectBits = [];
  if (dueSoon.length > 0) subjectBits.push(`${dueSoon.length} fund${dueSoon.length === 1 ? "" : "s"} due soon`);
  if (underfunded.length > 0) subjectBits.push(`${underfunded.length} behind pace`);
  if (inactive.length > 0) subjectBits.push(`${inactive.length} gone quiet`);
  const subject = `StayAhead: ${subjectBits.join(", ")}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; color:#2b2420; max-width:480px;">
      <p style="font-size:20px; font-weight:700; color:#d95926; margin:0 0 12px;">StayAhead</p>
      ${sections.join("")}
      <p style="font-size:12px; color:#6b5f54; margin-top:28px; border-top:1px solid #f1e5da; padding-top:12px;">
        You're getting this because email reminders are turned on in your StayAhead settings. You can turn them off any time from the Settings page.
      </p>
    </div>
  `;

  return { subject, html };
}
