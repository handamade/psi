import { useState } from "react";
import type { Meta, StoryObj } from "storybook";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";
import { Toast } from "./Toast.js";
import { ToastProvider } from "./ToastProvider.js";
import { ToastRegion } from "./ToastRegion.js";
import { useToast } from "./useToast.js";

/** Specimens are deliberately bare `Toast` cards rather than provider-driven
 * ones. Every story becomes a VR baseline, and a self-dismissing toast would
 * make the screenshot depend on timing — `animations: "disabled"` covers the
 * enter animation but not an auto-dismiss timer. In a real app a Toast is
 * always inside a ToastRegion; `InRegion` below shows that shape. */
const meta: Meta<typeof Toast> = { title: "Feedback/Toast", component: Toast };
export default meta;
type Story = StoryObj<typeof Toast>;

export const Neutral: Story = { args: { variant: "neutral", children: "Export queued." } };
export const Success: Story = { args: { variant: "success", children: "Transaction voided." } };
export const Warning: Story = { args: { variant: "warning", children: "Only 3 of 5 rows applied." } };
export const Danger: Story = { args: { variant: "danger", children: "Could not void the transaction." } };

export const WithAction: Story = {
  args: {
    variant: "success",
    children: "Transaction voided.",
    action: (
      <Button variant="ghost" size={32}>
        Undo
      </Button>
    ),
  },
};

export const WithDismiss: Story = {
  args: { variant: "neutral", children: "Export ready.", onDismiss: () => {} },
};

export const WithActionAndDismiss: Story = {
  args: {
    variant: "danger",
    children: "Could not void the transaction.",
    action: (
      <Button variant="ghost" size={32}>
        Retry
      </Button>
    ),
    onDismiss: () => {},
  },
};

export const LongMessage: Story = {
  args: {
    variant: "warning",
    children:
      "Three of the five selected transactions were already reconciled and were skipped; the remaining two were voided.",
    onDismiss: () => {},
  },
};

/** The real shape: toasts live inside a region, which routes them to a polite
 * or assertive live wrapper by variant and pins the stack to a corner on the
 * native top layer. */
export const InRegion: StoryObj<typeof ToastRegion> = {
  render: () => (
    <ToastRegion placement="bottom-end">
      <Toast variant="success" onDismiss={() => {}}>
        Transaction voided.
      </Toast>
      <Toast variant="neutral" onDismiss={() => {}}>
        Export queued.
      </Toast>
      <Toast variant="danger" onDismiss={() => {}}>
        Could not reach the ledger service.
      </Toast>
    </ToastRegion>
  ),
};

/** Drives apps/storybook/vr/toast.interaction.spec.ts — the top-layer claim
 * jsdom cannot make. A toast raised from inside a modal Dialog must stay
 * visible: Dialog uses showModal(), so a region positioned with z-index rather
 * than popover="manual" would paint under the backdrop.
 *
 * `duration` is effectively infinite so the assertions never race an
 * auto-dismiss, and the story's initial state (no toast) is what VR captures —
 * stable, with no timer running. */
function DialogToastDemo() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <div style={{ height: 400 }} data-testid="beneath-region">
        Region band overlays this area.
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Void transaction"
        footer={
          <Button
            variant="danger"
            onClick={() => toast.show({ variant: "success", message: "Transaction voided." })}
          >
            Void
          </Button>
        }
      >
        This cannot be undone.
      </Dialog>
    </>
  );
}

export const RaisedFromDialog: StoryObj<typeof ToastProvider> = {
  render: () => (
    <ToastProvider duration={600000} actionDuration={600000}>
      <DialogToastDemo />
    </ToastProvider>
  ),
};
