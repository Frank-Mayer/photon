/**
 * Stores information about templates to simplify the resolving.
 */
export class TemplateFactory {
  private parser = new DOMParser();

  private readonly code: String;

  private static readonly templatePlaceholder = /\{\{[^\}]+\}\}/g;

  private static resolveTemplateString(
    template: String,
    data: Map<string, string | Array<string>>
  ): string {
    return String(
      template.replace(TemplateFactory.templatePlaceholder, (x) =>
        new Function(
          ...Array.from(data.keys()).map((x) => "$" + x),
          `try{return ${x.substring(2, x.length - 2)}}catch(_){return ""}`
        ).call(window, ...data.values())
      )
    );
  }

  /**
   * Use the TemplateFactory to replace a `HTMLTemplateElement`
   */
  resolve(templateEl: HTMLTemplateElement) {
    const attrMap = new Map<string, string | Array<string>>();

    const res = (resEl: Node) => {
      if ("children" in resEl) {
        for (const el of (resEl as Element).children) {
          if (el.children.length > 0) {
            res(el);
          } else {
            const txt = el.nodeValue ?? el.textContent ?? el.innerHTML;
            if (txt) {
              const v = attrMap.get(el.nodeName)!;
              if (v === undefined) {
                attrMap.set(el.nodeName, txt ?? "null");
              } else {
                if (Array.isArray(v)) {
                  v.push(txt);
                  attrMap.set(el.nodeName, v);
                } else {
                  attrMap.set(el.nodeName, [v, txt]);
                }
              }
            }
          }
        }
      }
    };

    const xmlText =
      "<template>" +
      Array.from(templateEl.content.children)
        .map((x) => x.outerHTML)
        .join("") +
      "</template>";

    res(this.parser.parseFromString(xmlText, "text/xml"));

    const wrapper = document.createElement("div");
    wrapper.innerHTML = TemplateFactory.resolveTemplateString(
      this.code,
      attrMap
    );

    const parent = templateEl.parentElement;
    if (parent) {
      for (const ch of Array.from(wrapper.children)) {
        if (ch.tagName === "SCRIPT") {
          ch.remove();
        }

        parent.insertBefore(ch, templateEl);
      }
    }

    templateEl.remove();
    wrapper.remove();

    return this;
  }

  private constructor(code: String) {
    this.code = code;
  }

  /**
   * @async
   * @constructor
   */
  static async new(location: String): Promise<TemplateFactory> {
    const resp = await fetch(location.toString());
    if (!resp.ok) {
      throw new Error(`Could not load template "${location}"`);
    }

    const code = new String(await resp.text());
    return new TemplateFactory(code);
  }
}
