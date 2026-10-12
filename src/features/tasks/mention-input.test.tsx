import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MentionInput } from "./mention-input";

const MEMBERS = [{ id: "1", name: "Ann" }, { id: "2", name: "Ben" }, { id: "3", name: "Bea" }];
function Harness({ initial = "" }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return <><MentionInput label="Comment" value={v} onChange={setV} members={MEMBERS} /><output data-testid="value">{v}</output></>;
}
const box = () => screen.getByRole("combobox", { name: "Comment" });
const value = () => screen.getByTestId("value").textContent;

describe("MentionInput", () => {
  it("shows no suggestions until you type @", async () => {
    render(<Harness />);
    await userEvent.type(box(), "hello ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await userEvent.type(box(), "@");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["@Ann", "@Ben", "@Bea"]);
    expect(box()).toHaveAttribute("aria-expanded", "true");
  });

  it("filters as you type and inserts the chosen name with the keyboard", async () => {
    render(<Harness />);
    await userEvent.type(box(), "ping @be");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["@Ben", "@Bea"]);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(value()).toBe("ping @Bea ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("selects with the mouse, and keeps typing after the inserted name", async () => {
    render(<Harness />);
    await userEvent.type(box(), "@a");
    await userEvent.click(screen.getByRole("option", { name: "@Ann" }));
    await userEvent.type(box(), "thanks");
    expect(value()).toBe("@Ann thanks");
  });

  it("Escape closes the list without changing the text; Enter then behaves normally", async () => {
    render(<Harness />);
    await userEvent.type(box(), "@b");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(value()).toBe("@b");
    await userEvent.keyboard("{Enter}");
    expect(value()).toBe("@b\n");
  });

  it("closes when nothing matches", async () => {
    render(<Harness />);
    await userEvent.type(box(), "@zzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the highlighted option for assistive tech", async () => {
    render(<Harness />);
    await userEvent.type(box(), "@");
    await userEvent.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(box()).toHaveAttribute("aria-activedescendant", options[1].id);
  });
});
