import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  alt?: string;
};

export default function ImageLightbox({ open, onOpenChange, src, alt }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-2 bg-transparent shadow-none">
        <DialogHeader />
        <div className="flex items-center justify-center">
          {src ? (
            <img src={src} alt={alt || 'Image'} className="max-h-[80vh] max-w-full rounded-md shadow-lg" />
          ) : (
            <div className="text-muted-foreground">No image</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
