// ==MiruExtension==
// @name         DramaCool
// @version      v0.0.8
// @author       OshekharO
// @lang         en
// @license      MIT
// @icon         https://proxy.techzbots1.workers.dev/?u=https://dramacool.bg/frontend/images/mobi/logo.png
// @package      dramacool.pa
// @type         bangumi
// @webSite      https://dramacool.com.bz
// ==/MiruExtension==

export default class extends Extension {
  constructor() {
    super();
    this.baseUrl = "https://dramacool.com.bz";
    this.proxyUrl = "https://proxy.techzbots1.workers.dev/?u=";
    this.useProxy = true; // Enable proxy by default for mobile compatibility
    this.settingsLoaded = false;
    this.defaultSettings = {
      useProxy: true,
      proxyUrl: "https://proxy.techzbots1.workers.dev/?u="
    };
  }

  async req(url) {
    // Use proxy for better mobile compatibility and CORS bypass
    const finalUrl = this.useProxy ? this.proxyUrl + encodeURIComponent(url) : url;
    return this.request(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
  }

  async load() {
    this.registerSetting({
      title: "Use Proxy",
      key: "useProxy",
      type: "switch",
      description: "Enable proxy for better mobile access and CORS bypass",
      defaultValue: true,
    });
    
    this.registerSetting({
      title: "Proxy URL",
      key: "proxyUrl", 
      type: "input",
      description: "Proxy service URL (change only if needed)",
      defaultValue: "https://proxy.techzbots1.workers.dev/?u=",
    });
  }

  // Load settings once and cache them to avoid repeated getSetting calls
  async loadSettings() {
    if (this.settingsLoaded) {
      return;
    }
    
    try {
      // Try to load settings, but don't fail if they don't exist
      try {
        const useProxySetting = await this.getSetting("useProxy");
        if (useProxySetting !== null && useProxySetting !== undefined) {
          this.useProxy = useProxySetting;
        }
      } catch (e) {
        console.warn("Using default useProxy setting");
        this.useProxy = this.defaultSettings.useProxy;
      }
      
      try {
        const proxyUrlSetting = await this.getSetting("proxyUrl");
        if (proxyUrlSetting !== null && proxyUrlSetting !== undefined) {
          this.proxyUrl = proxyUrlSetting;
        }
      } catch (e) {
        console.warn("Using default proxyUrl setting");
        this.proxyUrl = this.defaultSettings.proxyUrl;
      }
      
      this.settingsLoaded = true;
      console.log(`Settings loaded: useProxy=${this.useProxy}, proxyUrl=${this.proxyUrl}`);
    } catch (error) {
      console.warn("Failed to load settings, using defaults:", error);
      this.useProxy = this.defaultSettings.useProxy;
      this.proxyUrl = this.defaultSettings.proxyUrl;
      this.settingsLoaded = true;
    }
  }

  async createFilter() {
    // Return empty filter as DramaCool doesn't need complex filtering
    return {};
  }

   async latest() {
    await this.loadSettings();
    const res = await this.req(`${this.baseUrl}/all-most-popular-drama`);
    const bsxList = await this.querySelectorAll(res, "ul.switch-block.list-episode-item > li");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "h3").text;
      const cover = await this.querySelector(html, "img").getAttributeText("data-original");
      novel.push({
        title,
        url: url.replace("/drama-detail/", ""),
        cover,
      });
    }
    return novel;
  }

  async detail(url) {
    try {
      await this.loadSettings();
      const detailUrl = `${this.baseUrl}/drama-detail/${url}`;
      const res = await this.req(detailUrl);

      if (res.includes("Attempt to read property") || res.includes("error")) {
        console.warn(`Drama detail page error for ${url}, trying alternative approach`);
        return {
          title: url.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          cover: "",
          desc: "Drama details are currently unavailable. This may be a temporary issue with the website.",
          episodes: [],
        };
      }

      const titleElement = await this.querySelector(res, "h1") ||
        await this.querySelector(res, ".drama-title") ||
        await this.querySelector(res, "title");

      const descElement = await this.querySelector(res, ".info") ||
        await this.querySelector(res, ".description") ||
        await this.querySelector(res, ".synopsis") ||
        await this.querySelector(res, ".summary");

      const coverElement = await this.querySelector(res, ".img > img") ||
        await this.querySelector(res, ".drama-poster img") ||
        await this.querySelector(res, ".poster img") ||
        await this.querySelector(res, "img[alt*='poster']");

      const episodeElements = await this.querySelectorAll(res, "ul.all-episode > li > a");

      const episodes = [];
      if (episodeElements.length > 0) {
        const episodeUrls = [];
        for (const epElement of episodeElements) {
          const epHtml = epElement.content;
          const epUrl = await this.getAttributeText(epHtml, "a", "href");
          const epName = (await this.querySelector(epHtml, "h3.title"))?.text;

          if (epUrl && epName) {
            const epMatch = epUrl.match(/video-watch\/(.+)/);
            if (epMatch) {
              episodeUrls.push({
                name: epName.trim(),
                url: epMatch[1],
              });
            }
          }
        }

        if (episodeUrls.length > 0) {
          episodes.push({
            title: "Episodes",
            urls: episodeUrls.reverse(),
          });
        }
      }

      return {
        title: await titleElement?.text || url.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        cover: await coverElement?.getAttributeText("src") ||
          await coverElement?.getAttributeText("data-src") || "",
        desc: await descElement?.text || "No description available.",
        episodes,
      };
    } catch (error) {
      console.error(`Error fetching details for ${url}:`, error);
      return {
        title: url.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        cover: "",
        desc: "Failed to load details. The service may be temporarily unavailable.",
        episodes: [],
      };
    }
  }

  async search(kw, page) {
    try {
      // Validate search keyword
      if (!kw || kw.trim() === '') {
        console.warn("Search keyword is empty");
        return [];
      }
      
      // Load settings once
      await this.loadSettings();

      const searchUrl = `${this.baseUrl}/search?type=drama&keyword=${encodeURIComponent(kw.trim())}`;
      const res = await this.req(searchUrl);
      
      // Look for search results with multiple possible selectors
      const resultElements = await this.querySelectorAll(res, ".drama-list li") ||
                           await this.querySelectorAll(res, ".search-results .item") ||
                           await this.querySelectorAll(res, ".movie-item") ||
                           await this.querySelectorAll(res, "ul.switch-block li");
      
      const results = [];
      for (const element of resultElements) {
        try {
          const html = element.content;
          
          const url = await this.getAttributeText(html, "a", "href");
          const title = await this.querySelector(html, "h3")?.text || 
                       await this.getAttributeText(html, "a", "title");
          const cover = await this.getAttributeText(html, "img", "data-original") ||
                       await this.getAttributeText(html, "img", "data-src") ||
                       await this.getAttributeText(html, "img", "src");
          
          // Validate title
          if (!title || title.trim() === '') {
            continue;
          }
          
          if (url && title) {
            // Extract drama ID from URL
            let dramaId = url;
            if (url.includes("/drama-detail/")) {
              dramaId = url.split("/drama-detail/")[1];
            } else if (url.includes("/video-watch/")) {
              const match = url.match(/video-watch\/(.+?)-episode-/);
              if (match) {
                dramaId = match[1];
              }
            }
            
            results.push({
              title: title.trim(),
              url: dramaId || "",
              cover: cover || '',
            });
          }
        } catch (itemError) {
          console.warn("Error processing search item:", itemError);
          continue;
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Search error for "${kw}":`, error);
      return [];
    }
  }

  async watch(url) {
    try {
      await this.loadSettings();
      const watchUrl = `${this.baseUrl}/video-watch/${url}`;
      const res = await this.req(watchUrl);

      const serverElements = await this.querySelectorAll(res, "li[data-video]");
      const serverUrls = [];
      for (const serverElement of serverElements) {
        let videoUrl = await this.getAttributeText(serverElement.content, "li", "data-video");
        if (videoUrl) {
          if (videoUrl.startsWith('//')) {
            videoUrl = 'https:' + videoUrl;
          }
          serverUrls.push(videoUrl);
        }
      }

      // Prioritize Doodstream
      for (const serverUrl of serverUrls) {
        if (serverUrl.includes('dood')) {
          try {
            const directUrl = await this._getDoodstreamUrl(serverUrl, watchUrl);
            if (directUrl) {
              return { type: 'hls', url: directUrl };
            }
          } catch (e) {
            console.warn(`Doodstream extraction failed: ${e.message}`);
          }
        }
      }

      // Fallback to other servers (iframe)
      for (const serverUrl of serverUrls) {
        if (!serverUrl.includes('dood')) {
           return { type: 'iframe', url: serverUrl };
        }
      }

      throw new Error('No video sources found on the page');
    } catch (error) {
      console.error(`Watch error for "${url}":`, error);
      throw new Error(`Failed to load video: ${error.message}.`);
    }
  }

  async _getDoodstreamUrl(url, referer) {
    const res = await this.req(url, { headers: { Referer: referer } });
    const md5Match = res.match(/\/pass_md5\/([^\']+)/);
    if (md5Match) {
      const md5Path = "/pass_md5/" + md5Match[1];
      const doodApiUrl = url.match(/https:\/\/[^\/]+/) + md5Path;
      const apiRes = await this.req(doodApiUrl, { headers: { Referer: url } });
      return apiRes + 'z'; // Append 'z' to get the full URL
    }
    return null;
  }

  async extractPlayerUrl(html) {
    try {
        const scripts = await this.querySelectorAll(html, "script");
        for (const script of scripts) {
            const scriptText = (await this.querySelector(script.content, "script"))?.text || "";
            const match = scriptText.match(/player\.setup\(\{\s*sources:\[\{\s*file:\s*"([^"]+)"/);
            if (match) {
                return match[1];
            }
        }
    } catch (e) {
        // Ignore errors in player extraction
    }
    return null;
  }
