// ==MiruExtension==
// @name         麻豆传媒
// @version      v0.0.1
// @author       jason
// @lang         zh-cn
// @license      MIT
// @icon         https://madou.club/favicon.ico
// @package      mandu.tv
// @type         bangumi
// @webSite      https://madou.club
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  genres = {
    "1": "国产原创",
    "2": "中文字幕", 
    "3": "日韩无码",
    "4": "欧美系列",
    "5": "动漫卡通"
  };

  async load() {
    // Pre-defined categories to avoid parsing issues
  }

  async createFilter() {
    const genres = {
      title: "分类",
      max: 1,
      min: 0,
      default: "",
      options: this.genres,
    };
    return { genres };
  }

  async latest(page = 1) {
    try {
      const url = page === 1 ? "" : `/page/${page}`;
      const res = await this.request(url, {
        headers: { 
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });
      
      return this.parseVideoList(res);
    } catch (error) {
      console.error("Failed to fetch latest:", error);
      return [];
    }
  }

  async search(kw, page = 1, filter) {
    try {
      if (!kw && !filter?.genres?.[0]) {
        return this.latest(page);
      }

      let url = "";
      if (filter?.genres?.[0]) {
        const categoryId = filter.genres[0];
        url = page === 1 ? `/category/${categoryId}` : `/category/${categoryId}/page/${page}`;
      } else if (kw) {
        url = page === 1 ? `/?s=${encodeURIComponent(kw)}` : `/?s=${encodeURIComponent(kw)}&paged=${page}`;
      }

      const res = await this.request(url, {
        headers: { 
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });
      
      return this.parseVideoList(res);
    } catch (error) {
      console.error("Failed to search:", error);
      return [];
    }
  }

  parseVideoList(html) {
    const videos = [];
    
    // Try multiple selectors to find articles
    const patterns = [
      /<article[^>]*class="[^"]*excerpts[^"]*"[^>]*>.*?<\/article>/gs,
      /<article[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/article>/gs,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/div>/gs
    ];
    
    let videoMatches = [];
    for (const pattern of patterns) {
      videoMatches = [...html.matchAll(pattern)];
      if (videoMatches.length > 0) break;
    }
    
    for (const match of videoMatches) {
      const videoHtml = match[0];
      
      // Extract title - try multiple patterns
      let title = "";
      const titlePatterns = [
        /<h2[^>]*>.*?<a[^>]*[^>]*>([^<]+)</s,
        /<h3[^>]*>.*?<a[^>]*[^>]*>([^<]+)</s,
        /<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</s,
        /<a[^>]*title="([^"]+)"/s
      ];
      
      for (const pattern of titlePatterns) {
        const match = videoHtml.match(pattern);
        if (match) {
          title = match[1].trim();
          break;
        }
      }
      
      // Extract URL - try multiple patterns
      let url = "";
      const urlPatterns = [
        /<h2[^>]*>.*?<a[^>]*href="([^"]+)"/s,
        /<h3[^>]*>.*?<a[^>]*href="([^"]+)"/s,
        /<a[^>]*class="[^"]*title[^"]*"[^>]*href="([^"]+)"/s
      ];
      
      for (const pattern of urlPatterns) {
        const match = videoHtml.match(pattern);
        if (match) {
          url = match[1];
          break;
        }
      }
      
      // Extract cover image - try multiple attributes
      let cover = "";
      const coverPatterns = [
        /<img[^>]*data-src="([^"]+)"/,
        /<img[^>]*src="([^"]+)"/,
        /<img[^>]*data-original="([^"]+)"/
      ];
      
      for (const pattern of coverPatterns) {
        const match = videoHtml.match(pattern);
        if (match && !match[1].includes('data:image')) {
          cover = match[1];
          break;
        }
      }
      
      // Extract update info
      const datePatterns = [
        /<time[^>]*>([^<]+)</,
        /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</,
        /<div[^>]*class="[^"]*post-view[^"]*"[^>]*>([^<]+)</
      ];
      
      let update = "";
      for (const pattern of datePatterns) {
        const match = videoHtml.match(pattern);
        if (match) {
          update = match[1].trim();
          break;
        }
      }
      
      if (title && url) {
        videos.push({
          title,
          url: url.replace("https://madou.club", ""),
          cover,
          update,
        });
      }
    }
    
    return videos;
  }

  async detail(url) {
    try {
      const res = await this.request(url, {
        headers: { 
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });
      
      // Extract title - try multiple patterns
      let title = "";
      const titlePatterns = [
        /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/,
        /<h1[^>]*>([^<]+)<\/h1>/,
        /<title>([^<]+)<\/title>/
      ];
      
      for (const pattern of titlePatterns) {
        const match = res.match(pattern);
        if (match) {
          title = match[1].trim().replace(/ - .*$/, "");
          break;
        }
      }
      
      // Extract cover
      let cover = "";
      const coverPatterns = [
        /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
        /<img[^>]*class="[^"]*featured[^"]*"[^>]*src="([^"]+)"/,
        /<img[^>]*data-src="([^"]+)"/
      ];
      
      for (const pattern of coverPatterns) {
        const match = res.match(pattern);
        if (match && !match[1].includes('data:image')) {
          cover = match[1];
          break;
        }
      }
      
      // Extract description
      let desc = "暂无介绍";
      const descPatterns = [
        /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s,
        /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)<\/div>/s,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/s
      ];
      
      for (const pattern of descPatterns) {
        const match = res.match(pattern);
        if (match) {
          desc = match[1]
            .replace(/<script[^>]*>.*?<\/script>/gs, "")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (desc.length > 10) break;
        }
      }
      
      // Extract video URLs
      const urls = [];
      
      // Look for iframe sources
      const iframeMatches = [...res.matchAll(/<iframe[^>]*src="([^"]+)"/g)];
      iframeMatches.forEach((match, index) => {
        if (!match[1].includes('about:blank')) {
          urls.push({
            name: `播放线路${index + 1}`,
            url: match[1],
          });
        }
      });
      
      // Look for video source tags
      const videoMatches = [...res.matchAll(/<video[^>]*>.*?<source[^>]*src="([^"]+)"/gs)];
      videoMatches.forEach((match, index) => {
        urls.push({
          name: `直链${index + 1}`,
          url: match[1],
        });
      });
      
      // Look for embedded player scripts
      const scriptMatches = [...res.matchAll(/src:\s*["']([^"']*\.(mp4|m3u8|flv)[^"']*)['"]/g)];
      scriptMatches.forEach((match, index) => {
        urls.push({
          name: `播放源${index + 1}`,
          url: match[1],
        });
      });
      
      // If no URLs found, add a placeholder
      if (urls.length === 0) {
        urls.push({
          name: "原网页播放",
          url: `https://madou.club${url}`,
        });
      }
      
      return {
        title: title || "未知标题",
        cover,
        desc,
        episodes: [{ title: "播放", urls }],
      };
    } catch (error) {
      console.error("Failed to get detail:", error);
      throw error;
    }
  }

  async watch(url) {
    try {
      // If it's already a direct video URL
      if (url.includes(".mp4") || url.includes(".m3u8") || url.includes(".flv")) {
        return { 
          type: url.includes(".m3u8") ? "hls" : "mp4", 
          url,
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      }
      
      // Handle iframe or embed URLs
      if (url.includes("iframe") || url.includes("embed") || url.includes("player")) {
        const res = await this.request(url, {
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        
        // Try multiple patterns to extract video URLs
        const patterns = [
          /["']([^"']*\.m3u8[^"']*)['"]/,
          /["']([^"']*\.mp4[^"']*)['"]/,
          /src:\s*["']([^"']+\.(m3u8|mp4|flv))["']/,
          /<source[^>]*src="([^"]+)"/,
          /file:\s*["']([^"']+)["']/,
          /url:\s*["']([^"']+)["']/
        ];
        
        for (const pattern of patterns) {
          const match = res.match(pattern);
          if (match) {
            return { 
              type: match[1].includes(".m3u8") ? "hls" : "mp4", 
              url: match[1],
              headers: {
                "Referer": "https://madou.club/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              }
            };
          }
        }
      }
      
      // If it's a madou.club URL, try to extract from the page
      if (url.includes("madou.club")) {
        return { 
          type: "web", 
          url,
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      }
      
      console.log("Playing URL:", url);
      return { 
        type: "hls", 
        url,
        headers: {
          "Referer": "https://madou.club/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      };
    } catch (error) {
      console.error("Failed to get watch URL:", error);
      return { 
        type: "hls", 
        url,
        headers: {
          "Referer": "https://madou.club/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      };
    }
  }
}