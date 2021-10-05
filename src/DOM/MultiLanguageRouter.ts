import { AdditionalOptions, Router, RouterOptions } from "./Router";

/**
 * [ISO-639-1](https://www.iso.org/iso-639-language-codes.html) Language codes
 */
export type language =
  | "ab"
  | "aa"
  | "af"
  | "ak"
  | "sq"
  | "am"
  | "ar"
  | "an"
  | "hy"
  | "as"
  | "av"
  | "ae"
  | "ay"
  | "az"
  | "bm"
  | "ba"
  | "eu"
  | "be"
  | "bn"
  | "bh"
  | "bi"
  | "bs"
  | "br"
  | "bg"
  | "my"
  | "ca"
  | "ch"
  | "ce"
  | "ny"
  | "zh"
  | "cv"
  | "kw"
  | "co"
  | "cr"
  | "hr"
  | "cs"
  | "da"
  | "dv"
  | "nl"
  | "dz"
  | "en"
  | "eo"
  | "et"
  | "ee"
  | "fo"
  | "fj"
  | "fi"
  | "fr"
  | "ff"
  | "gl"
  | "ka"
  | "de"
  | "el"
  | "gn"
  | "gu"
  | "ht"
  | "ha"
  | "he"
  | "hz"
  | "hi"
  | "ho"
  | "hu"
  | "ia"
  | "id"
  | "ie"
  | "ga"
  | "ig"
  | "ik"
  | "io"
  | "is"
  | "it"
  | "iu"
  | "ja"
  | "jv"
  | "kl"
  | "kn"
  | "kr"
  | "ks"
  | "kk"
  | "km"
  | "ki"
  | "rw"
  | "ky"
  | "kv"
  | "kg"
  | "ko"
  | "ku"
  | "kj"
  | "la"
  | "lb"
  | "lg"
  | "li"
  | "ln"
  | "lo"
  | "lt"
  | "lu"
  | "lv"
  | "gv"
  | "mk"
  | "mg"
  | "ms"
  | "ml"
  | "mt"
  | "mi"
  | "mr"
  | "mh"
  | "mn"
  | "na"
  | "nv"
  | "nd"
  | "ne"
  | "ng"
  | "nb"
  | "nn"
  | "no"
  | "ii"
  | "nr"
  | "oc"
  | "oj"
  | "cu"
  | "om"
  | "or"
  | "os"
  | "pa"
  | "pi"
  | "fa"
  | "pl"
  | "ps"
  | "pt"
  | "qu"
  | "rm"
  | "rn"
  | "ro"
  | "ru"
  | "sa"
  | "sc"
  | "sd"
  | "se"
  | "sh"
  | "sm"
  | "sg"
  | "sr"
  | "gd"
  | "sn"
  | "si"
  | "sk"
  | "sl"
  | "so"
  | "st"
  | "es"
  | "su"
  | "sw"
  | "ss"
  | "sv"
  | "ta"
  | "te"
  | "tg"
  | "th"
  | "ti"
  | "bo"
  | "tk"
  | "tl"
  | "tn"
  | "to"
  | "tr"
  | "ts"
  | "tt"
  | "tw"
  | "ty"
  | "ug"
  | "uk"
  | "ur"
  | "uz"
  | "ve"
  | "vi"
  | "vo"
  | "wa"
  | "cy"
  | "wo"
  | "fy"
  | "xh"
  | "yi"
  | "yo"
  | "za"
  | "zu";

/**
 * Options for the `MultiLanguageRouter` constructor
 */
export interface MultiLanguageRouterOptions extends RouterOptions {
  /** `Set` of the supported languages */
  languages: Set<language>;
  /** Fallback language if auto detection failed */
  defaultLanguage: language;
}

/**
 * The `MultiLanguageRouter` is an extension of [`Router`](https://github.com/Frank-Mayer/photon/wiki/Router) that supports multilingual pages.
 *
 * With the default settings, there must be folders for each language in the content folder, which is located in the root directory. Place all subpages as HTML files in each language folder.
 *
 * ```
 * 📦 root
 * ┗ 📂 content
 *   ┣ 📂 en
 *   ┃ ┣ 📜 foo.html
 *   ┃ ┣ 📜 bar.html
 *   ┃ ┗ 📜 baz.html
 *   ┣ 📂 de
 *   ┃ ┣ 📜 foo.html
 *   ┃ ┣ 📜 bar.html
 *   ┃ ┗ 📜 baz.html
 *   ┗ 📂 ja
 *     ┣ 📜 foo.html
 *     ┣ 📜 bar.html
 *     ┗ 📜 baz.html
 * ```
 *
 * Apart from that, `MultiLanguageRouter` behaves exactly like [`Router`](https://github.com/Frank-Mayer/photon/blob/main/src/DOM/Router.ts). Look there for more information.
 */
export class MultiLanguageRouter extends Router {
  /** Current applied language */
  protected lang?: language;
  /** `Array` of the supported languages, first is default */
  protected languages!: Set<language>;
  /** Fallback language if auto detection failed */
  protected defaultLanguage!: language;

  constructor(
    options: MultiLanguageRouterOptions,
    additionalOptions: AdditionalOptions = {}
  ) {
    if (options.languages.size === 0) {
      throw new Error("No languages provided");
    }

    super(options, {
      ...additionalOptions,
      languages: options.languages,
      defaultLanguage: options.defaultLanguage,
    });
  }

  /**
   * Find language to use
   */
  public getLang(): language {
    if (!this.lang) {
      // Split url path
      const path = location.pathname.split("/").filter((val) => {
        return !!val;
      });

      // Get language from url
      const firstPathEl = path.length > 0 ? (path[0] ?? "").toLowerCase() : "";

      // Check language valid
      if (
        firstPathEl.length == 2 &&
        this.languages.has(<language>firstPathEl)
      ) {
        this.updateDocLang(<language>firstPathEl);
      } else {
        // Check if navigator language is provided
        const lcc = navigator.language.toLowerCase();
        for (const l of this.languages) {
          if (lcc.startsWith(l)) {
            return this.updateDocLang(l);
          }
        }

        // Use default language
        this.updateDocLang(this.defaultLanguage);
      }
    }

    return this.lang!;
  }

  protected override getCurrentSubPageName(): string {
    const path = location.pathname.split("/").filter((val) => {
      return !!val;
    });

    return path[path.length - 1] || this.homeSite;
  }

  protected updateDocLang(lang: language): language {
    document.head.parentElement!.lang = lang;
    this.lang = lang;
    return lang;
  }

  protected override pageTitleToHref(newPage: string): string {
    return `/${this.getLang()}/${newPage}`;
  }

  /**
   * Converts a given page page title into a path.
   *
   * Default subpage location: /content/{language}/*.html
   */
  protected override pageTitleToStoreLocation(newPage: string): string {
    return `content/${this.getLang()}/${newPage}.html`;
  }
}
