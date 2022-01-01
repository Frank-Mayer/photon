import { DomFrame } from "./DomFrame";
import { INavigator } from "../lib/Navigator";

type primitive = boolean | number | string;

export type AdditionalOptions = {
  [key: string]:
    | primitive
    | Set<primitive>
    | Map<primitive, primitive>
    | Array<primitive>;
};

/**
 * Options for the [`Router`](https://github.com/Frank-Mayer/photon/wiki/Router) constructor
 */
export interface RouterOptions {
  /** `photon.DomFrame` to inject the page. */
  frame: DomFrame;
  /** Set of all available subpages */
  sitemap: Set<string>;
  /** Home page (default is `"home"`). */
  homeSite?: string;
  /** Set this to `true` if you want the home page to be displayed as website root, `false` if not (default is `true`) */
  homeAsEmpty?: boolean;
  /** 404 page, default is value of `homeSite`. */
  fallbackSite?: string;
  /** The `HTMLElement` to push the current page title as class (default is `document.body`). */
  siteNameClassPushElement?: HTMLElement;
  /** If the title of the tab should be updated with the subpage, put a function in here that returns the title. */
  setWindowTitle?: (newPage: string) => string;
  /** File extension, default is html */
  ext?: "html" | "htm" | "xht" | "xhtml" | "sgml" | "php" | "xml";
}

/**
 * The router offers high-performance, asynchronous and cached loading of subpages.
 *
 * Standard settings require your subpages to be stored as HTML files in a "content" folder, which is in the root directory of your web server.
 * ```
 * 📦 root
 * ┗ 📂 content
 *   ┣ 📜 foo.html
 *   ┣ 📜 bar.html
 *   ┗ 📜 baz.html
 * ```
 *
 * You can change the file extension from html to something else like php using the `ext` setting.
 *
 * In addition, only paths of the main domain are routed (this can be overwritten using `getCurrentSubPageName` and `pageTitleToHref`).
 *
 * To do special things after the HTML-injection, you can subscribe to the `injected` event:
 * ```typescript
 * router.addEventListener("injected", (ev) => {
 *   ...
 * });
 * ```
 *
 * To link an anchor tag to the [`Router`](https://github.com/Frank-Mayer/photon/wiki/Router), add a `route` attribute with the name of the subpage.
 * ```html
 * <a route="about">Linked to /content/about.html</a>
 * <a route="home" href="/">Linked to /content/home.html</a>
 * ```
 *
 * If no `href` attribute is given, it will be added automatically using the `pageTitleToHref` method.
 *
 * You can specify the trigger of a routing anchor tag using the `trigger` attribute:
 * ```html
 * <a route="info" trigger="mouseenter">Info</a>
 * ```
 */
export class Router {
  /**
   * The sub-page Frame.
   */
  protected readonly frame: DomFrame;

  /**
   * Currently loaded path on the Frame.
   */
  protected lastLocation: string | null;

  /**
   * Set of all available subpages
   */
  private sitemap: Set<string>;

  /**
   * Set this to `true` if you want the home page to be displayed as website root, `false` if not (default is `true`)
   */
  protected readonly homeAsEmpty: boolean;

  /**
   * Home page (default is `"home"`).
   */
  protected readonly homeSite: string;

  /**
   * The `HTMLElement` to push the current page title as class (default is `document.body`).
   */
  protected readonly fallbackSite: string;

  /**
   * If the title of the tab should be updated with the subpage, put a function in here that returns the title.
   */
  protected readonly setWindowTitle?: (newPage: string) => string;

  /**
   * the HTMLElement to push the current page title as class (default is document.body).
   */
  protected readonly siteNameClassPushElement: HTMLElement;

  /** File extension, default is html */
  protected readonly ext: string;

  /** Location to store event listeners */
  protected readonly eventMap: Map<
    keyof RouterEventMap,
    Array<[RouterEventListenerCallback, AddEventListenerOptions?]>
  > = new Map();

