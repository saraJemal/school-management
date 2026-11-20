"use client";

import { markMessageAsRead } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

type MessageReadButtonProps = {
  messageRecipientId: number;
  isRead: boolean;
};

const MessageReadButton = ({
  messageRecipientId,
  isRead,
}: MessageReadButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRead = async () => {
    if (isRead || loading) return;

    setLoading(true);

    try {
      const result = await markMessageAsRead(
        { success: false, error: false },
        messageRecipientId
      );

      if (result.success) {
        router.refresh();
      } else {
        toast.error("Unable to mark message as read.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRead}
      disabled={isRead || loading}
      className={`text-xs px-3 py-1 rounded-md ${
        isRead
          ? "bg-gray-100 text-gray-500"
          : "bg-badirStar text-black hover:opacity-90"
      }`}
    >
      {loading ? "Opening..." : isRead ? "Read" : "Mark as read"}
    </button>
  );
};

export default MessageReadButton;