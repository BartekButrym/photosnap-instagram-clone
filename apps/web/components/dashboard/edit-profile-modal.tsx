import { zodResolver } from "@hookform/resolvers/zod";
import {
  UpdateProfileInput,
  updateProfileSchema,
  UserProfile,
} from "@repo/trpc/schemas";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onSave: (updates: UpdateProfileInput) => void;
}

export function EditProfileModal({
  open,
  onOpenChange,
  profile,
  onSave,
}: EditProfileModalProps) {
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
      bio: profile.bio || "",
      website: profile.website || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: profile.name,
      bio: profile.bio || "",
      website: profile.website || "",
    });
  }, [profile, form]);

  const handleSubmit = (data: UpdateProfileInput) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 py-4"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-profile-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="edit-profile-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Your name"
                    maxLength={50}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="bio"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-profile-bio">Bio</FieldLabel>
                  <Textarea
                    {...field}
                    id="edit-profile-bio"
                    aria-invalid={fieldState.invalid}
                    placeholder="Tell people about yourself..."
                    rows={4}
                    maxLength={150}
                  />
                  <FieldDescription>
                    {field.value?.length || 0}/150 characters
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="website"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-profile-website">
                    Website
                  </FieldLabel>
                  <Input
                    {...field}
                    id="edit-profile-website"
                    aria-invalid={fieldState.invalid}
                    type="url"
                    placeholder="https://example.com"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
