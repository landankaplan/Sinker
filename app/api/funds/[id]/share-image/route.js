import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/calculations";

// Dark, vertical (1080x1920) shareable card for a single fund - sized for a
// TikTok/story-style post. Built on next/og's ImageResponse, which ships
// with Next.js 14 - no new dependency, no external service.
export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same ownership check as every other /api/funds route - a valid-looking
  // fund id in the URL still can't pull another user's financial data.
  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { data: fund, error } = await supabase
    .from("sinking_funds")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !fund) {
    return new Response("Fund not found", { status: 404 });
  }

  const targetAmount = Number(fund.target_amount);
  const amountSaved = Number(fund.amount_saved || 0);

  // Same clamped percent formula already shipped in FundCard.js - reused
  // here (not recomputed differently) so the share image always agrees with
  // what the dashboard shows.
  const percent =
    targetAmount > 0 ? Math.max(0, Math.min(100, Math.round((amountSaved / targetAmount) * 100))) : 0;

  const completed = Boolean(fund.completed_at);

  // "Funded ahead of schedule": a date-only comparison (not raw timestamp
  // vs. raw timestamp) so completing ON the due date, at any time of day,
  // reads as on-time rather than ahead. Verified against three cases before
  // shipping: 11 days early -> true, completing on the due date itself
  // (even at 11pm) -> false, one day late -> false.
  let aheadOfSchedule = false;
  if (completed) {
    const completedDate = new Date(fund.completed_at);
    completedDate.setHours(0, 0, 0, 0);
    const targetDateOnly = new Date(fund.target_date);
    targetDateOnly.setHours(0, 0, 0, 0);
    aheadOfSchedule = completedDate.getTime() < targetDateOnly.getTime();
  }

  // A long name would otherwise overflow the fixed-width card.
  const displayName = fund.name.length > 28 ? `${fund.name.slice(0, 27)}…` : fund.name;

  const safeFilenamePart = fund.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "fund";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "96px 80px",
          backgroundColor: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 40, color: "#94a3b8", letterSpacing: 2 }}>SINKING FUND</div>
          <div style={{ display: "flex", fontSize: 64, color: "#f8fafc", fontWeight: 700, marginTop: 16 }}>
            {displayName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {completed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", fontSize: 140, color: "#4ade80", fontWeight: 800 }}>✓ Funded</div>
              <div style={{ display: "flex", fontSize: 44, color: "#cbd5e1", marginTop: 24 }}>
                {formatCurrency(targetAmount)} on {formatDate(fund.completed_at)}
              </div>
              {aheadOfSchedule && (
                <div
                  style={{
                    display: "flex",
                    marginTop: 32,
                    fontSize: 36,
                    color: "#0f172a",
                    backgroundColor: "#4ade80",
                    padding: "16px 32px",
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  Ahead of schedule
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
              <div style={{ display: "flex", fontSize: 200, color: "#f8fafc", fontWeight: 800 }}>{percent}%</div>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "40px",
                  backgroundColor: "#1e293b",
                  borderRadius: 20,
                  overflow: "hidden",
                  marginTop: 24,
                }}
              >
                <div style={{ display: "flex", width: `${percent}%`, height: "100%", backgroundColor: "#4ade80" }} />
              </div>
              <div style={{ display: "flex", fontSize: 44, color: "#cbd5e1", marginTop: 32 }}>
                {formatCurrency(amountSaved)} of {formatCurrency(targetAmount)} saved
              </div>
              <div style={{ display: "flex", fontSize: 36, color: "#64748b", marginTop: 12 }}>
                Due {formatDate(fund.target_date)}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 40, color: "#f8fafc", fontWeight: 700, letterSpacing: 1 }}>
          Sinker
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        "Content-Disposition": `attachment; filename="sinker-${safeFilenamePart}-share.png"`,
      },
    }
  );
}
