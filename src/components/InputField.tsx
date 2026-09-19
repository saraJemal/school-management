"use client";

import { useState } from "react";
import {
  FieldError,
  FieldErrorsImpl,
  Merge,
} from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<{}>>;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  const inputType =
    isPassword && showPassword ? "text" : type;

  return (
    <div
      className={
        hidden
          ? "hidden"
          : "flex flex-col gap-2 w-full md:w-1/4"
      }
    >
      <label className="text-xs text-gray-500">
        {label}
      </label>

      <div className="relative">
        <input
          type={inputType}
          {...register(name)}
          className={`ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full ${
            isPassword ? "pr-10" : ""
          }`}
          {...inputProps}
          defaultValue={defaultValue}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() =>
              setShowPassword((prev) => !prev)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              /* Normal eye - password is visible */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              /* Eye with slash - password is hidden */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error?.message && (
        <p className="text-xs text-red-500">
          {error.message.toString()}
        </p>
      )}
    </div>
  );
};

export default InputField;

