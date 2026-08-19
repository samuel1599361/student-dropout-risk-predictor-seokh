import { ExternalLink, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReportDelivery } from "@/lib/report";

export function ReportLinkDialog({
  delivery,
  onClose,
}: {
  delivery: ReportDelivery | null;
  onClose: () => void;
}) {
  const open = !!delivery && !!(delivery.viewUrl || delivery.downloadUrl);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your PDF report is ready</DialogTitle>
          <DialogDescription>
            {delivery?.fileName} — open it to read on screen, or tap Save to store it in your
            device's Downloads / Files. On phones, use "Open in tab" then your browser's share or
            download button if the file does not appear automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {delivery?.downloadUrl && (
            <Button asChild size="lg">
              <a href={delivery.downloadUrl} target="_blank" rel="noreferrer">
                <FileDown className="size-4" />
                Save PDF to device
              </a>
            </Button>
          )}
          {delivery?.viewUrl && (
            <Button asChild variant="outline" size="lg">
              <a href={delivery.viewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open in new tab
              </a>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            This secure link stays valid for 7 days and is visible only to your account.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
