import { TemplateFactory } from "./TemplateFactory";

/**
 * @static Class to controll template access.
 *
 * Templates are stored in /templates/ as html-files.
 *
 * You can specify the Template using the "src" attribute.
 *
 * **Variables**
 *
 * Variables are specified as xml nodes.
 *
 * **Example**
 *
 * ``` html
 * <!-- /templates/button.html -->
 * <div class="{{$var2}}">I am a <i>{{$var1}}</i> <b>{{$var2}}</b> button template! {{new Date().toLocaleDateString()}}</div>
 * ```
 *
 * ``` html
 * <!-- /index.html -->
 * <template src="button">
 *   <var1>very</var1>
 *   <var2>cool</var2>
 * </template>
 * ```
 *
 * ``` html
 * <!-- what /index.html will render -->
 * <div class="cool">I am a <i>very</i> <b>cool</b> button template! 11.1.2022</div>
 * ```
 *
 * No additional setup required!
 *
 * Recursive templates are possible.
 */
export class Templates {
  private constructor() {}

  /**
   * Method to resolve a templates location.
   */
  static location(template: string) {
    return new String(`/templates/${template}.html`);
  }

  private static readonly templateLibrary = new Map<string, TemplateFactory>();

  /**
   * Resolves the templates asynchronously and recursively.
   * @param root Target HTMLElement.
   */
  static async resolveTemplates(
    root: HTMLElement | ShadowRoot = document.body
  ) {
    let templatePlaceholders: Array<HTMLTemplateElement>;

    /**
     * Update the array of template placeholders
     */
    const updateArr = () => {
      return (templatePlaceholders = Array.from(
        root.querySelectorAll(
          "template[src]"
        ) as NodeListOf<HTMLTemplateElement>
      ));
    };

    // Recursively replace all placeholders
    while (updateArr().length > 0) {
      for (const el of templatePlaceholders!) {
        // Template name of the template to replace
        const templateName = el.getAttribute("src")!;

        // Already know this template?
        if (this.templateLibrary.has(templateName)) {
          // Use known template
          this.templateLibrary.get(templateName)!.resolve(el);
        } else {
          // Create and save template
          this.templateLibrary.set(
            templateName,
            (await TemplateFactory.new(this.location(templateName))).resolve(el)
          );
        }
      }
    }
  }
}
