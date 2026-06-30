import {
  BarChart3,
  Code2,
  FileText,
  FileSpreadsheet,
  AppWindow,
  LineChart,
  Workflow,
  Plug,
  type LucideIcon,
} from "lucide-react";

export interface KindMeta {
  icon: LucideIcon;
  label: string;
  className: string;
}

const MAP: Record<string, KindMeta> = {
  report: {
    icon: FileText,
    label: "Report",
    className: "bg-blue-500/15 text-blue-500",
  },
  dashboard: {
    icon: BarChart3,
    label: "Dashboard",
    className: "bg-violet-500/15 text-violet-500",
  },
  app: {
    icon: AppWindow,
    label: "App",
    className: "bg-emerald-500/15 text-emerald-500",
  },
  code: {
    icon: Code2,
    label: "Code",
    className: "bg-amber-500/15 text-amber-500",
  },
  spreadsheet: {
    icon: FileSpreadsheet,
    label: "Spreadsheet",
    className: "bg-green-500/15 text-green-600 dark:text-green-500",
  },
  analysis: {
    icon: LineChart,
    label: "Analysis",
    className: "bg-cyan-500/15 text-cyan-500",
  },
  automation: {
    icon: Workflow,
    label: "Automation",
    className: "bg-fuchsia-500/15 text-fuchsia-500",
  },
  integration: {
    icon: Plug,
    label: "Integration",
    className: "bg-slate-500/15 text-slate-400",
  },
};

export function kindMeta(kind: string): KindMeta {
  return MAP[kind] ?? MAP.report;
}