  /**
   * @param options Router options
   */
  constructor(
    options: RouterOptions,
    additionalOptions: AdditionalOptions = {}
  ) {
    Object.assign(this, additionalOptions);

    this.frame = options.frame;
    this.lastLocation = null;
    this.sitemap = options.sitemap;
    this.homeAsEmpty = options.homeAsEmpty ?? true;
    this.setWindowTitle = options.setWindowTitle;

    this.homeSite = options.homeSite ?? "home";
    this.fallbackSite = options.fallbackSite ?? this.homeSite;
    this.siteNameClassPushElement =
      options.siteNameClassPushElement ?? document.body;

    this.ext = options.ext ?? "html";

    this.linkAnchorsToRouter(document.body);

    window.addEventListener("popstate", (ev) => this.onPopState(ev), {
      capture: false,
      once: false,
      passive: true,
    });

    this.setPage(this.getCurrentSubPageName() || this.homeSite, true).then(
      () => {
        this.preloadSubpages();
      }
    );
  }

  /**
   * Check wether or not to run the router in low data mode
   */
  protected static saveData(): boolean {
    const nav = <INavigator>(<unknown>navigator);

    if (
      "connection" in nav &&
      "saveData" in nav.connection &&
      nav.connection.saveData
    ) {
      return true;
    }
    return false;
  }

  /**
   * Preload all subpages in cache if Router.saveData returns `false`
   */
  protected preloadSubpages() {
    if (Router.saveData()) {
      return;
    }

    for (const el of this.sitemap) {
      this.frame.preload(this.pageTitleToStoreLocation(el));
    }
  }

  /**
   * Links every anchor tags to the Router
   */
  private linkAnchorsToRouter(
    root: HTMLElement
  ): NodeListOf<HTMLAnchorElement> {
    const anchors = <NodeListOf<HTMLAnchorElement>>(
      root.querySelectorAll("a[route]")
    );

    for (const anchor of anchors) {
      const route = anchor.getAttribute("route")!;
      const trigger = anchor.getAttribute("trigger");

      if (!this.sitemap.has(route)) {
        console.warn(`Route '${route}' is not in sitemap\n`, anchor);
        continue;
      }

      if (!anchor.href) {
        anchor.href = this.pageTitleToHref(route);
      }

      anchor.addEventListener(
        trigger ?? "click",
        (ev) => {
          ev.preventDefault();
          this.setPage(route);
        },
        {
          once: false,
          passive: false,
          capture: true,
        }
      );
    }

    return anchors;
  }

  /**
   * Gets the name of the page that should be displayed now
   */
  protected getCurrentSubPageName(): string {
    // "https://example.com/info" -> "info"
    return location.pathname.substring(1) || this.homeSite;
  }

  /**
   * Converts a given page page title into a path.
   *
   * Default subpage location: /content/*.html
   */
  protected pageTitleToStoreLocation(newPage: string): string {
    return `/content/${newPage}.${this.ext}`;
  }

  /**
   *  Converts a given page title to the associated href attribute value
   */
  protected pageTitleToHref(newPage: string): string {
    return this.homeAsEmpty && newPage === this.homeSite ? "/" : `/${newPage}`;
  }

  /**
   * @returns the current subPage name
   */
  getPage() {
    return this.lastLocation || this.getCurrentSubPageName();
  }

