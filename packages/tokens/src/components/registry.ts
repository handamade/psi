// Component var registry (D81: moved out of scripts/build.ts) — the D46 scope
// gate reads it, in Psi's own build and in a consumer's theme build alike.
import { bannerVars } from "./banner.js";
import { inlineAlertVars } from "./inline-alert.js";
import { linkVars } from "./link.js";
import { buttonVars } from "./button.js";
import { skeletonVars } from "./skeleton.js";
import { skipLinkVars } from "./skip-link.js";
import { navTreeVars } from "./nav-tree.js";
import { appShellVars } from "./app-shell.js";
import { inputVars } from "./input.js";
import { selectVars } from "./select.js";
import { surfaceVars } from "./surface.js";
import { checkboxVars } from "./checkbox.js";
import { comboboxVars } from "./combobox.js";
import { switchVars } from "./switch.js";
import { tableVars } from "./table.js";
import { tagVars } from "./tag.js";
import { toolbarVars } from "./toolbar.js";
import { textVars } from "./text.js";
import { tooltipVars } from "./tooltip.js";
import { cardVars } from "./card.js";
import { controlVars } from "./control.js";
import { countVars } from "./count.js";
import { dialogVars } from "./dialog.js";
import { navbarVars } from "./navbar.js";
import { panelVars } from "./panel.js";
import { pageHeadingVars } from "./page-heading.js";
import { mediaVars } from "./media.js";
import { menuVars } from "./menu.js";
import { popupVars } from "./popup.js";
import { toastVars } from "./toast.js";
import { tabsVars } from "./tabs.js";
import { fieldVars } from "./field.js";
import { descriptionListVars } from "./description-list.js";
import { textareaVars } from "./textarea.js";
import { radioGroupVars } from "./radio-group.js";

export const componentVars: Record<string, Record<string, string>> = {
  "app-shell": appShellVars,
  banner: bannerVars,
  button: buttonVars,
  card: cardVars,
  checkbox: checkboxVars,
  combobox: comboboxVars,
  control: controlVars,
  count: countVars,
  dialog: dialogVars,
  field: fieldVars,
  input: inputVars,
  "inline-alert": inlineAlertVars,
  link: linkVars,
  media: mediaVars,
  menu: menuVars,
  navbar: navbarVars,
  "page-heading": pageHeadingVars,
  panel: panelVars,
  popup: popupVars,
  "radio-group": radioGroupVars,
  select: selectVars,
  skeleton: skeletonVars,
  "nav-tree": navTreeVars,
  "skip-link": skipLinkVars,
  surface: surfaceVars,
  switch: switchVars,
  table: tableVars,
  tabs: tabsVars,
  "description-list": descriptionListVars,
  tag: tagVars,
  textarea: textareaVars,
  toolbar: toolbarVars,
  text: textVars,
  toast: toastVars,
  tooltip: tooltipVars,
};
