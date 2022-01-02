import { ComponentFactory, HTMLComponentElement } from "./ComponentFactory";

/**
 * @static Class to controll component access.
 *
 * Components are stored in /components/ as html-files.
 *
 * You can specify the Component using the "template" attribute.
 *
 * **Variables**
 *
 * Variables are specified as normal attributes, where the attribute name is the variable name and the attribute value becomes the variable value.
 *
 * `innerHTML` will be parsed implicitly as variable `content`.
 *
 * **Example**
 *
 * ``` html
 * <!-- /components/button.html -->
 * <div>I am a <i content="{var1}"></i> <i content="{content}"></i> button component!</div>
 * ```
 *
 * ``` html
 * <!-- /index.html -->
 * <component template="button" var1="very">cool</component>
 * ```
 *
 * ``` html
 * <!-- what /index.html will render -->
 * <div>I am a <i>very</i> <i>cool</i> button component!</div>
 * ```
 *
 * No additional setup required!
 *
 * Recursive components are possible.
 */
export class Components {
  private constructor() {}

  /**
   * Method to resolve a components location.
   */
  static location(component: string) {
    return `/components/${component}.html`;
  }

  private static readonly componentLibrary = new Map<
    string,
    ComponentFactory
  >();

  /**
   * Resolves the components asynchronously and recursively.
   * @param root Target HTMLElement.
   */
  static async resolveComponents(
    root: HTMLElement | ShadowRoot = document.body
  ) {
    let componentPlaceholders: Array<HTMLComponentElement>;

    // Update the array of component placeholders
    const updateArr = () => {
      return (componentPlaceholders = Array.from(
        <NodeListOf<HTMLComponentElement>>(
          root.querySelectorAll("component[template]")
        )
      ));
    };

    // Recursively replace all placeholders
    while (updateArr().length > 0) {
      for (const el of componentPlaceholders!) {
        // Template name of the component to replace
        const templateName = el.getAttribute("template")!;

        // Already know this template?
        if (this.componentLibrary.has(templateName)) {
          // Use known template
          this.componentLibrary.get(templateName)!.resolve(el);
        } else {
          // Create and save template
          this.componentLibrary.set(
            templateName,
            (await ComponentFactory.new(this.location(templateName))).resolve(
              el
            )
          );
        }
      }
    }
  }
}
