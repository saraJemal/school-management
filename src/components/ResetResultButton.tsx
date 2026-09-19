"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetResultSubmission } from "@/lib/actions";

type Props = {
  submissionId: number;
};

export default function ResetResultButton({
  submissionId,
}: Props) {
  const router = useRouter();

  const [resetting, setResetting] =
    useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Reset this submitted result?\n\nThe result will be unlocked and returned to DRAFT so the teacher can correct and resubmit it."
    );

    if (!confirmed) {
      return;
    }

    setResetting(true);

    try {
      const result =
        await resetResultSubmission(
          submissionId
        );

      if (!result.success) {
        window.alert(
          "Unable to reset this result."
        );
        return;
      }

      /*
       * Refresh the server page so the reset
       * submission disappears from the
       * SUBMITTED list.
       */
      router.refresh();
    } catch (error) {
      console.error(
        "RESET RESULT BUTTON ERROR:",
        error
      );

      window.alert(
        "An error occurred while resetting the result."
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={resetting}
      className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {resetting ? "Resetting..." : "Reset"}
    </button>
  );
}

