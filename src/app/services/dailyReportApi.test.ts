import { describe, expect, it } from "vitest";
import { reportFormData } from "./dailyReportApi";

describe("report multipart payload", () => {
  it("keeps image, caption, SO and tags under their activity and preserves IDs for edits", () => {
    const photo = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const form = reportFormData({ summary: "", removedAttachmentIds: ["old-image"], tasks: [
      { id: "task-1", description: "First", target: "", status: "Selesai", result: "", taggedUserIds: ["user-a", "user-b"], salesOrderId: "so-1", salesOrderNumber: "SO-001", images: [photo], captions: ["Evidence"] },
      { description: "Second", target: "", status: "Pending", result: "Awaiting documents", taggedUserIds: [] }
    ] });
    expect(form.get("summary")).toBe("");
    expect(form.get("tasks[0].id")).toBe("task-1");
    expect(form.getAll("tasks[0].taggedUserIds")).toEqual(["user-a", "user-b"]);
    expect(form.get("tasks[0].images")).toBe(photo);
    expect(form.get("tasks[0].attachmentCaptions")).toBe("Evidence");
    expect(form.get("tasks[0].salesOrderId")).toBe("so-1");
    expect(form.get("tasks[1].salesOrderId")).toBeNull();
    expect(form.get("tasks[1].images")).toBeNull();
    expect(form.get("removedAttachmentIds")).toBe("old-image");
  });
});
