"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { studentSchema } from "@/lib/formValidationSchemas";
import { useFormState } from "react-dom";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import z from "zod";

const StudentForm = ({
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
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<
    z.input<typeof studentSchema>,
    any,
    z.output<typeof studentSchema>
  >({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      img: data?.img || "",
      parentId: data?.parentId || "",
    },
  });

  const img = watch("img");

  const [parentSearch, setParentSearch] = useState(
    data?.parent
      ? `${data.parent.name} ${data.parent.surname}`
      : ""
  );

  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [showParentResults, setShowParentResults] = useState(false);

  useEffect(() => {
    const searchParents = async () => {
      if (parentSearch.trim().length < 2) {
        setParentResults([]);
        return;
      }

      setParentLoading(true);

      try {
        const response = await fetch(
          `/api/parents/search?search=${encodeURIComponent(
            parentSearch.trim()
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to search parents");
        }

        const parents = await response.json();
        setParentResults(parents);
      } catch (error) {
        console.error(error);
        setParentResults([]);
      } finally {
        setParentLoading(false);
      }
    };

    const timer = setTimeout(searchParents, 300);

    return () => clearTimeout(timer);
  }, [parentSearch]);

  const [state, formAction] = useFormState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(
        `Student has been ${
          type === "create" ? "created" : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create a new student"
          : "Update the student"}
      </h1>

      <span className="text-sm text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <input
          type="hidden"
          {...register("img")}
        />

        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />

        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>

      <span className="text-sm text-gray-400 font-medium">
        Personal Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <CldUploadWidget
          uploadPreset="school"
          onSuccess={(result, { widget }) => {
            const url = (
              result.info as {
                secure_url: string;
              }
            ).secure_url;

            setValue("img", url);
            widget.close();
          }}
        >
          {({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={() => open()}
              >
                <Image
                  src="/upload.png"
                  alt=""
                  width={20}
                  height={20}
                />

                <span>Upload a photo</span>
              </div>
            );
          }}
        </CldUploadWidget>

        {img && (
          <Image
            src={img}
            alt="preview"
            width={50}
            height={50}
            className="rounded-full object-cover mt-2"
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
          label="Middle Name"
          name="middleName"
          defaultValue={data?.middleName ?? ""}
          register={register}
          error={errors?.middleName}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors?.surname}
        />

        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors?.phone}
        />

        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors?.address}
        />

        <InputField
          label="Blood Type"
          name="bloodType"
          defaultValue={data?.bloodType}
          register={register}
          error={errors?.bloodType}
        />

        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={
            data?.birthday
              ? data.birthday.toISOString().split("T")[0]
              : ""
          }
          register={register}
          error={errors?.birthday}
          type="date"
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4 relative">
          <label className="text-xs text-gray-500">
            Parent
          </label>

          <input
            type="text"
            value={parentSearch}
            onChange={(e) => {
              setParentSearch(e.target.value);
              setShowParentResults(true);
            }}
            onFocus={() =>
              setShowParentResults(true)
            }
            placeholder="Search parent..."
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          />

          <input
            type="hidden"
            {...register("parentId")}
          />

          {parentLoading && (
            <span className="text-xs text-gray-400">
              Searching...
            </span>
          )}

          {showParentResults &&
            parentResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-md max-h-60 overflow-y-auto">
                {parentResults.map((parent) => (
                  <button
                    type="button"
                    key={parent.id}
                    className="w-full text-left p-2 hover:bg-gray-100 text-sm"
                    onClick={() => {
                      setValue(
                        "parentId",
                        parent.id
                      );

                      setParentSearch(
                        `${parent.name} ${parent.surname}`
                      );

                      setShowParentResults(false);
                      setParentResults([]);
                    }}
                  >
                    <div className="font-medium">
                      {parent.name}{" "}
                      {parent.surname}
                    </div>

                    {parent.phone && (
                      <div className="text-xs text-gray-500">
                        {parent.phone}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

          {showParentResults &&
            !parentLoading &&
            parentSearch.trim().length >= 2 &&
            parentResults.length === 0 && (
              <span className="text-xs text-gray-400">
                No parents found.
              </span>
            )}

          {errors.parentId?.message && (
            <p className="text-xs text-red-500">
              {errors.parentId.message.toString()}
            </p>
          )}
        </div>

        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Gender
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          {errors.sex?.message && (
            <p className="text-xs text-red-500">
              {errors.sex.message.toString()}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <span className="text-red-500">
          Something went wrong!
        </span>
      )}

      <button
        type="submit"
        className="bg-badirBlue text-white p-2 rounded-md"
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default StudentForm;