
"use client";

import { updateWeeklyProgressParent } from "@/lib/actions";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type Props = {
  reportId: number;
  initialComment: string;
  initialSignature: string | null;
  parentName: string;
};

export default function WeeklyProgressParentEditor({
  reportId,
  initialComment,
  initialSignature,
  parentName,
}: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const [comment, setComment] = useState(initialComment);
  const [signature, setSignature] = useState(
    initialSignature || ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#000";

    if (initialSignature) {
      const image = new window.Image();

      image.onload = () => {
        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );
      };

      image.src = initialSignature;
    }

    setComment(initialComment);
    setSignature(initialSignature || "");
  }, [initialComment, initialSignature]);

  const getPosition = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x:
        ((event.clientX - rect.left) / rect.width) *
        canvas.width,
      y:
        ((event.clientY - rect.top) / rect.height) *
        canvas.height,
    };
  };

  const startDrawing = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;

    const context = canvas.getContext("2d");
    if (!context) return;

    const position = getPosition(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
  };

  const draw = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (!canvas || !drawingRef.current) return;

    event.preventDefault();

    const context = canvas.getContext("2d");
    if (!context) return;

    const position = getPosition(event);
    context.lineTo(position.x, position.y);
    context.stroke();
  };

  const stopDrawing = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;

    drawingRef.current = false;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    setSignature(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const result = await updateWeeklyProgressParent(
        reportId,
        comment,
        signature || null
      );

      if (!result.success) {
        if (result.error === "unauthorized") {
          toast.error(
            "You are not authorized to edit this report."
          );
        } else if (
          result.error === "weekly-progress-not-found"
        ) {
          toast.error("Weekly Progress report not found.");
        } else {
          toast.error("Failed to save your comment and signature.");
        }

        return;
      }

      toast.success("Your comment and signature have been saved.");
      router.refresh();
    } catch {
      toast.error("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border p-4 min-w-0">
      <h3 className="font-semibold mb-3">Parent</h3>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Parent Comment
          </label>

          <textarea
            value={comment}
            onChange={(event) =>
              setComment(event.target.value)
            }
            rows={4}
            maxLength={5000}
            placeholder="Write your comment about your child's progress..."
            className="w-full border border-gray-300 rounded-md p-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Parent Name
          </label>

          <input
            type="text"
            value={parentName || "Your name is taken from your parent account"}
            readOnly
            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Parent Signature
          </label>

          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className="border border-gray-300 rounded-md w-full h-[130px] bg-white touch-none"
            aria-label="Draw your signature"
          />

          <p className="text-xs text-gray-500">
            Draw your signature above using your mouse, finger, or stylus.
          </p>

          <button
            type="button"
            onClick={clearSignature}
            className="text-xs text-red-500 w-fit"
          >
            Clear Signature
          </button>
        </div>

        <div className="flex justify-end border-t pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-badirStar text-black py-2 px-5 rounded-md disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Comment & Signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
