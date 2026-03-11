import type { Meta, StoryObj } from "@storybook/react";
import EmptyState from "./empty-state";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: "text",
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoTransfers: Story = {
  args: {
    icon: "inbox",
    title: "No Transfers Yet",
    description: "Your transfer history will appear here once you send or receive files.",
    actionLabel: "Send a File",
    actionLink: "/app/send",
  },
};

export const NoFiles: Story = {
  args: {
    icon: "folder_open",
    title: "No Files Selected",
    description: "Drag and drop files here or click to browse your computer.",
  },
};

export const NoConnection: Story = {
  args: {
    icon: "wifi_off",
    title: "No Connection",
    description:
      "Unable to connect to the signaling server. Please check your internet connection.",
    actionLabel: "Retry",
    actionLink: "#",
  },
};

export const SearchNoResults: Story = {
  args: {
    icon: "search_off",
    title: "No Results Found",
    description: "We couldn't find any transfers matching your search criteria.",
  },
};

export const ErrorState: Story = {
  args: {
    icon: "error",
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred. Please try again or contact support if the problem persists.",
    actionLabel: "Go Home",
    actionLink: "/",
  },
};

export const ComingSoon: Story = {
  args: {
    icon: "schedule",
    title: "Coming Soon",
    description: "This feature is currently under development and will be available soon.",
  },
};

export const Maintenance: Story = {
  args: {
    icon: "construction",
    title: "Under Maintenance",
    description: "This service is temporarily unavailable due to scheduled maintenance.",
    actionLabel: "Check Status",
    actionLink: "/status",
  },
};
