import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/calculations";

// formatDate() itself doesn't guard against an empty/falsy input - passing
// "" (used below for a fund with no completed_at) through `new Date("")`
// produces the literal string "Invalid Date" rather than a real error,
// which would otherwise show up as garbage in the "Completed" column for
// every still-active fund. This keeps the CSV blank for those, matching
// every other empty-cell convention in this export.
function formatDateForCsv(value) {
  return value ? formatDate(value) : "";
}

// Wraps a CSV field in double quotes and escapes any internal double
// quotes by doubling them (the standard CSV escaping rule) - needed
// because a fund name is free text and could contain a comma, quote, or
// newline (e.g. someone naming a fund `Trip to "Vegas", baby`).
//
// Also guards against CSV/formula injection (CWE-1236): a fund name is
// unrestricted free text (see supabase/schema.sql - no character
// restriction on sinking_funds.name), so a name starting with =, +, -, or
// @ would otherwise be interpreted as a formula by Excel/Google Sheets
// when the exported file is opened - e.g. a fund named
// `=HYPERLINK("http://evil.example","click")` would render as a live,
// clickable formula instead of inert text. Prefixing with a leading
// apostrophe (a standard escape both Excel and Sheets treat as "force
// text") neutralizes this without changing how the value reads to a human.
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@"];
function csvField(value) {
  let str = value === null || value === undefined ? "" : String(value);
  if (FORMULA_TRIGGER_CHARS.includes(str[0])) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function csvRow(values) {
  return values.map(csvField).join(",") + "\r\n";
}

// Exports every fund and its full contribution history as one flat CSV -
// one row per contribution, plus one row for any fund with zero
// contributions logged so it isn't silently dropped from the export. This
// is a plain data export (not a backup/restore format): it's meant to be
// opened in a spreadsheet, not re-imported into the app.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: funds, error: fundsError }, { data: contributions, error: contributionsError }] =
    await Promise.all([
      supabase
        .from("sinking_funds")
        .select("*")
        .eq("user_id", user.id)
        .order("target_date", { ascending: true }),
      supabase
        .from("fund_contributions")
        .select("fund_id, amount, contributed_at")
        .eq("user_id", user.id)
        .order("contributed_at", { ascending: true }),
    ]);

  if (fundsError) return NextResponse.json({ error: fundsError.message }, { status: 500 });
  if (contributionsError) return NextResponse.json({ error: contributionsError.message }, { status: 500 });

  // Contributions whose fund was later deleted have fund_id = null (see
  // supabase/schema.sql's on-delete-set-null migration) - they're grouped
  // under the "null" key here so they can be emitted as their own rows
  // below, instead of silently vanishing from the export. Without this,
  // the CSV's totals would undercount vs. what the Insights tab shows,
  // since Insights counts all of a user's contributions regardless of
  // whether their fund still exists, but this loop used to only ever walk
  // the CURRENT funds list.
  const contributionsByFund = (contributions || []).reduce((byFund, c) => {
    const key = c.fund_id === null ? "orphaned" : c.fund_id;
    if (!byFund[key]) byFund[key] = [];
    byFund[key].push(c);
    return byFund;
  }, {});

  const header = csvRow([
    "Fund name",
    "Target amount",
    "Target date",
    "Status",
    "Total saved",
    "Created",
    "Completed",
    "Contribution amount",
    "Contribution date",
  ]);

  let body = "";
  for (const fund of funds || []) {
    const status = fund.completed_at ? "Completed" : "Active";
    const fundContributions = contributionsByFund[fund.id] || [];

    if (fundContributions.length === 0) {
      // No contributions logged for this fund yet - still emit one row so
      // the fund itself shows up in the export.
      body += csvRow([
        fund.name,
        fund.target_amount,
        formatDateForCsv(fund.target_date),
        status,
        fund.amount_saved || 0,
        formatDateForCsv(fund.created_at),
        formatDateForCsv(fund.completed_at),
        "",
        "",
      ]);
    } else {
      for (const c of fundContributions) {
        body += csvRow([
          fund.name,
          fund.target_amount,
          formatDateForCsv(fund.target_date),
          status,
          fund.amount_saved || 0,
          formatDateForCsv(fund.created_at),
          formatDateForCsv(fund.completed_at),
          c.amount,
          formatDateForCsv(c.contributed_at),
        ]);
      }
    }
  }

  // Contributions logged against a fund that's since been deleted. These
  // still count toward your lifetime saved total (that's the whole point
  // of the on-delete-set-null migration - deleting a fund shouldn't erase
  // the money you actually saved), so they get their own rows here rather
  // than being left out of the export. There's no fund left to pull
  // target/status/created/completed info from, so those columns are blank
  // for these rows - only the fund name column gets a placeholder, since
  // leaving it blank too would make these rows look like a parsing error
  // rather than an intentional "no fund" case.
  const orphanedContributions = contributionsByFund.orphaned || [];
  for (const c of orphanedContributions) {
    body += csvRow([
      "(deleted fund)",
      "",
      "",
      "",
      "",
      "",
      "",
      c.amount,
      formatDateForCsv(c.contributed_at),
    ]);
  }

  const csv = header + body;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stayahead-export-${today}.csv"`,
    },
  });
}
