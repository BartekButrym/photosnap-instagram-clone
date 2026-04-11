"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import FileUploadArea from "../ui/file-upload-area";
import { getImageUrl } from "@/lib/image";

interface AvatarUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (file: File) => Promise<void>;
  currentAvatar?: string | null;
}

export default function AvatarUpload({
  open,
  onOpenChange,
  onSubmit,
  currentAvatar,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      await onSubmit(selectedFile);
      clearSelection();
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating avatar", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update profile picture</DialogTitle>

          {!preview ? (
            <div>
              {currentAvatar && (
                <div className="flex justify-center">
                  <Image
                    src={getImageUrl(currentAvatar)}
                    alt="Current avatar"
                    width={64}
                    height={64}
                    className="w-24 h-24 rounded-full object-cover border-2 border-muted"
                  />
                </div>
              )}
              <FileUploadArea onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Image
                  src={preview}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={isUploading}
                >
                  Back
                </Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Updating..." : "Update avatar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
