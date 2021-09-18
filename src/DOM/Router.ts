import { DomFrame } from "./DomFrame";
import { INavigator } from "../lib/Navigator";

/**
 * The router offers high-performance, asynchronous and cached loading of subpages.
 *
 * Standard settings require that your subpages are stored as HTML files in a "content" folder, which is in the root directory of your web server.
 * In addition, only paths of the main domain are routed (this can be overwritten using getCurrentSubPageName and pageTitleToHref).
 *
 * To do special things after the HTML-injection, you can overwrite onInject (this method is by default empty).
 *
 * To link an anchor tag to the router, add a "route" attribute with the title of the subpage.
 * ```html
 * <a route="about">About</a>
 * <a route="home" href="/">Home</a>
 * ```
 * If no href attribute is given, it will be added automatically.
 *
 * You can specify the trigger of a routing anchor tag using the trigger attribute:
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

  private sitemap: Set<string>;

  protected readonly homeAsEmpty: boolean;

  protected readonly homeSite: string;
  protected readonly fallbackSite: string;
  protected readonly setWindowTitle?: (newPage: string) => string;

  protected readonly siteNameClassPushElement: HTMLElement;

  /**
   * @param frame Yule.DomFrame to inject the page.
   * @param sitemap Set of all available subpages
   * @param homeSite home page (default is "home").
   * @param homeAsEmpty set this to true if you want the home page to be displayed as website root, false if not (default is true)
   * @param fallbackSite 404 page, default is value of homeSite.
   * @param siteNameClassPushElement the HTMLElement to push the current page title as class (default is document.body).
   * @param setWindowTitle if the title of the tab should be updated with the subpage, enter a formatting string here. Placeholder is {}
   */
  constructor(param: {
    frame: DomFrame;
    sitemap: Set<string>;
    homeSite?: string;
    homeAsEmpty?: boolean;
    fallbackSite?: string;
    siteNameClassPushElement?: HTMLElement;
    setWindowTitle?: (newPage: string) => string;
  }) {
    this.frame = param.frame;
    this.lastLocation = null;
    this.sitemap = param.sitemap;
    this.homeAsEmpty = param.homeAsEmpty ?? true;
    this.setWindowTitle = param.setWindowTitle;

    this.homeSite = param.homeSite ?? "home";
    this.fallbackSite = param.fallbackSite ?? this.homeSite;
    this.siteNameClassPushElement =
      param.siteNameClassPushElement ?? document.body;

    this.linkAnchorsToRouter(document.body);

    this.setPage(this.getCurrentSubPageName() || this.homeSite, true);

    window.addEventListener("popstate", (ev) => this.onPopState(ev));

    this.preloadSubpages();
  }

  protected saveData() {
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
   * Preload all subpages in cache
   */
  protected preloadSubpages() {
    if (this.saveData()) {
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
   * Links every anchor tags to the router
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
   * @param newPage has to be listed in the sitemap.
   * @param setState should the url be set? Default is true.
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
