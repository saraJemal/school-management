"use client";

import { Dispatch, SetStateAction } from "react";

const MessageView = ({
  data,
  setOpen,
}: {
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const message = data?.message ?? data;

  const senderName = message?.senderAdmin
    ? `${message.senderAdmin.name ?? ""} ${
        message.senderAdmin.surname ?? ""
      }`.trim() || message.senderAdmin.username
    : message?.senderTeacher
    ? `${message.senderTeacher.name ?? ""} ${
        message.senderTeacher.surname ?? ""
      }`.trim()
    : "Unknown sender";

  const createdAt = message?.createdAt
    ? new Date(message.createdAt).toLocaleString()
    : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">View Message</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FROM */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            From
          </label>

          <input
            type="text"
            value={senderName}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>

        {/* DATE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Date
          </label>

          <input
            type="text"
            value={createdAt}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>
      </div>

      {/* SUBJECT */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">
          Subject
        </label>

        <input
          type="text"
          value={message?.subject ?? ""}
          readOnly
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
        />
      </div>

      {/* MESSAGE */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">
          Message
        </label>

        <textarea
          value={message?.body ?? ""}
          readOnly
          rows={10}
          className="ring-[1.5px] ring-gray-300 p-3 rounded-md text-sm bg-gray-100 resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bg-badirBlue text-white py-2 px-6 rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MessageView;