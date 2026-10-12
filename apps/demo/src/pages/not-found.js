// not-found.js — Unknown hash routes.

import { h, pageHeader } from "../ui.js";

export function mount(view) {
  view.append(
    h(
      "div",
      { class: "container not-found" },
      pageHeader({ eyebrow: "404", title: "Page not found", lead: "This address does not match any page of the demo." }),
      h("div", { class: "page-actions" }, h("a", { class: "btn btn-primary", href: "#/" }, "Go home"), h("a", { class: "btn", href: "#/charts" }, "Browse charts")),
    ),
  );
}
