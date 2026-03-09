import type { Meta, StoryObj } from "@storybook/nextjs";
import { ProgressBar } from "./progress-bar";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    percentage: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
    isPaused: {
      control: "boolean",
    },
    speed: {
      control: { type: "number", min: 0, max: 100000000, step: 1000000 },
    },
    timeRemaining: {
      control: { type: "number", min: 0, max: 3600, step: 10 },
    },
  },
  args: {
    formatFileSize,
    formatTime,
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Starting: Story = {
  args: {
    percentage: 5,
    isPaused: false,
    speed: 5000000, // 5 MB/s
    timeRemaining: 120,
  },
};

export const QuarterComplete: Story = {
  args: {
    percentage: 25,
    isPaused: false,
    speed: 10000000, // 10 MB/s
    timeRemaining: 90,
  },
};

export const HalfComplete: Story = {
  args: {
    percentage: 50,
    isPaused: false,
    speed: 15000000, // 15 MB/s
    timeRemaining: 60,
  },
};

export const AlmostDone: Story = {
  args: {
    percentage: 85,
    isPaused: false,
    speed: 20000000, // 20 MB/s
    timeRemaining: 15,
  },
};

export const Complete: Story = {
  args: {
    percentage: 100,
    isPaused: false,
    speed: 0,
    timeRemaining: 0,
  },
};

export const Paused: Story = {
  args: {
    percentage: 45,
    isPaused: true,
    speed: 0,
    timeRemaining: 0,
  },
};

export const SlowConnection: Story = {
  args: {
    percentage: 30,
    isPaused: false,
    speed: 500000, // 500 KB/s
    timeRemaining: 300,
  },
};

export const FastConnection: Story = {
  args: {
    percentage: 60,
    isPaused: false,
    speed: 50000000, // 50 MB/s
    timeRemaining: 20,
  },
};

export const VerySlowConnection: Story = {
  args: {
    percentage: 10,
    isPaused: false,
    speed: 100000, // 100 KB/s
    timeRemaining: 1800,
  },
};
