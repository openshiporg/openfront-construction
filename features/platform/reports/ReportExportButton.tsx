'use client';

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkItem } from "../projects/data";
import { buildProjectReportCsv } from "./csv";

export function ReportExportButton({
  projectName,
  generatedAt,
  items,
  currencyCode,
  groups,
}: {
  projectName: string;
  generatedAt: string;
  items: WorkItem[];
  currencyCode: string;
  groups: Array<{ kind: string; totalCount: number }>;
}) {
  function download() {
    const csv = buildProjectReportCsv({ projectName, generatedAt, tool: "Project records", currencyCode, items, groups });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="flex items-center gap-2 print:hidden"><Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / PDF</Button><Button type="button" variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" /> Export CSV</Button></div>;
}
