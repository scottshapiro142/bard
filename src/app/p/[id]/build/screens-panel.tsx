"use client";

import * as React from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FIELD_TYPES,
  SCREEN_STATES,
  addField,
  addScreen,
  removeField,
  removeScreen,
  renameScreen,
  setScreenRoute,
  toggleScreen,
  toggleScreenState,
  updateField,
  type AppSpec,
  type FieldType,
  type ScreenState,
} from "@/lib/loom/app";
import { Term } from "@/components/term";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {blurb}
        </p>
      </div>
      {children}
    </section>
  );
}

export function ScreensPanel({
  app,
  onChange,
  onPreview,
}: {
  app: AppSpec;
  onChange: (next: AppSpec) => void;
  onPreview: (screenId: string) => void;
}) {
  const [openScreen, setOpenScreen] = React.useState<string | null>(null);
  const [openEntity, setOpenEntity] = React.useState<string | null>(null);

  return (
    <div className="space-y-10">
      <Section
        title="Screens"
        blurb={
          <>
            Every page of your app. Switch one off and it disappears from the
            plan, the preview and the code. The <Term>route</Term> is the web
            address people will see.
          </>
        }
      >
        <ul className="space-y-2">
          {app.screens.map((screen) => {
            const open = openScreen === screen.id;
            return (
              <li
                key={screen.id}
                data-screen-row={screen.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  !screen.enabled && "opacity-50",
                  open && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(toggleScreen(app, screen.id))}
                    aria-label={
                      screen.enabled
                        ? `Remove ${screen.name} from the app`
                        : `Put ${screen.name} back in the app`
                    }
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {screen.enabled ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenScreen(open ? null : screen.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">
                      {screen.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {screen.route}
                    </span>
                  </button>

                  {screen.custom ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      yours
                    </Badge>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => onPreview(screen.id)}
                  >
                    Show me
                  </Button>
                </div>

                {open ? (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          What it&apos;s called
                        </span>
                        <Input
                          value={screen.name}
                          data-testid={`screen-name-${screen.id}`}
                          onChange={(e) =>
                            onChange(renameScreen(app, screen.id, e.target.value))
                          }
                          className="mt-1 h-8"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          Web address
                        </span>
                        <Input
                          value={screen.route}
                          onChange={(e) =>
                            onChange(setScreenRoute(app, screen.id, e.target.value))
                          }
                          className="mt-1 h-8 font-mono text-xs"
                        />
                      </label>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Situations this screen has to handle
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {SCREEN_STATES.map((state) => {
                          const on = screen.states.includes(state.value);
                          return (
                            <button
                              key={state.value}
                              type="button"
                              title={state.plain}
                              onClick={() =>
                                onChange(
                                  toggleScreenState(
                                    app,
                                    screen.id,
                                    state.value as ScreenState
                                  )
                                )
                              }
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                                on
                                  ? "border-primary bg-primary/15 text-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {state.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {screen.note.replace(/^./, (c) => c.toUpperCase())}.
                    </p>

                    {screen.custom ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => onChange(removeScreen(app, screen.id))}
                      >
                        <Trash2 className="size-3.5" />
                        Delete this screen
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid="add-screen"
          onClick={() =>
            onChange(
              addScreen(app, {
                name: `New screen ${app.screens.length + 1}`,
                kind: "settings",
              })
            )
          }
        >
          <Plus className="size-3.5" />
          Add a screen
        </Button>
      </Section>

      <Section
        title="What you keep"
        blurb={
          <>
            Each kind of <Term of="record">record</Term> and the{" "}
            <Term of="field">details</Term> you store about it. This is what the
            screens show and what the code stores — change it here and both
            follow.
          </>
        }
      >
        <ul className="space-y-2">
          {app.entities.map((entity) => {
            const open = openEntity === entity.id;
            return (
              <li key={entity.id} className="rounded-xl border p-3">
                <button
                  type="button"
                  data-testid={`entity-${entity.id}`}
                  onClick={() => setOpenEntity(open ? null : entity.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="flex-1 text-sm font-medium">{entity.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {entity.fields.length} things kept
                  </span>
                </button>

                {open ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {entity.fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          value={field.name}
                          disabled={field.system}
                          data-testid={`field-${entity.id}-${field.id}`}
                          onChange={(e) =>
                            onChange(
                              updateField(app, entity.id, field.id, {
                                name: e.target.value,
                              })
                            )
                          }
                          className="h-8 w-40 font-mono text-xs"
                        />
                        <select
                          value={field.type}
                          disabled={field.system}
                          onChange={(e) =>
                            onChange(
                              updateField(app, entity.id, field.id, {
                                type: e.target.value as FieldType,
                              })
                            )
                          }
                          className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-50"
                          aria-label={`What kind of thing ${field.name} is`}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {field.system ? (
                          <span className="text-xs text-muted-foreground">
                            filled in automatically
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onChange(
                                  updateField(app, entity.id, field.id, {
                                    required: !field.required,
                                  })
                                )
                              }
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-xs transition-colors",
                                field.required
                                  ? "border-primary bg-primary/15"
                                  : "text-muted-foreground"
                              )}
                            >
                              {field.required ? "must have" : "optional"}
                            </button>
                            <button
                              type="button"
                              aria-label={`Stop keeping ${field.name}`}
                              onClick={() =>
                                onChange(removeField(app, entity.id, field.id))
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => onChange(addField(app, entity.id))}
                    >
                      <Plus className="size-3.5" />
                      Keep something else
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
