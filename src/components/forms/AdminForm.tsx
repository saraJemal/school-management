"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction } from "react";
import { adminSchema } from "@/lib/formValidationSchemas";
import {
  createAdmin,
  updateAdmin,
} from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import z from "zod";

const AdminForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof adminSchema>,
    any,
    z.output<typeof adminSchema>
  >({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      id: data?.id ?? "",
      username: data?.username ?? "",
      name: data?.name ?? "",
      surname: data?.surname ?? "",

    },
  });

  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    console.log("ADMIN FORM SUBMIT:", formData);

    try {
      const result =
        type === "create"
          ? await createAdmin(
              {
                success: false,
                error: false,
              },
              formData
            )
          : await updateAdmin(
              {
                success: false,
                error: false,
              },
              formData
            );

      console.log("ADMIN CREATE/UPDATE RESULT:", result);

      if (result.success) {
        toast.success(
          `Admin has been ${
            type === "create" ? "created" : "updated"
          }!`
        );

        setOpen(false);
        router.refresh();
      } else {
        if (result.error === "unauthorized") {
          toast.error(
            "You are not authorized to perform this action."
          );
        } else if (result.error === "admin-id-exists") {
          toast.error("An admin with this ID already exists.");
        } else if (result.error === "admin-not-found") {
          toast.error("Admin was not found.");
        } else if (result.error === "clerk-user-not-linked") {
          toast.error(
            "This admin is not linked to a Clerk user."
          );
        } else {
          toast.error(
            `Failed to ${
              type === "create" ? "create" : "update"
            } admin.`
          );
        }
      }
    } catch (error) {
      console.error("ADMIN FORM ERROR:", error);

      toast.error(
        `Failed to ${
          type === "create" ? "create" : "update"
        } admin.`
      );
    }
  });

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create a new admin"
          : "Update the admin"}
      </h1>

      <span className="text-sm text-gray-400 font-medium">
        Personal Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        {type === "update" && (
            <InputField
              label="Admin ID"
              name="id"
              register={register}
              error={errors?.id}
              defaultValue={data?.id}
              inputProps={{
                readOnly: true,
              }}
            />
          )}

        <InputField
          label="First Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />

        <InputField
          label="Last Name"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors?.surname}
        />
      </div>

      <span className="text-sm text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />

        {type === "create" && (
          <InputField
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors?.password}
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-badirBlue text-white p-2 rounded-md"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AdminForm;