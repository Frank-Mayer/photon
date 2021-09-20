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
}

/**
 * The router offers high-performance, asynchronous and cached loading of subpages.
 *
 * Standard settings require that your subpages are stored as HTML files in a "content" folder, which is in the root directory of your web server.
 * In addition, only paths of the main domain are routed (this can be overwritten using `getCurrentSubPageName` and `pageTitleToHref`).
 *
 * To do special things after the HTML-injection, you can overwrite `onInject` (this method is empty by default).
 *
 * To link an anchor tag to the Router, add a `route` attribute with the name of the subpage.
 * ```html
 * <a route="about">Linked to /content/about.html</a>
 * <a route="home" href="/">Linked to /content/home.html</a>
 * ```
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

    this.linkAnchorsToRouter(document.body);

    window.addEventListener("popstate", (ev) => this.onPopState(ev));

    this.setPage(this.getCurrentSubPageName() || this.homeSite, true);

    this.preloadSubpages();
  }

  /**
   * Check wether or not to run the router in low data mode
   */
  protected static saveData(): boolean {
    const nav = <INavigator>(<unknown>navigator);

    if (
      "connection" in nav &&
      "saveData" in nav.connection &&
      (nav.connection.saveData ||
        nav.connection.effectiveType === "slow-2g" ||
        nav.connection.effectiveType === "2g" ||
        nav.connection.effectiveType === "3g")
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

    setTimeout(async () => {
      const currentSubPageName = this.getCurrentSubPageName();
      for await (const el of this.sitemap) {
        if (el === currentSubPageName) {
          continue;
        }

        fetch(this.pageTitleToStoreLocation(el), {
          ...this.frame.getRequestOptions(),
          keepalive: false,
        }).then((v) => {
          v.text();
        });
      }
    }, 500);
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
    return location.pathname.substr(1) || this.homeSite;
  }

  /**
   * Converts a given page page title into a path
   * Default subpage location: /content/*.html
   */
  protected pageTitleToStoreLocation(newPage: string): string {
    return `/content/${newPage}.html`;
  }

  /**
   *  Converts a given page title to the associated href attribute value
   */
  protected pageTitleToHref(newPage: string): string {
    return this.homeAsEmpty && newPage === this.homeSite ? "/" : `/${newPage}`;
  }

  /**
   * Load special sub-page content if needed.
   */
  protected onInject(_newPage: string): void {
    return;
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
      if (newPage === this.lastLocation) {
        res();
        return;
      }

      if (!this.sitemap.has(newPage)) {
        console.error(
          `Route '${newPage}' not found in sitemap\nLoading fallback: '${this.fallbackSite}'`
        );

        newPage = this.fallbackSite;
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
            this.onInject(newPage);

            this.lastLocation = newPage;
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
}
