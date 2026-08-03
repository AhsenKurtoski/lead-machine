import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  module,
  description,
}: {
  title: string;
  module: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary">
            <Construction className="h-10 w-10" />
          </div>
          <div>
            <p className="text-lg font-semibold">{module}</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Questa sezione viene costruita nel prossimo modulo. La struttura, il
              database e la navigazione sono gia pronti.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
