

"use client";

import { updateCommunicationBookParent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type PointerEvent,
  type SetStateAction,
} from "react";
import { toast } from "react-toastify";

type SubjectItem = {
  id: number;
  subjectId: number;
  homeworkInstruction?: string | null;
  asp?: string | null;
  parentSignature?: string | null;
  subject: {
    name: string;
  };
};

type SignatureCanvasProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type CommunicationBookParentFormProps = {
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const SignatureCanvas = ({
  label,
  value,
  onChange,
}: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!value) return;

    const savedImage = new window.Image();

    savedImage.onload = () => {
      const currentCanvas = canvasRef.current;
      const currentContext = currentCanvas?.getContext("2d");

      if (currentCanvas && currentContext) {
        currentContext.clearRect(
          0,
          0,
          currentCanvas.width,
          currentCanvas.height
        );

        currentContext.fillStyle = "#ffffff";
        currentContext.fillRect(
          0,
          0,
          currentCanvas.width,
          currentCanvas.height
        );

        currentContext.drawImage(
          savedImage,
          0,
          0,
          currentCanvas.width,
          currentCanvas.height
        );
      }
    };

    savedImage.src = value;
  }, [value]);

  const getPosition = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;

    const bounds = canvas.getBoundingClientRect();

    return {
      x:
        ((event.clientX - bounds.left) / bounds.width) *
        canvas.width,
      y:
        ((event.clientY - bounds.top) / bounds.height) *
        canvas.height,
    };
  };

  const startDrawing = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getPosition(event);

    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = "#111827";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";

    drawingRef.current = true;
  };

  const draw = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    const { x, y } = getPosition(event);

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = (
    event?: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (!drawingRef.current || !canvas) return;

    drawingRef.current = false;

    if (
      event &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }

    onChange(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawingRef.current = false;
    onChange("");
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={() => {
            if (drawingRef.current) {
              stopDrawing();
            }
          }}
          className="block h-[150px] w-full touch-none"
          style={{ touchAction: "none" }}
          aria-label={label}
        />
      </div>

      <button
        type="button"
        onClick={clearSignature}
        className="w-max rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Clear Signature
      </button>
    </div>
  );
};

const CommunicationBookParentForm = ({
  data,
  setOpen,
}: CommunicationBookParentFormProps) => {
  const router = useRouter();

  const book = data?.communicationBook ?? data ?? {};

  const subjects: SubjectItem[] = book.subjects ?? [];

  const subjectsNeedingSignature = subjects.filter(
    (item) =>
      Boolean(item.homeworkInstruction?.trim()) ||
      Boolean(item.asp?.trim())
  );

  const [parentComment, setParentComment] = useState(
    book.parentComment ?? ""
  );

  const [parentSignature, setParentSignature] = useState(
    book.parentSignature ?? ""
  );

  const [subjectSignatures, setSubjectSignatures] =
    useState<Record<number, string>>(() =>
      Object.fromEntries(
        subjectsNeedingSignature.map((item) => [
          item.subjectId,
          item.parentSignature ?? "",
        ])
      )
    );

  const [saving, setSaving] = useState(false);

  const handleSubjectSignatureChange = (
    subjectId: number,
    signature: string
  ) => {
    setSubjectSignatures((previous) => ({
      ...previous,
      [subjectId]: signature,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!book.id) {
      toast.error("Communication book was not found.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.set("id", String(book.id));
      formData.set("parentComment", parentComment);
      formData.set("parentSignature", parentSignature);

      // Send each eligible subject's current signature,
      // including an empty string when the parent clears it.
      formData.set(
        "subjectSignatures",
        JSON.stringify(
          subjectsNeedingSignature.map((item) => ({
            subjectId: item.subjectId,
            parentSignature:
              subjectSignatures[item.subjectId] ?? "",
          }))
        )
      );

      const result = await updateCommunicationBookParent(
        { success: false, error: false },
        formData
      );

      if (result.success) {
        toast.success("Parent response saved successfully.");
        setOpen(false);
        router.refresh();
      } else if (result.error === "unauthorized") {
        toast.error(
          "You are not authorized to edit this communication book."
        );
      } else if (
        result.error === "communication-book-not-found"
      ) {
        toast.error("Communication book was not found.");
      } else {
        toast.error("Failed to save the parent response.");
      }
    } catch (error) {
      console.error("SAVE PARENT RESPONSE ERROR:", error);
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 p-2"
    >
      <h2 className="text-xl font-semibold">
        Parent Response
      </h2>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="parentComment"
          className="text-sm font-medium"
        >
          Parent Comment
        </label>

        <textarea
          id="parentComment"
          value={parentComment}
          onChange={(event) =>
            setParentComment(event.target.value)
          }
          placeholder="Write your comment here..."
          rows={5}
          className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-badirStar"
        />
      </div>

      <SignatureCanvas
        label="Parent Signature"
        value={parentSignature}
        onChange={setParentSignature}
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">
          Subject Signatures
        </h3>

        <p className="text-sm text-gray-500">
          Sign beside each subject that has homework or ASP.
          Previously saved signatures are loaded automatically.
        </p>

        {subjectsNeedingSignature.length > 0 ? (
          subjectsNeedingSignature.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-gray-200 p-3"
            >
              <h4 className="mb-3 font-medium">
                {item.subject.name}
              </h4>

              {item.homeworkInstruction?.trim() && (
                <p className="mb-2 whitespace-pre-wrap text-sm text-gray-600">
                  <span className="font-medium">
                    Homework / Instruction:
                  </span>{" "}
                  {item.homeworkInstruction}
                </p>
              )}

              {item.asp?.trim() && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-gray-600">
                  <span className="font-medium">ASP:</span>{" "}
                  {item.asp}
                </p>
              )}

              <SignatureCanvas
                label={`Parent Signature — ${item.subject.name}`}
                value={
                  subjectSignatures[item.subjectId] ?? ""
                }
                onChange={(signature) =>
                  handleSubjectSignatureChange(
                    item.subjectId,
                    signature
                  )
                }
              />
            </div>
          ))
        ) : (
          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
            No subjects have homework or ASP recorded for this day.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-badirStar px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Parent Response"}
        </button>
      </div>
    </form>
  );
};

export default CommunicationBookParentForm;
