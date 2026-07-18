import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Button } from "../Button/Button.js";
import { NavBar } from "./NavBar.js";

const meta: Meta<typeof NavBar> = {
  title: "Components/NavBar",
  component: NavBar,
  decorators: [
    (Story) => (
      <div style={{ height: "200vh" }}>
        <Story />
        <div style={{ padding: "var(--psi-space-24)" }}>
          <p>Scroll down — the bar stays pinned to the top of the viewport.</p>
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i}>Placeholder content block {i + 1}.</p>
          ))}
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NavBar>;

export const Default: Story = {
  args: {
    brand: <a href="/">DK</a>,
    actions: <Button variant="outline">Theme</Button>,
    children: (
      <>
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </>
    ),
  },
};