  /**
   * Injects the content of a given sub-page into the sub-page Frame.
   * @param newPage has to be listed in the `sitemap`.
   * @param setState should the url be set? Default is `true`.
   */
  setPage(newPage: string, setState = true): Promise<void> {
    return new Promise<void>((res) => {
      let canceled = false;
      this.triggerEvent("inject", true, true, newPage, undefined, () => {
        canceled = true;
        res();
      });

      if (canceled) {
        return;
      }

      if (!this.sitemap.has(newPage)) {
        console.error(
          `Route '${newPage}' not found in sitemap\nLoading fallback: '${this.fallbackSite}'`
        );

        if (setState && this.lastLocation !== newPage) {
          this.pushState(newPage);
        }
        this.frame.inject(this.pageTitleToStoreLocation(this.fallbackSite));
        this.siteNameClassPushElement.classList.remove(...this.sitemap);
        this.linkAnchorsToRouter(this.frame.getHtmlRef());
        this.lastLocation = this.fallbackSite;
        this.triggerEvent("injected", false, setState, this.fallbackSite);
        return;
      }

      this.frame
        .inject(this.pageTitleToStoreLocation(newPage))
        .then((r) => {
          if (r) {
            if (setState && this.lastLocation !== newPage) {
              this.pushState(newPage);
            }

            if (this.setWindowTitle) {
              document.title = this.setWindowTitle(newPage);
            }

            if (this.sitemap.size > 0) {
              this.siteNameClassPushElement.classList.remove(...this.sitemap);
            }

            if (this.sitemap.has(newPage)) {
              this.siteNameClassPushElement.classList.add(newPage);
            }

            this.linkAnchorsToRouter(this.frame.getHtmlRef());

            this.lastLocation = newPage;

            this.triggerEvent("injected", false, setState, newPage);
          }
          res();
        })
        .catch((err) => {
          console.warn(err);

          if (newPage != this.fallbackSite) {
            console.warn("try fallback...");
            this.setPage(this.fallbackSite).catch((err) => {
              console.error(`Fallback site not avaliable!\n${err}`);
            });
          }
          res();
        });
    });
  }

  protected onPopState(ev: PopStateEvent) {
    if ("pageTitle" in ev.state) {
      this.setPage(ev.state.pageTitle, false);
    }
  }

  /**
   * Push a new location to the url without reloading the page.
   */
  protected pushState(newPage: string) {
    if (this.lastLocation === null) {
      this.replaceState(newPage);
    } else {
      window.history.pushState(
        { pageTitle: newPage },
        newPage,
        this.pageTitleToHref(newPage)
      );
    }
  }

  /**
   * Replace the location url without reloading the page.
   */
  protected replaceState(newPage: string) {
    window.history.replaceState(
      { pageTitle: newPage },
      newPage,
      this.pageTitleToHref(newPage)
    );
  }

  /**
   * The addEventListener() method sets up a function that will be called whenever the specified event is delivered to the target.
   */
  public addEventListener<K extends keyof RouterEventMap>(
    type: K,
    listener: RouterEventListenerCallback<K> & RouterEventListenerCallback,
    options?: AddEventListenerOptions
  ): void {
    const evArr = this.eventMap.get(type) as Array<
      [RouterEventListenerCallback, AddEventListenerOptions?]
    >;
    if (evArr) {
      evArr.push([listener, options]);
    } else {
      this.eventMap.set(type, [[listener, options]]);
    }

    if (options && options.signal) {
      options.signal.addEventListener("abort", () => {
        this.removeEventListener(type, listener, options);
      });
    }
  }

  public removeEventListener<K extends keyof RouterEventMap>(
    type: K,
    listener: RouterEventListenerCallback<K>,
    options?: AddEventListenerOptions
  ): void {
    const evArr = this.eventMap.get(type);
    if (evArr) {
      evArr.findIndex((el, i) => {
        if (
          Symbol(el[0].toString()) === Symbol(listener.toString()) &&
          options === el[1]
        ) {
          evArr.splice(i, 1);
        }
      });
    }
  }

