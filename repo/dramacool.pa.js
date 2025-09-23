// ==MiruExtension==
// @name         DramaCool
// @version      v0.0.7
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
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
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
        console.log("Response length: " + res.length);
        
        // Debug: show HTML preview
        const htmlPreview = res.substring(0, 1000);
        console.log("HTML preview (first 1000 chars): " + htmlPreview);

        // Use regex parsing like missav.tv.js instead of DOM selectors
        console.log("Using regex parsing (missav.tv.js style)...");
        
        // Extract title using regex
        let title = "";
        const titleMatch = res.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
        console.log("Title regex result: " + (title ? title : "null"));
        
        // Extract description using regex
        let desc = "";
        const descMatch = res.match(/<div[^>]*class="[^"]*info[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        if (descMatch) {
          // Clean HTML tags from description
          desc = descMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        console.log("Desc regex result: " + (desc ? "found" : "null"));
        
        // Extract cover using regex - try multiple patterns
        let cover = "";
        
        // Try drama-specific image first
        let coverMatch = res.match(/<img[^>]*src="([^"]*storage\/drama[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*>/);
        if (coverMatch) {
          cover = coverMatch[1];
        } else {
          // Try any image with reasonable size/format
          coverMatch = res.match(/<img[^>]*src="([^"]*\.(?:jpg|jpeg|png|webp))"[^>]*(?:width|height)="[^"]*"[^>]*>/);
          if (coverMatch && !coverMatch[1].includes('logo') && !coverMatch[1].includes('button')) {
            cover = coverMatch[1];
          }
        }
        console.log("Cover regex result: " + (cover ? cover : "null"));
        
        console.log("Basic info - Title: " + (title ? "Found" : "Not found") + ", Cover: " + (cover ? "Found" : "Not found"));
        
        // Extract episodes using regex like missav.tv.js
        console.log("Extracting episodes with regex...");
        const episodes = [];
        const episodeUrls = [];
        
        // Find all video-watch links with regex
        const episodePattern = /<a[^>]*href="([^"]*video-watch\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let episodeMatch;
        let episodeCount = 0;
        
        while ((episodeMatch = episodePattern.exec(res)) !== null && episodeCount < 50) {
          try {
            const epUrl = episodeMatch[1];
            const epHtml = episodeMatch[2];
            
            // Extract episode ID from URL (handle both relative and absolute URLs)
            let episodeId = "";
            if (epUrl.includes("video-watch/")) {
              const urlMatch = epUrl.match(/video-watch\/(.+)/);
              if (urlMatch) {
                episodeId = urlMatch[1];
              }
            }
            
            if (episodeId) {
              // Extract episode name from the link HTML  
              let epName = "";
              const nameMatch = epHtml.match(/>([^<]*Episode[^<]*)</);
              if (nameMatch) {
                epName = nameMatch[1].trim();
              } else {
                // Try to extract episode number from URL
                const epNumMatch = episodeId.match(/episode-(\d+)/);
                if (epNumMatch) {
                  epName = `Episode ${epNumMatch[1]}`;
                } else {
                  epName = `Episode ${episodeCount + 1}`;
                }
              }
              
              episodeUrls.push({
                name: String(epName),
                url: String(episodeId)
              });
              episodeCount++;
            }
          } catch (epError) {
            console.warn("Episode regex error: " + epError.message);
          }
        }
        
        console.log("Episode regex result: " + episodeUrls.length + " episodes found");
        
        if (episodeUrls.length > 0) {
          episodes.push({ title: "Episodes", urls: episodeUrls.reverse() });
        }
        
        console.log("Detail parsing completed - Episodes: " + (episodes.length > 0 ? episodes[0].urls.length : 0));
        
        return {
          title: title || "",
          cover: cover || "",
          desc: desc || "",
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
        
        console.log("Search parsing started for: " + String(kw));
        console.log("Response length: " + res.length);
        
        // Use regex parsing like detail and watch methods
        const results = [];
        
        // Extract drama links and info using regex
        const dramaPattern = /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*drama-detail\/[^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<img[^>]*(?:data-original|src)="([^"]*)"[^>]*>[\s\S]*?<\/li>/g;
        let dramaMatch;
        let count = 0;
        
        while ((dramaMatch = dramaPattern.exec(res)) !== null && count < 20) {
          try {
            const url = dramaMatch[1];
            const title = dramaMatch[2].trim();
            const cover = dramaMatch[3];
            
            if (url && title) {
              let dramaId = url.includes("/drama-detail/") ? url.split("/drama-detail/")[1] : url;
              results.push({ 
                title: title, 
                url: dramaId, 
                cover: cover || '' 
              });
              count++;
            }
          } catch (itemError) {
            console.warn("Search item parse error: " + itemError.message);
          }
        }
        
        console.log("Search results found: " + results.length);
        return results;
      } catch (error) {
        console.error("Search error for " + String(kw) + ": " + error.message);
        return [];
      }
    }
   
    async watch(url) {
      try {
        await this.loadSettings();
        const watchUrl = `${this.baseUrl}/video-watch/${url}`;
        const res = await this.req(watchUrl);
        
        console.log("Watch parsing started for: " + String(url));
        console.log("Response length: " + res.length);
        
        // Use regex parsing like detail method
        const serverUrls = [];
        
        // Extract data-video attributes using regex
        const dataVideoPattern = /data-video="([^"]+)"/g;
        let dataVideoMatch;
        
        while ((dataVideoMatch = dataVideoPattern.exec(res)) !== null) {
          let videoUrl = dataVideoMatch[1];
          if (videoUrl) {
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
            serverUrls.push(videoUrl);
          }
        }
        
        console.log("Server URLs found: " + serverUrls.length);
        
        // Try Doodstream servers first
        for (const serverUrl of serverUrls) {
          if (serverUrl.includes('dood')) {
            try {
              console.log("Trying Doodstream URL: " + serverUrl);
              const directUrl = await this._getDoodstreamUrl(serverUrl, watchUrl);
              if (directUrl) {
                console.log("Doodstream success, returning HLS URL");
                return { type: 'hls', url: directUrl };
              }
            } catch (e) {
              console.warn("Doodstream extraction failed: " + e.message);
            }
          }
        }

        // Try other servers as iframe fallback
        for (const serverUrl of serverUrls) {
          if (!serverUrl.includes('dood')) {
            console.log("Using iframe fallback: " + serverUrl);
            return { type: 'iframe', url: serverUrl };
          }
        }

        throw new Error('No video sources found on the page');
      } catch (error) {
        console.error("Watch error for " + String(url) + ": " + error.message);
        throw new Error("Failed to load video: " + error.message);
      }
    }
   
    async _getDoodstreamUrl(url, referer) {
      try {
        const res = await this.req(url, { headers: { Referer: referer } });
        const md5Match = res.match(/\/pass_md5\/([^\']+)/);
        if (md5Match) {
          const md5Path = "/pass_md5/" + md5Match[1];
          const doodApiUrl = url.match(/https:\/\/[^\/]+/) + md5Path;
          const apiRes = await this.req(doodApiUrl, { headers: { Referer: url } });
          
          // Clean the API response to avoid cookie formatting issues
          const cleanApiRes = String(apiRes).trim().replace(/[^\x20-\x7E]/g, '');
          console.log("Doodstream API response length: " + apiRes.length + " cleaned: " + cleanApiRes.length);
          
          if (cleanApiRes && cleanApiRes.length > 0) {
            return cleanApiRes + 'z';
          }
        }
      } catch (error) {
        console.warn("Doodstream URL extraction error: " + error.message);
      }
      return null;
    }
  }