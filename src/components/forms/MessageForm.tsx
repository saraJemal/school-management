"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { messageSchema } from "@/lib/formValidationSchemas";
import { createMessage, updateMessage } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const MessageForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<
    z.input<typeof messageSchema>,
    any,
    z.output<typeof messageSchema>
  >({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      recipientIds:
        data?.recipients
          ?.map((recipient: any) => {
            if (recipient.adminId) {
              return `admin:${recipient.adminId}`;
            }

            if (recipient.teacherId) {
              return `teacher:${recipient.teacherId}`;
            }

            return "";
          })
          .filter(Boolean) ?? [],
      subject: data?.subject ?? "",
      body: data?.body ?? "",
    },
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE
  const [state, formAction] = useFormState(
    type === "create" ? createMessage : updateMessage,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log("MESSAGE FORM DATA:", data);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    console.log("MESSAGE FORM STATE:", state);

    if (state.success) {
      toast(
        `Message has been ${
          type === "create" ? "sent" : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { admins = [], teachers = [] } = relatedData ?? {};

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Compose A Message"
          : "Update The Message"}
      </h1>

      {/* IMPORTANT: update needs the message ID */}
      {data && (
        <InputField
          label="id"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors?.id}
          hidden
        />
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">
          Recipients
        </label>

        <div className="flex flex-col gap-4 border border-gray-300 rounded-md p-4">
          <div>
            <p className="text-sm font-medium mb-2">
              Administrators
            </p>

            <div className="flex flex-col gap-2">
              {admins.map(
                (admin: {
                  id: string;
                  username: string;
                  name: string;
                  surname: string;
                }) => (
                  <label
                    key={`admin:${admin.id}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={`admin:${admin.id}`}
                      {...register("recipientIds")}
                    />

                    <span>
                      {admin.name} {admin.surname} (
                      {admin.username})
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Teachers
            </p>

            <div className="flex flex-col gap-2">
              {teachers.map(
                (teacher: {
                  id: string;
                  name: string;
                  surname: string;
                }) => (
                  <label
                    key={`teacher:${teacher.id}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={`teacher:${teacher.id}`}
                      {...register("recipientIds")}
                    />

                    <span>
                      {teacher.name} {teacher.surname}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>
        </div>

        {errors.recipientIds?.message && (
          <p className="text-xs text-red-500">
            {errors.recipientIds.message.toString()}
          </p>
        )}
      </div>

      <InputField
        label="Subject"
        name="subject"
        defaultValue={data?.subject}
        register={register}
        error={errors?.subject}
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">
          Message
        </label>

        <textarea
          {...register("body")}
          defaultValue={data?.body}
          rows={8}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        />

        {errors.body?.message && (
          <p className="text-xs text-red-500">
            {errors.body.message.toString()}
          </p>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">
          Something went wrong!
        </span>
      )}

      <button className="bg-badirBlue text-white p-2 rounded-md">
        {type === "create" ? "Send" : "Update"}
      </button>
    </form>
  );
};

export default MessageForm;