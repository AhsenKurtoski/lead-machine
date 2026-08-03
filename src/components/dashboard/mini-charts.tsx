"use client";

// Grafici a ciambella riutilizzabili per la dashboard (categorie, presenza online).
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const DONUT_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#10b981",
  "#ef4444",
  "#14b8a6",
  "#71717a",
];

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
};

export function DonutChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Dati non ancora disponibili.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
