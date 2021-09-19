/**
 * `HTMLElement` used as placeholder for Components
 */
export interface HTMLComponentElement extends HTMLElement {
  tagName: "COMPONENT";
  template: string;
}

/**
 * Stores information about components to simplify the resolving.
 */
export class ComponentFactory {
  private readonly code: string;

  /**
   * Use the ComponentFactory to replace a `HTMLComponentElement`
   */
  resolve(componentEl: HTMLComponentElement) {
    const attrMap = new Map<string, string>();
    for (const attr of componentEl.attributes) {
      attrMap.set(attr.name, attr.value);
    }
    attrMap.set("content", componentEl.innerHTML);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.code;

    // for each element recursively
    for (const el of <NodeListOf<HTMLElement>>wrapper.querySelectorAll("*")) {
      // for each attribute in the elements
      for (const attr of el.attributes) {
        // if value like "{%}"
        if (attr.value.startsWith("{") && attr.value.endsWith("}")) {
          //get requested variable without curly brackets
          const varName = attr.value.substr(1, attr.value.length - 2);

          if (attrMap.has(varName)) {
            // check if requested variable is avaliable
            // special variable content -> innerHTML
            if (attr.name === "content") {
              // This operation is safe! The content is requested using same-origin policy.
              el.innerHTML = attrMap.get(varName)!;
            } else {
              attr.value = attrMap.get(varName)!;
            }
          } else {
            attr.value = "undefined";
          }
        }
      }
    }

    const parent = componentEl.parentElement!;
    parent.insertBefore(wrapper.children[0]!, componentEl);

    componentEl.remove();

    return this;
  }

  private constructor(code: string) {
    this.code = code;
  }

  /**
   * @async
   * @constructor
   */
  static new(location: string): Promise<ComponentFactory> {
    return new Promise((res, rej) => {
      fetch(location)
        .then((resp) => {
          if (!resp.ok) {
            rej(resp);
            return;
          }

          resp
            .text()
            .then((code) => {
              res(new ComponentFactory(code));
            })
            .catch(rej);
        })
        .catch(rej);
    });
  }
}
