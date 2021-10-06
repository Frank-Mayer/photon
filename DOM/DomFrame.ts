import { Components } from "./Components";

/**
 * Inject code from another html-file into an existing HTMLElement.
 */
export class DomFrame {
  private readonly element: HTMLElement;
  private readonly basePath: string;
  private current?: string = undefined;

  /**
   * Options to be used at the fetch request.
   */
  private requestOptions: RequestInit = {
    cache: "default",
    keepalive: false,
    mode: "same-origin",
  };

  /**
   * @param selector DOM query selector for the target Element
   * @param basePath the root location used to resolve the requested files (default is server root)
   */
  constructor(selector: string, basePath: string = location.origin + "/") {
    const el = <HTMLElement | null>document.querySelector(selector);
    if (!el) {
      throw new Error(`Element ${selector} not found`);
    }
    this.element = el;
    this.basePath = basePath;
  }

  /**
   * Sets the options to be used at the fetch request.
   *
   * for security reasons the `mode` will always be `"same-origin"`
   */
  setRequestOptions(newOptions: RequestInit) {
    this.requestOptions = { ...newOptions, mode: "same-origin" };
  }

  /**
   * returns a copy of the request options used for components and subpages
   */
  getRequestOptions(): RequestInit {
    return { ...this.requestOptions };
  }

  /**
   * Gets the content at the specified path on the server and injects it into the Frame. Returns `true` if successful, `false` if not.
   */
  inject(content: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.getClassList().add("loading");
      if (content === this.current) {
        this.getClassList().remove("loading");
        resolve(true);
        return;
      }

      fetch(this.basePath + content, this.requestOptions)
        .then((resp) => {
          if (resp.ok) {
            resp
              .text()
              .then((html) => {
                this.element.innerHTML = html;
                this.current = content;

                Components.resolveComponents(this.element)
                  .then(() => {
                    this.getClassList().remove("loading");
                    resolve(true);
                  })
                  .catch(() => {
                    this.getClassList().remove("loading");
                    resolve(false);
                  });
                return;
              })
              .catch(() => {
                this.getClassList().remove("loading");
                resolve(false);
              });
          } else {
            this.getClassList().remove("loading");
            resolve(false);
            return;
          }
        })
        .catch(() => {
          this.getClassList().remove("loading");
          resolve(false);
        });
    });
  }

  /**
   * Set the `innerHTML` as string manually
   * >⚠️ Do not call this method with unfiltered user input!
   */
  overwrite(innerHTML: string) {
    this.element.innerHTML = innerHTML;
  }

  /**
   * Clear the frames content.
   */
  clear() {
    this.element.innerHTML = "";
    this.current = undefined;
  }

  /**
   * Scrolls the element's parent container to make shure that the element on which this method is called is visible to the user.
   */
  scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void {
    this.element.scrollIntoView(arg);
    this.element.style;
  }

  /**
   * Returns a `DOMRect` object providing information about the size of an element and its position relative to the viewport.
   */
  getBoundingClientRect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  /**
   * Returns a collection of `DOMRect` objects (`DOMRectList`) that indicate the bounding rectangles for each CSS border box in a client.
   */
  getClientRects(): DOMRectList {
    return this.element.getClientRects();
  }

  /**
   * Returns a reference to the `HTMLElement` that is controlled by this `DomFrame`
   */
  getHtmlRef() {
    return this.element;
  }

  /**
   * Shortcut method which creates a new Animation, applies it to the element, then plays the animation.
   * @param keyframes Either an `Array` of `Keyframe` objects, or a `PropertyIndexedKeyframes` object whose property are arrays of values to iterate over. See [Keyframe Formats](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) for more details.
   * @param options Either an `number` representing the animation's duration (in milliseconds), or an `KeyframeAnimationOptions` object containing one or more timing properties.
   * @returns the created Animation object instance.
   */
  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions
  ) {
    return this.element.animate(keyframes, options);
  }

  /**
   * @returns an `Array` of all `Animation` objects currently in effect whose target elements are descendants of the document. This `Array` includes CSS Animations, CSS Transitions, and Web Animations.
   */
  getAnimations() {
    return this.element.getAnimations();
  }

  /**
   * Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
   * @param options sets listener-specific options. For compatibility this can be a 'boolean', in which case the method behaves exactly as if the value was specified as options's capture.
   */
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions = {
      capture: false,
      once: false,
      passive: true,
    }
  ): void {
    return this.element.addEventListener(type, listener, options);
  }

  /**
   * Returns the `CSSStyleDeclaration`of the HTMLElement this `DomFrame` is controlling.
   */
  getStyle() {
    return this.element.style;
  }

  /**
   * Allows for manipulation of element's class content attribute as a set of whitespace-separated tokens through a `DOMTokenList` object.
   */
  getClassList() {
    return this.element.classList;
  }
}
