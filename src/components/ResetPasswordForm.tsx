"use client";

import { PasswordResetState, resetUserPassword } from "@/lib/actions";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";

type UserTable = "admin" | "teacher" | "parent" | "student";

type ResetPasswordFormProps = {
  table: UserTable;
  id: string;
  name: string;
  surname: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const initialState: PasswordResetState = {
  success: false,
  error: false,
  generatedPassword: undefined,
};
const ResetPasswordForm = ({
  table,
  id,
  name,
  surname,
  setOpen,
}: ResetPasswordFormProps) => {
  const [mode, setMode] = useState<"manual" | "generate">("manual");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
  useState(false);

  const [state, formAction] = useFormState(
    resetUserPassword,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      if (state.generatedPassword) {
        toast.success("Password generated successfully.");
      } else {
        toast.success("Password reset successfully.");
        setOpen(false);
      }
    }

    if (state.error) {
      const errorMessages: Record<string, string> = {
        unauthorized: "You are not authorized.",
        "missing-data": "Missing user information.",
        "invalid-user-type": "Invalid user type.",
        "clerk-user-not-found":
          "This user is not connected to Clerk.",
        "password-required": "Password is required.",
        "password-mismatch": "Passwords do not match.",
        "password-too-short":
          "Password must be at least 8 characters.",
      };

      toast.error(
        typeof state.error === "string"
          ? errorMessages[state.error] || "Password reset failed."
          : "Password reset failed."
      );
    }
  }, [state, setOpen]);

  const copyPassword = async () => {
    if (!state.generatedPassword) return;

    await navigator.clipboard.writeText(state.generatedPassword);
    toast.success("Password copied.");
  };
console.log("PASSWORD RESET STATE:", state);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />

      <div>
        <h2 className="text-lg font-semibold">
          Reset Password
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Reset password for{" "}
          <span className="font-semibold text-gray-700">
            {name} {surname}
          </span>
        </p>
      </div>

      {!state.generatedPassword && (
        <>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="passwordMode"
                checked={mode === "manual"}
                onChange={() => setMode("manual")}
              />
              Enter password
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="passwordMode"
                checked={mode === "generate"}
                onChange={() => setMode("generate")}
              />
              Generate password
            </label>
          </div>

          {mode === "manual" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium">
                  New Password
                </label>

                <div className="relative mt-1">
                <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    minLength={8}
                    className="w-full border rounded-md p-2"
                    placeholder="Enter new password"
                />
                </div>

                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                />
                Show password
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Confirm Password
                </label>

                <div className="relative mt-1">
                <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    minLength={8}
                    className="w-full border rounded-md p-2"
                    placeholder="Confirm new password"
                />
                </div>

                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <input
                    type="checkbox"
                    checked={showConfirmPassword}
                    onChange={(e) =>
                    setShowConfirmPassword(e.target.checked)
                    }
                />
                Show password
                </label>
              </div>
            </div>
          )}

          {mode === "generate" && (
            <div className="rounded-md bg-gray-50 border p-4 text-sm text-gray-600">
              A strong password will be generated automatically.
              Make sure to copy it before closing this window.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-gray-300 bg-white text-gray-700 px-5 py-2 rounded-md font-medium hover:bg-gray-100"
            >
                Cancel
            </button>

            <button
                type="submit"
                className="bg-badirBlue text-white px-5 py-2 rounded-md font-medium hover:opacity-90"
            >
                {mode === "generate"
                ? "Generate Password"
                : "Reset Password"}
            </button>
            </div>
        </>
      )}

      {state.generatedPassword && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-700">
              New password
            </p>

            <input
              type="text"
              readOnly
              value={state.generatedPassword}
              className="w-full border rounded-md p-2 mt-2 bg-white font-mono"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={copyPassword}
              className="bg-badirBlue text-white px-5 py-2 rounded-md font-medium hover:opacity-90"
            >
              Copy Password
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-badirBlue text-white px-5 py-2 rounded-md font-medium hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default ResetPasswordForm;