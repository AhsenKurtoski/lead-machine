"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#10b981", "#71717a"];

const CHART_MARGIN = { left: 10, right: 20 };
const TOOLTIP_CURSOR = { fill: "hsl(var(--muted) / 0.4)" };
const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
};
const BAR_RADIUS: [number, number, number, number] = [0, 6, 6, 0];

export function FunnelChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={CHART_MARGIN}>
        <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <Tooltip cursor={TOOLTIP_CURSOR} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="value" radius={BAR_RADIUS}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
