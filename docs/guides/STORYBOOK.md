# Storybook Guide

Storybook is a component playground for developing and testing UI components in isolation.

## Quick Start

```bash
# Start Storybook development server
npm run storybook

# Build static Storybook site
npm run build-storybook
```

Storybook runs at: http://localhost:6006

## What is Storybook?

Storybook lets you develop and test components without running the entire Next.js app. Instead of navigating through your app to see a component, you can:

1. Open Storybook
2. Click on a component in the sidebar
3. See all its variations instantly
4. Interact with it in real-time
5. Change props using controls

## Example: Button Component

Instead of creating a test page to see all button variants, Storybook shows them all:

- Default button
- Destructive button
- Outline button
- Small, medium, large sizes
- Disabled state
- Loading state

All in one place, with interactive controls to change props on the fly.

## Creating Stories

Stories are examples of how a component looks with different props.

### Basic Story Structure

```typescript
// MyComponent.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta = {
  title: "Components/MyComponent", // Sidebar location
  component: MyComponent,
  parameters: {
    layout: "centered", // or 'padded', 'fullscreen'
  },
  tags: ["autodocs"], // Auto-generate documentation
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each export is a "story" (a component example)
export const Default: Story = {
  args: {
    title: "Hello World",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    title: "Secondary Button",
    variant: "secondary",
  },
};
```

### Story File Naming

- Place stories next to components: `MyComponent.stories.tsx`
- Storybook auto-discovers files matching: `**/*.stories.@(js|jsx|ts|tsx)`

## Existing Stories

We've created example stories for:

1. **Button** (`components/ui/button.stories.tsx`)
   - All variants: default, destructive, outline, secondary, ghost, link
   - All sizes: sm, default, lg, icon
   - States: disabled, loading

2. **ProgressBar** (`components/progress-bar.stories.tsx`)
   - Different progress percentages
   - Paused state
   - Various connection speeds
   - Time remaining variations

3. **EmptyState** (`components/empty-state.stories.tsx`)
   - No transfers
   - No files
   - No connection
   - Error states
   - Coming soon

## Adding More Stories

To add stories for other components:

1. Create a `.stories.tsx` file next to your component
2. Import the component
3. Define the meta configuration
4. Export story variations

Example for a new component:

```typescript
// apps/web/src/components/MyNewComponent.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyNewComponent } from "./MyNewComponent";

const meta = {
  title: "Components/MyNewComponent",
  component: MyNewComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof MyNewComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Your component props here
  },
};
```

## Addons

Storybook comes with useful addons:

### 1. Controls

- Interactively change component props
- Located in the bottom panel
- Automatically generated from TypeScript types

### 2. Docs

- Auto-generated documentation from your code
- Shows prop types, descriptions, default values
- Click "Docs" tab to see

### 3. Accessibility (a11y)

- Checks for accessibility issues
- Shows violations in the "Accessibility" panel
- Helps ensure WCAG compliance

### 4. Viewport

- Test components at different screen sizes
- Mobile, tablet, desktop presets
- Custom viewport sizes

## Best Practices

### 1. Create Stories for All States

```typescript
export const Default: Story = {
  /* ... */
};
export const Loading: Story = {
  /* ... */
};
export const Error: Story = {
  /* ... */
};
export const Empty: Story = {
  /* ... */
};
export const Disabled: Story = {
  /* ... */
};
```

### 2. Use Realistic Data

```typescript
export const WithRealData: Story = {
  args: {
    user: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
  },
};
```

### 3. Document Edge Cases

```typescript
export const VeryLongText: Story = {
  args: {
    title: "This is a very long title that might cause layout issues if not handled properly",
  },
};

export const EmptyData: Story = {
  args: {
    items: [],
  },
};
```

### 4. Group Related Stories

```typescript
const meta = {
  title: "Components/Transfer/ProgressBar", // Creates nested structure
  // ...
};
```

## Styling

Storybook is configured to use your Tailwind CSS styles:

- `globals.css` is imported in `.storybook/preview.ts`
- Dark background matches your app theme
- All Tailwind classes work as expected

## Deployment

To deploy Storybook as a static site:

```bash
# Build static Storybook
npm run build-storybook

# Output is in storybook-static/
# Deploy to Vercel, Netlify, or any static host
```

## Tips

1. **Fast Development**: Make changes to components and see updates instantly in Storybook
2. **Visual Testing**: Compare component variations side-by-side
3. **Documentation**: Share Storybook with designers and stakeholders
4. **Isolated Testing**: Test components without complex app state
5. **Design System**: Build a catalog of reusable components

## Troubleshooting

### Storybook won't start

```bash
# Clear cache and reinstall
rm -rf node_modules .next storybook-static
npm install
npm run storybook
```

### Component not showing

- Check file naming: `*.stories.tsx`
- Check file location: Must be in `src/` directory
- Check meta export: Must have `export default meta`

### Styles not working

- Verify `globals.css` is imported in `.storybook/preview.ts`
- Check Tailwind config includes Storybook paths
- Restart Storybook after config changes

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js Integration](https://storybook.js.org/docs/get-started/nextjs)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [Addons](https://storybook.js.org/addons)

---

**Happy component development!** 🎨
