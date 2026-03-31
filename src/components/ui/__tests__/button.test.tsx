import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonVariants } from "@/components/ui/button";

afterEach(() => {
  cleanup();
});

test("renders with children text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
});

test("renders as a button element by default", () => {
  render(<Button>Test</Button>);
  const button = screen.getByRole("button");
  expect(button.tagName).toBe("BUTTON");
});

test("applies data-slot attribute", () => {
  render(<Button>Test</Button>);
  expect(screen.getByRole("button").getAttribute("data-slot")).toBe("button");
});

test("forwards onClick handler", async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  await user.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledOnce();
});

test("supports disabled state", async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  render(<Button disabled onClick={handleClick}>Disabled</Button>);
  const button = screen.getByRole("button");
  expect(button).toHaveProperty("disabled", true);
  await user.click(button);
  expect(handleClick).not.toHaveBeenCalled();
});

test("merges custom className with variant classes", () => {
  render(<Button className="custom-class">Test</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("custom-class");
  expect(button.className).toContain("inline-flex");
});

test("applies default variant classes", () => {
  render(<Button>Default</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("bg-primary");
});

test("applies destructive variant classes", () => {
  render(<Button variant="destructive">Delete</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("bg-destructive");
});

test("applies outline variant classes", () => {
  render(<Button variant="outline">Outline</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("border");
});

test("applies ghost variant classes", () => {
  render(<Button variant="ghost">Ghost</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("hover:bg-accent");
});

test("applies link variant classes", () => {
  render(<Button variant="link">Link</Button>);
  const button = screen.getByRole("button");
  expect(button.className).toContain("underline-offset-4");
});

test("applies sm size classes", () => {
  render(<Button size="sm">Small</Button>);
  expect(screen.getByRole("button").className).toContain("h-8");
});

test("applies lg size classes", () => {
  render(<Button size="lg">Large</Button>);
  expect(screen.getByRole("button").className).toContain("h-10");
});

test("applies icon size classes", () => {
  render(<Button size="icon">X</Button>);
  expect(screen.getByRole("button").className).toContain("size-9");
});

test("renders as child element when asChild is true", () => {
  render(
    <Button asChild>
      <a href="/test">Link Button</a>
    </Button>
  );
  const link = screen.getByRole("link", { name: "Link Button" });
  expect(link.tagName).toBe("A");
  expect(link.getAttribute("href")).toBe("/test");
  expect(link.getAttribute("data-slot")).toBe("button");
});

test("forwards ref to the button element", () => {
  let buttonRef: HTMLButtonElement | null = null;
  render(<Button ref={(el) => { buttonRef = el; }}>Ref</Button>);
  expect(buttonRef).toBeInstanceOf(HTMLButtonElement);
});

test("forwards arbitrary HTML attributes", () => {
  render(<Button aria-label="close" data-testid="btn" type="submit">Go</Button>);
  const button = screen.getByTestId("btn");
  expect(button.getAttribute("aria-label")).toBe("close");
  expect(button.getAttribute("type")).toBe("submit");
});

test("buttonVariants returns class string for given options", () => {
  const classes = buttonVariants({ variant: "secondary", size: "lg" });
  expect(classes).toContain("bg-secondary");
  expect(classes).toContain("h-10");
});