  private triggerEvent<K extends keyof RouterEventMap>(
    type: K,
    cancelable: boolean,
    isTrusted: boolean,
    value: RouterEventMap[K]["value"],
    originalEvent?: Event,
    cancel?: Function
  ) {
    const remArr = new Array<number>();

    const evArr = this.eventMap.get(type);
    if (evArr) {
      evArr.forEach((evListener, i) => {
        const passive = evListener[1] ? evListener[1].passive : false;
        evListener[0](
          new RouterEvent(
            this,
            !passive && cancelable,
            isTrusted,
            type,
            value,
            originalEvent,
            cancel
          )
        );

        if (evListener[1] && evListener[1].once) {
          remArr.push(i);
        }
      });

      for (let i = remArr.length - 1; i >= 0; i--) {
        evArr.splice(remArr[i]!, 1);
      }
    }
  }
}

export interface RouterEventMap {
  inject: RouterEvent<string>;
  injected: RouterEvent<string>;
}

type RouterEventListenerCallback<
  E extends keyof RouterEventMap = keyof RouterEventMap
> = (ev: RouterEventMap[E]) => any;

export enum RouterEventPhase {
  none,
  capturingPhase,
  atTarget,
  bubblingPhase,
}

export class RouterEvent<V extends any = undefined> {
  cancel: Function | undefined;
  constructor(
    router: Router,
    cancelable: boolean,
    isTrusted: boolean,
    type: keyof RouterEventMap,
    value: V,
    originalEvent?: Event,
    cancel?: Function
  ) {
    this.cancelable = cancelable;
    this.composed = false;
    this.currentTarget = router;
    this.eventPhase = RouterEventPhase.atTarget;
    this.isTrusted = isTrusted;
    this.target = router;
    this.timeStamp = performance.now();
    this.type = type;
    this.originalEvent = originalEvent;
    this.value = value;
    this.cancel = cancel;
  }

  readonly value: V;

  originalEvent?: Event;

  /**
   * Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method.
   */
  readonly cancelable: boolean;

  /**
   * Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise.
   */
  readonly composed: boolean;

  /**
   * Returns the object whose event listener's callback is currently being invoked.
   */
  readonly currentTarget: Router;

  private _defaultPrevented: boolean = false;

  /**
   * Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise.
   */
  public get defaultPrevented(): boolean {
    return this._defaultPrevented;
  }

  private set defaultPrevented(v: boolean) {
    this._defaultPrevented = v && this.cancelable;
  }

  /**
   * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE.
   */
  readonly eventPhase: number;

  /**
   * Returns true if event was dispatched by the user agent, and false otherwise.
   */
  readonly isTrusted: boolean;

  /**
   * Returns the object to which event is dispatched (its target).
   */
  readonly target: Router;

  /**
   * Returns the event's timestamp as the number of milliseconds measured relative to the time origin.
   */
  readonly timeStamp: DOMHighResTimeStamp;

  /**
   * Returns the type of event, e.g. "click", "hashchange", or "submit".
   */
  readonly type: keyof RouterEventMap;

  /**
   * Returns the invocation target objects of event's path (objects on which listeners will be invoked), except for any nodes in shadow trees of which the shadow root's mode is "closed" that are not reachable from event's currentTarget.
   */
  composedPath(): EventTarget[] {
    if (this.originalEvent) {
      return this.originalEvent.composedPath();
    } else {
      return [];
    }
  }

  /**
   * If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.
   */
  preventDefault(): void {
    if (this.cancelable) {
      if (this.cancel) {
        this.cancel();
      }
      this.defaultPrevented = true;
    } else {
      throw new Error(
        "Unable to preventDefault inside passive event listener invocation."
      );
    }
  }

  /**
   * Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.
   */
  stopImmediatePropagation(): void {
    if (this.originalEvent) {
      this.originalEvent.stopImmediatePropagation();
    }
  }

  /**
   * When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.
   */
  stopPropagation(): void {
    if (this.originalEvent) {
      this.originalEvent.stopPropagation();
    }
  }
  readonly AT_TARGET = RouterEventPhase.atTarget;
  readonly BUBBLING_PHASE = RouterEventPhase.bubblingPhase;
  readonly CAPTURING_PHASE = RouterEventPhase.capturingPhase;
  readonly NONE = RouterEventPhase.none;
}
