import { ComponentFactory, HTMLComponentElement } from "./ComponentFactory";

/**
 * @static Class to controll component access.
 *
 * Components are stored in /components/ as html-files.
 *
 * You can specify the Component name using the "name" attribute.
 *
 * __Variables__
 *
 * Variables are specified as normal attributes, where the attribute name is the variable name and the attribute value becomes the variable value.
 *
 * innerHTML will be parsed implicitly as content.
 *
 * __Example__
 *
 * ``` html
 * <!-- /components/button.html -->
 * <div>I am a <i content="{var1}"></i> <i content="{content}"></i> button component!</div>
 * ```
 *
 * ``` html
 * <!-- /index.html -->
 * <component name="button" var1="very" >cool</component>
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
   * Function to resolve a components location.
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
  static async resolveComponents(root: HTMLElement = document.body) {
    let componentPlaceholders: Array<HTMLComponentElement>;

    // Update the array of component placeholders
    const updateArr = () => {
      return (componentPlaceholders = Array.from(
        <NodeListOf<HTMLComponentElement>>(
          root.querySelectorAll("component[name]")
        )
      ));
    };

    while (updateArr().length > 0) {
      for (const el of componentPlaceholders!) {
        const componentName = el.getAttribute("name")!;

        if (this.componentLibrary.has(componentName)) {
          this.componentLibrary.get(componentName)!.resolve(el);
        } else {
          this.componentLibrary.set(
            componentName,
            (await ComponentFactory.new(this.location(componentName))).resolve(
              el
            )
          );
        }
      }
    }
  }
}
