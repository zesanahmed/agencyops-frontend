import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/errors";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
import { FileUploader, type UploadHandlers } from "./file-uploader";

const png = () => new File([new Uint8Array(2048)], "logo.png", { type: "image/png" });
const pdf = () => new File(["x"], "spec.pdf", { type: "application/pdf" });
const input = () => document.getElementById("file-uploader-input") as HTMLInputElement;

beforeEach(() => {
  toast.success.mockReset(); toast.error.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:preview"); URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("FileUploader", () => {
  it("rejects an unsupported or oversized file before any upload", async () => {
    const onUpload = vi.fn();
    render(<FileUploader onUpload={onUpload} />);
    fireEvent.change(input(), { target: { files: [new File(["x"], "a.zip", { type: "application/zip" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/a\.zip.*supported/);
    fireEvent.change(input(), { target: { files: [new File([new Uint8Array(11 * 1024 * 1024)], "big.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 MB/);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("previews an image, uploads on demand, shows progress, then resets and confirms", async () => {
    let handlers!: UploadHandlers; let finish!: () => void;
    const onUpload = vi.fn((_f: File, h: UploadHandlers) => { handlers = h; return new Promise<void>((res) => { finish = res; }); });
    render(<FileUploader onUpload={onUpload} label="Attach a file" />);
    fireEvent.change(input(), { target: { files: [png()] } });
    expect(await screen.findByAltText("Preview of logo.png")).toBeInTheDocument();
    expect(screen.getByText(/PNG · 2\.0 KB/)).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled(); // nothing is sent until the user confirms
    await userEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(onUpload).toHaveBeenCalledTimes(1);
    act(() => handlers.onProgress(0.4));
    expect(screen.getByRole("progressbar", { name: "Uploading logo.png" })).toHaveAttribute("aria-valuenow", "40");
    act(() => handlers.onProgress(1));
    expect(screen.getByText("Processing…")).toBeInTheDocument();
    await act(async () => finish());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("logo.png uploaded"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Attach a file/ })).toBeInTheDocument(); // back to idle
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview"); // preview released
  });

  it("cancel aborts the request, keeps the file selected and allows retrying", async () => {
    let signal!: AbortSignal;
    const onUpload = vi.fn((_f: File, h: UploadHandlers) => { signal = h.signal; return new Promise<void>((_r, rej) => h.signal.addEventListener("abort", () => rej(new DOMException("cancelled", "AbortError")))); });
    render(<FileUploader onUpload={onUpload} />);
    fireEvent.change(input(), { target: { files: [pdf()] } });
    await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(await screen.findByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(screen.getByText("spec.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // a deliberate cancel isn't an error
  });

  it("shows the server's reason on failure and lets the user try again", async () => {
    const onUpload = vi.fn().mockRejectedValue(new ApiError(400, "File content does not match its declared type"));
    render(<FileUploader onUpload={onUpload} />);
    fireEvent.change(input(), { target: { files: [pdf()] } });
    await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("File content does not match its declared type");
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("accepts a dropped file and is inert when disabled", async () => {
    const { unmount } = render(<FileUploader onUpload={vi.fn()} />);
    fireEvent.drop(screen.getByText(/or drop it here/).parentElement!, { dataTransfer: { files: [pdf()] } });
    expect(await screen.findByText("spec.pdf")).toBeInTheDocument();
    unmount();
    render(<FileUploader onUpload={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /Upload a file/ })).toBeDisabled();
    fireEvent.drop(screen.getByText(/or drop it here/).parentElement!, { dataTransfer: { files: [pdf()] } });
    expect(screen.queryByText("spec.pdf")).not.toBeInTheDocument();
  });
});
