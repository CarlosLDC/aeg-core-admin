import { type LucideIcon } from "lucide-react";

type PagePlaceholderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="size-7" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-card-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
