"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { useCreateProject } from "./hooks";
import { projectSchema, type ProjectValues } from "./schemas";
import { useRouter } from "next/navigation";

export function CreateProjectDialog() {
  const { organizationId } = useOrg();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const create = useCreateProject(organizationId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectValues>({ resolver: zodResolver(projectSchema) });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button><Plus /> New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader title="New project" description="A project holds sprints, tasks and the people working on them." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          const project = await create.mutateAsync({ name: v.name, description: v.description || undefined }).catch(() => null);
          if (project) { setOpen(false); reset(); router.push(`/organizations/${organizationId}/projects/${project.id}`); }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" placeholder="Website redesign" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="project-description" placeholder="What is this project delivering?" aria-invalid={!!errors.description} {...register("description")} />
            {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
