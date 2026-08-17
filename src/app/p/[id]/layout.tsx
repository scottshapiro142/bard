"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useLoom } from "@/lib/loom/store";
import { ProjectShell } from "@/components/project-shell";
import { Button } from "@/components/ui/button";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const { getProject, ready } = useLoom();
  const project = getProject(params.id);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          That project isn&apos;t in this browser. Projects are stored locally.
        </p>
        <Button asChild>
          <Link href="/">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return <ProjectShell project={project}>{children}</ProjectShell>;
}
