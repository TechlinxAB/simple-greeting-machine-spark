
import * as React from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

interface DialogWrapperProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  hideTitle?: boolean;
  hideDescription?: boolean;
  footer?: React.ReactNode;
}

export const DialogWrapper: React.FC<DialogWrapperProps> = ({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  hideTitle = false,
  hideDescription = false,
  footer,
}) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Always include DialogTitle, but optionally hide it visually
  const TitleComponent = hideTitle ? (
    <VisuallyHidden>
      <DialogTitle id={titleId}>{title}</DialogTitle>
    </VisuallyHidden>
  ) : (
    <DialogTitle id={titleId}>{title}</DialogTitle>
  );

  // Always include DialogDescription (even if empty), but optionally hide it visually
  const DescriptionComponent = description ? (
    hideDescription ? (
      <VisuallyHidden>
        <DialogDescription id={descriptionId}>{description}</DialogDescription>
      </VisuallyHidden>
    ) : (
      <DialogDescription id={descriptionId}>{description}</DialogDescription>
    )
  ) : (
    <VisuallyHidden>
      <DialogDescription id={descriptionId}>Dialog content</DialogDescription>
    </VisuallyHidden>
  );

  const dialogContent = (
    <DialogContent 
      className="sm:max-w-md"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogHeader>
        {TitleComponent}
        {DescriptionComponent}
      </DialogHeader>
      {children}
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  );
};
