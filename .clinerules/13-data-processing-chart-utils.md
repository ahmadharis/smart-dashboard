<!--
Rule: R-013
Title: Data Processing and Chart Utilities (XML → JSON → Charts)
Status: enabled
-->

# R-013 — Data Processing and Chart Utilities (XML → JSON → Charts)

Purpose & Scope

- Standardize secure data ingestion and transformation for visualization.
- Use shared utilities for XML parsing, JSON shaping, field inference, and chart preparation to keep charts consistent and performant.

Do

- Use library utilities instead of ad-hoc logic:
  - XML: `sanitizeXML()` then `parseXMLToJSON()` (xxe-safe) from `lib/xml-parser.ts`.
  - Data: `transformDataForCharts()`, `normalizeDate()`, `suggestChartType()` from `lib/data-utils.ts`.
- Preserve field order and semantics from input where necessary for predictable charts.
- Normalize dates and detect numeric/text fields for proper axis configuration.
- Select chart types programmatically based on data structure; allow user override via config.
- Keep dataset replacement behavior consistent with `(tenant_id, dashboard_id, data_type)` unique constraint (see R-010).
- Validate inputs with schemas (`validation.ts`) prior to transformation to avoid downstream type errors.

Don’t

- Parse XML without sanitization (never feed raw XML to the parser).
- Implement custom parsing/transform logic inside components or routes that duplicates utilities.
- Mix data from different tenants/dashboards into one chart without explicit user action.
- Assume date formats; always normalize.

Required Patterns

1. Secure XML → JSON parsing

```ts
import { sanitizeXML } from "@/lib/security";
import { parseXMLToJSON } from "@/lib/xml-parser";

const rawXml = await request.text();
const safeXml = sanitizeXML(rawXml); // prevent XXE
const parsed = await parseXMLToJSON(safeXml);

if (!parsed.success || !parsed.data) {
  return NextResponse.json({ error: "Invalid XML" }, { status: 400 });
}

const rows = parsed.data; // structured JSON array
const recordCount = parsed.recordCount ?? rows.length;
```

2. Data normalization and chart type suggestion

```ts
import { normalizeDate, suggestChartType } from "@/lib/data-utils";

const normalized = rows.map((r) => ({
  ...r,
  // example normalization
  date: normalizeDate(r.date),
}));

const chartType = suggestChartType(normalized);
// "line" | "bar" | "area" | "pie"
```

3. Transform data for Recharts

```ts
import { transformDataForCharts } from "@/lib/data-utils";

type ChartConfig = {
  type: "line" | "bar" | "area" | "pie";
  xAxisKey: string;
  yAxisKey: string;
  title?: string;
  color?: string;
};

const config: ChartConfig = {
  type: chartType,
  xAxisKey: "date",
  yAxisKey: "value",
};

const chartData = transformDataForCharts(normalized, config);
// pass to DataChart component
```

4. Dataset replacement semantics (ingestion)

```ts
// Upsert with (tenant_id, dashboard_id, data_type) uniqueness
await supabase.from("data_files").upsert(
  {
    tenant_id: tenantId,
    dashboard_id: dashboardId,
    data_type: dataType,
    json_data: rows, // parsed JSON
  },
  { onConflict: "tenant_id, dashboard_id, data_type" }
);
```

5. Component usage (pattern)

```tsx
// components/data-chart.tsx should receive prepared data/config
<DataChart
  data={chartData}
  type={config.type}
  xKey={config.xAxisKey}
  yKey={config.yAxisKey}
/>
```

PR Checklist

- [ ] All XML ingestion paths sanitize then parse using `lib/xml-parser.ts`.
- [ ] Data normalization and chart preparation use `lib/data-utils.ts`.
- [ ] Chart type selection is data-driven or explicitly configured.
- [ ] Dataset replacement aligns with unique `(tenant_id, dashboard_id, data_type)` behavior.
- [ ] Inputs validated with schemas before transformation to avoid runtime errors.

References

- Lib: `lib/CLAUDE.md` — `xml-parser.ts` (sanitize/parse/infer), `data-utils.ts` (transform/normalize/suggest), `validation.ts`.
- Root: `CLAUDE.md` — Data Processing Pipeline and Charts.
- Components: `components/CLAUDE.md` — DataChart capabilities and patterns.
- Scripts: `scripts/CLAUDE.md` — `data_files` unique constraint and relationships powering dataset replacement.
