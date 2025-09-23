// ==MiruExtension==
// @name         DramaCool
// @version      v0.0.6
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
  }

  async req(url) {
    // Direct web scraping approach
    return this.request(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
  }

  async load() {
    // No settings needed for direct scraping
  }

  async latest() {
    try {
      console.log("Fetching latest dramas from:", this.baseUrl);
      const res = await this.request(this.baseUrl);
      console.log("Response received, length:", res.length);
      
      const bsxList = await this.querySelectorAll(res, "ul.switch-block.list-episode-item > li");
      console.log("Found items:", bsxList.length);
      
      const novel = [];
      
      for (const element of bsxList) {
        try {
          const html = element.content;
          
          const url = await this.getAttributeText(html, "a", "href");
          let title = null;
          
          // Try multiple ways to get title
          const h3Element = await this.querySelector(html, "h3");
          if (h3Element && h3Element.text) {
            title = h3Element.text;
          } else {
            title = await this.getAttributeText(html, "a", "title");
          }
          
          const cover = await this.getAttributeText(html, "img", "data-original") || 
                       await this.getAttributeText(html, "img", "data-src") ||
                       await this.getAttributeText(html, "img", "src");
          
          if (url && title) {
            // Extract drama ID from different URL formats
            let dramaId = url;
            if (url.includes("/drama-detail/")) {
              dramaId = url.split("/drama-detail/")[1];
            } else if (url.includes("/video-watch/")) {
              // Extract drama name from episode URL
              const match = url.match(/video-watch\/(.+?)-episode-/);
              if (match) {
                dramaId = match[1];
              }
            }
            
            // Remove base URL if present
            if (dramaId.startsWith("http")) {
              if (dramaId.includes("/drama-detail/")) {
                dramaId = dramaId.split("/drama-detail/")[1];
              } else if (dramaId.includes("/video-watch/")) {
                const match = dramaId.match(/video-watch\/(.+?)-episode-/);
                if (match) {
                  dramaId = match[1];
                }
              }
            }
            
            novel.push({
              title: title.trim(),
              url: dramaId,
              cover: cover || "",
            });
          }
        } catch (itemError) {
          console.warn("Error processing item:", itemError.message);
          continue;
        }
      }
      
      console.log("Successfully processed items:", novel.length);
      return novel;
    } catch (error) {
      console.error("Error fetching latest:", error.message);
      return [];
    }
  }

  async detail(url) {
    try {
      // Try to access drama detail page directly
      const detailUrl = `${this.baseUrl}/drama-detail/${url}`;
      const res = await this.request(detailUrl);
      
      // If drama detail page is not available, try to find it from search
      if (res.includes("Attempt to read property") || res.includes("error")) {
        console.warn(`Drama detail page error for ${url}, trying alternative approach`);
        
        // Return basic info for now
        return {
          title: url.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          cover: "",
          desc: "Drama details are currently unavailable. This may be a temporary issue with the website.",
          episodes: [],
        };
      }
      
      // Parse the drama detail page
      const titleElement = await this.querySelector(res, "h1") || 
                          await this.querySelector(res, ".drama-title") ||
                          await this.querySelector(res, "title");
      
      const descElement = await this.querySelector(res, ".description") ||
                         await this.querySelector(res, ".synopsis") ||
                         await this.querySelector(res, ".summary");
      
      const coverElement = await this.querySelector(res, ".drama-poster img") ||
                          await this.querySelector(res, ".poster img") ||
                          await this.querySelector(res, "img[alt*='poster']");
      
      // Look for episode links
      const episodeElements = await this.querySelectorAll(res, "a[href*='video-watch']");
      
      const episodes = [];
      if (episodeElements.length > 0) {
        const episodeUrls = [];
        for (const epElement of episodeElements) {
          const epHtml = await epElement.content;
          const epUrl = await this.getAttributeText(epHtml, "a", "href");
          const epText = await this.querySelector(epHtml, "a").text;
          
          if (epUrl && epText) {
            // Extract episode ID from URL
            const epMatch = epUrl.match(/video-watch\/(.+)/);
            if (epMatch) {
              episodeUrls.push({
                name: epText.trim(),
                url: epMatch[1],
              });
            }
          }
        }
        
        if (episodeUrls.length > 0) {
          episodes.push({
            title: "Episodes",
            urls: episodeUrls,
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
      const searchUrl = `${this.baseUrl}/search/keyword/${encodeURIComponent(kw)}`;
      const res = await this.request(searchUrl);
      
      // Look for search results with multiple possible selectors
      const resultElements = await this.querySelectorAll(res, ".drama-list li") ||
                           await this.querySelectorAll(res, ".search-results .item") ||
                           await this.querySelectorAll(res, ".movie-item") ||
                           await this.querySelectorAll(res, "ul.switch-block li");
      
      const results = [];
      for (const element of resultElements) {
        try {
          const html = await element.content;
          const linkElement = await this.querySelector(html, "a");
          const titleElement = await this.querySelector(html, "h3") || 
                              await this.querySelector(html, ".title") ||
                              linkElement;
          const imgElement = await this.querySelector(html, "img");
          
          const url = await linkElement?.getAttributeText("href");
          const title = await titleElement?.text || await linkElement?.getAttributeText("title");
          const cover = await imgElement?.getAttributeText("data-original") ||
                       await imgElement?.getAttributeText("data-src") ||
                       await imgElement?.getAttributeText("src");
          
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
              url: dramaId,
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
      // Access the video watch page directly
      const watchUrl = `${this.baseUrl}/video-watch/${url}`;
      const res = await this.request(watchUrl);
      
      // Look for DramaCool's specific data-video attribute
      const serverElements = await this.querySelectorAll(res, "li[data-video]");
      
      for (const serverElement of serverElements) {
        const serverHtml = await serverElement.content;
        const videoUrl = await this.getAttributeText(serverHtml, "li", "data-video");
        
        if (videoUrl) {
          return {
            type: "iframe",
            url: videoUrl,
          };
        }
      }
      
      // Check for iframe sources as fallback
      const iframes = await this.querySelectorAll(res, "iframe");
      
      for (const iframe of iframes) {
        const iframeHtml = await iframe.content;
        const src = await this.getAttributeText(iframeHtml, "iframe", "src");
        
        if (src && (src.includes("vidbasic") || src.includes("streamtape") || src.includes("mixdrop") || src.includes("doodstream"))) {
          return {
            type: "iframe",
            url: src,
          };
        }
      }
      
      // Look for direct video links
      const videoElements = await this.querySelectorAll(res, "video source") ||
                           await this.querySelectorAll(res, "video");
      
      for (const video of videoElements) {
        const videoHtml = await video.content;
        const src = await this.getAttributeText(videoHtml, "source", "src") ||
                   await this.getAttributeText(videoHtml, "video", "src");
        
        if (src) {
          return {
            type: src.includes(".m3u8") ? "hls" : "mp4",
            url: src,
          };
        }
      }
      
      // Look for embedded player scripts
      const scripts = await this.querySelectorAll(res, "script");
      for (const script of scripts) {
        const scriptHtml = await script.content;
        const scriptText = await this.querySelector(scriptHtml, "script").text;
        
        // Look for common video URL patterns
        const urlMatches = scriptText.match(/(?:file|src|url|data-video):\s*["']([^"']+)[^"']*["']/i);
        if (urlMatches) {
          const videoUrl = urlMatches[1];
          if (videoUrl.includes("http") && (videoUrl.includes("embed") || videoUrl.includes("player"))) {
            return {
              type: "iframe",
              url: videoUrl,
            };
          }
        }
      }
      
      throw new Error('No video sources found on the page');
    } catch (error) {
      console.error(`Watch error for "${url}":`, error);
      throw new Error(`Failed to load video: ${error.message}. The video may not be available or requires a different player.`);
    }
  }
}
