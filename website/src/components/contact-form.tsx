"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "hello@leadmachine.dev";

type FormState = {
  name: string;
  email: string;
  company: string;
  message: string;
};

export function ContactForm({ slug }: { slug: string }) {
  const t = useTranslations("forms");
  const addToast = useToast();

  const [form, setForm] = React.useState<FormState>({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, boolean>>>({});
  const [sending, setSending] = React.useState(false);

  const setField = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, boolean>> = {};
    if (!form.name.trim()) next.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = true;
    if (!form.message.trim()) next.message = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast({ title: t("errorTitle"), description: t("errorDesc"), variant: "destructive" });
      return;
    }

    setSending(true);
    const subject = t(`${slug}.title`);
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.company ? `Company: ${form.company}` : "",
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", company: "", message: "" });
      addToast({
        title: t("successTitle"),
        description: t("successDesc"),
        variant: "success",
      });
    }, 800);
  };

  const inputClass = (invalid?: boolean) =>
    cn("h-11", invalid && "border-destructive focus-visible:ring-destructive");

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${slug}-name`}>{t("name")}</Label>
          <Input
            id={`${slug}-name`}
            value={form.name}
            onChange={setField("name")}
            placeholder={t("name")}
            autoComplete="name"
            className={inputClass(errors.name)}
            aria-invalid={errors.name}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${slug}-email`}>{t("email")}</Label>
          <Input
            id={`${slug}-email`}
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass(errors.email)}
            aria-invalid={errors.email}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${slug}-company`}>{t("company")}</Label>
        <Input
          id={`${slug}-company`}
          value={form.company}
          onChange={setField("company")}
          placeholder={t("company")}
          autoComplete="organization"
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${slug}-message`}>{t("message")}</Label>
        <Textarea
          id={`${slug}-message`}
          value={form.message}
          onChange={setField("message")}
          placeholder={t("message")}
          rows={6}
          className={cn("resize-none", errors.message && "border-destructive focus-visible:ring-destructive")}
          aria-invalid={errors.message}
        />
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={sending}
          className="w-full sm:w-auto"
        >
          {sending ? t("sending") : t(`${slug}.cta`)}
          <Send className="h-4 w-4" />
        </Button>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Mail className="h-3.5 w-3.5" />
          {CONTACT_EMAIL}
        </a>
      </div>
    </form>
  );
}
