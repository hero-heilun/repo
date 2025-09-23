// ==MiruExtension==
// @name         DramaCool
// @version      v0.0.2
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
    this.useProxy = true;
    this.settingsLoaded = false;
    this.defaultSettings = {
      useProxy: true,
      proxyUrl: "https://proxy.techzbots1.workers.dev/?u="
    };
  }

  async req(url) {
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

  async loadSettings() {
    if (this.settingsLoaded) {
      return;
    }
    
    try {
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
    return {};
  }

   async latest() {
        const res = await this.request("", {
          headers: {
            "Miru-Url": "https://dramacool.bg/all-most-popular-drama",
          },
        });
        const bsxList = await this.querySelectorAll(res, "ul.switch-block.list-episode-item > li");
        const novel = [];
        for (const element of bsxList) {
          const html = await element.content;
           const url = await this.getAttributeText(html, "a", "href");
           const title = await this.querySelector(html, "h3").text;
           const cover = await this.querySelector(html, "img").getAttributeText("data-original");
           console.log(title+"1111"+cover+"1111"+url)
           novel.push({
             title,
             url: url.replace("https://dramacool.com.bz/drama-detail/", ""),
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
        
        console.log("Detail parsing started for: " + String(url));

        const titleElement = await this.querySelector(res, "h1");
        console.log("titleElement result: " + (titleElement ? "found" : "null"));
        
        const descElement = await this.querySelector(res, ".info");
        console.log("descElement result: " + (descElement ? "found" : "null"));
        
        const coverSrc = await this.getAttributeText(res, ".img > img", "src");
        console.log("coverSrc result: " + (coverSrc ? coverSrc : "null"));

        const title = titleElement && titleElement.text ? String(titleElement.text) : "";
        const desc = descElement && descElement.text ? String(descElement.text) : "";
        const cover = coverSrc ? String(coverSrc) : "";
        
        console.log("Basic info - Title: " + (title ? "Found" : "Not found") + ", Cover: " + (cover ? "Found" : "Not found"));
        
        const episodeElements = await this.querySelectorAll(res, "ul.all-episode > li > a");
        console.log("episodeElements result: " + (episodeElements ? episodeElements.length : "null"));
        
        const episodes = [];
        
        if (episodeElements && episodeElements.length > 0) {
          console.log("Found episodes: " + episodeElements.length);
          const episodeUrls = [];
          
          for (let i = 0; i < episodeElements.length; i++) {
            try {
              const epElement = episodeElements[i];
              const epHtml = epElement.content;
              const epUrl = await this.getAttributeText(epHtml, "a", "href");
              
              if (epUrl) {
                const epMatch = epUrl.match(/video-watch\/(.+)/);
                if (epMatch) {
                  const epNameElement = await this.querySelector(epHtml, "h3.title");
                  const epName = epNameElement && epNameElement.text ? String(epNameElement.text) : `Episode ${i + 1}`;
                  episodeUrls.push({ 
                    name: String(epName).trim(), 
                    url: String(epMatch[1]) 
                  });
                }
              }
            } catch (epError) {
              console.warn("Episode parse error at index " + i + ": " + epError.message);
            }
          }
          
          if (episodeUrls.length > 0) {
            episodes.push({ title: "Episodes", urls: episodeUrls.reverse() });
          }
        }
        
        console.log("Detail parsing completed - Episodes: " + (episodes.length > 0 ? episodes[0].urls.length : 0));
        
        return {
          title: String(title),
          cover: String(cover),
          desc: String(desc),
          episodes: episodes
        };
      } catch (error) {
        console.error(`Error fetching details for ${url}:`, error.message);
        return { title: "Error", desc: error.message, episodes: [] };
      }
    }
   
    async search(kw, page) {
      try {
        await this.loadSettings();
        const searchUrl = `${this.baseUrl}/search?type=drama&keyword=${encodeURIComponent(kw.trim())}`;
        const res = await this.req(searchUrl);
        const resultElements = await this.querySelectorAll(res, ".drama-list li");
        const results = [];
        for (const element of resultElements) {
          const html = element.content;
          const url = await this.getAttributeText(html, "a", "href");
          const titleElement = await this.querySelector(html, "h3");
          const title = titleElement ? titleElement.text : null;
          const cover = await this.getAttributeText(html, "img", "data-original");
          if (url && title) {
            let dramaId = url.includes("/drama-detail/") ? url.split("/drama-detail/")[1] : url;
            results.push({ title: title.trim(), url: dramaId, cover: cover || '' });
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
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
            serverUrls.push(videoUrl);
          }
        }

        for (const serverUrl of serverUrls) {
          if (serverUrl.includes('dood')) {
            try {
              const directUrl = await this._getDoodstreamUrl(serverUrl, watchUrl);
              if (directUrl) return { type: 'hls', url: directUrl };
            } catch (e) {
              console.warn(`Doodstream extraction failed: ${e.message}`);
            }
          }
        }

        for (const serverUrl of serverUrls) {
          if (!serverUrl.includes('dood')) return { type: 'iframe', url: serverUrl };
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
        return apiRes + 'z';
      }
      return null;
    }
  }