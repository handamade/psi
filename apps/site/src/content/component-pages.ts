export interface ComponentPage {
  slug: string;
  title: string;
  /** members[0] is the page's main export, named after its folder. */
  members: string[];
}

export const componentPages: ComponentPage[] = [
  { slug: "app-shell", title: "AppShell", members: ["AppShell"] },
  { slug: "aspect-ratio", title: "AspectRatio", members: ["AspectRatio"] },
  { slug: "banner", title: "Banner", members: ["Banner"] },
  { slug: "button", title: "Button", members: ["Button"] },
  { slug: "card", title: "Card", members: ["Card"] },
  { slug: "checkbox", title: "Checkbox", members: ["Checkbox"] },
  { slug: "copy-button", title: "CopyButton", members: ["CopyButton"] },
  { slug: "cursor-pagination", title: "CursorPagination", members: ["CursorPagination"] },
  { slug: "description-list", title: "DescriptionList", members: ["DescriptionList", "DescriptionItem"] },
  { slug: "dialog", title: "Dialog", members: ["Dialog"] },
  { slug: "field", title: "Field", members: ["Field"] },
  { slug: "field-stack", title: "FieldStack", members: ["FieldStack"] },
  { slug: "icon-button", title: "IconButton", members: ["IconButton"] },
  { slug: "inline-alert", title: "InlineAlert", members: ["InlineAlert"] },
  { slug: "input", title: "Input", members: ["Input"] },
  { slug: "menu", title: "Menu", members: ["Menu", "MenuItem", "MenuSeparator", "MenuText"] },
  { slug: "nav-bar", title: "NavBar", members: ["NavBar"] },
  { slug: "nav-tree", title: "NavTree", members: ["NavTree", "NavGroup", "NavItem"] },
  { slug: "page-heading", title: "PageHeading", members: ["PageHeading"] },
  { slug: "pagination", title: "Pagination", members: ["Pagination"] },
  { slug: "panel", title: "Panel", members: ["Panel"] },
  { slug: "radio-group", title: "RadioGroup", members: ["RadioGroup", "Radio"] },
  { slug: "select", title: "Select", members: ["Select"] },
  { slug: "skeleton", title: "Skeleton", members: ["Skeleton"] },
  { slug: "skip-link", title: "SkipLink", members: ["SkipLink"] },
  { slug: "stack", title: "Stack", members: ["Stack"] },
  { slug: "switch", title: "Switch", members: ["Switch"] },
  { slug: "table", title: "Table", members: ["Table", "TableHead", "TableBody", "TableRow", "TableHeaderCell", "TableCell", "TableCaption"] },
  { slug: "tabs", title: "Tabs", members: ["Tabs", "TabList", "Tab", "TabPanel"] },
  { slug: "tag", title: "Tag", members: ["Tag"] },
  { slug: "text", title: "Text", members: ["Text"] },
  { slug: "textarea", title: "Textarea", members: ["Textarea"] },
  { slug: "toast", title: "Toast", members: ["Toast", "ToastRegion", "ToastProvider", "Announcement"] },
  { slug: "toolbar", title: "Toolbar", members: ["Toolbar"] },
  { slug: "tooltip", title: "Tooltip", members: ["Tooltip"] },
];
