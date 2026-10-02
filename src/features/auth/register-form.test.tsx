import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./register-form";
import { ApiError } from "@/lib/api/errors";

const signUp = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("./auth-provider", () => ({ useAuth: () => ({ register: signUp }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

async function fill(over: Partial<Record<"name" | "email" | "password" | "confirmPassword", string>> = {}) {
  const v = { name: "Ada Lovelace", email: "ada@example.com", password: "Passw0rdOK1", confirmPassword: "Passw0rdOK1", ...over };
  await userEvent.type(screen.getByLabelText("Full name"), v.name);
  await userEvent.type(screen.getByLabelText("Work email"), v.email);
  await userEvent.type(screen.getByLabelText("Password", { exact: true }), v.password);
  await userEvent.type(screen.getByLabelText("Confirm password"), v.confirmPassword);
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterForm", () => {
  beforeEach(() => { signUp.mockReset(); replace.mockReset(); });

  it("blocks submission and explains each invalid field", async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("requires matching passwords", async () => {
    render(<RegisterForm />);
    await fill({ confirmPassword: "Different1" });
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("registers without the confirm field and redirects to /organizations", async () => {
    signUp.mockResolvedValue({});
    render(<RegisterForm />);
    await fill();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations"));
    expect(signUp).toHaveBeenCalledWith({ name: "Ada Lovelace", email: "ada@example.com", password: "Passw0rdOK1" });
  });

  it("shows backend validation messages next to the matching field", async () => {
    signUp.mockRejectedValue(new ApiError(409, "conflict", undefined, [{ path: ["email"], message: "Email is already registered" }]));
    render(<RegisterForm />);
    await fill();
    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
    expect(replace).not.toHaveBeenCalled();
  });

  it("falls back to a general alert for errors with no field details", async () => {
    signUp.mockRejectedValue(new ApiError(500, "Something went wrong on our side. Please try again."));
    render(<RegisterForm />);
    await fill();
    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
