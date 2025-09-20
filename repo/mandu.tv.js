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
    "guochan": "国产原创",
    "zhongwen": "中文字幕", 
    "rihan": "日韩无码",
    "oumei": "欧美系列",
    "dongman": "动漫卡通"
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
        // Based on madou.js search pattern
        url = `/page/${page}?s=${encodeURIComponent(kw)}`;
      }

      console.log("Search URL:", url);
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
    console.log("Parsing HTML length:", html.length);
    
    // Based on madou.js patterns - look for excerpts-wrapper articles
    const excerptPattern = /<div[^>]*class="[^"]*excerpts-wrapper[^"]*"[^>]*>(.*?)<\/div>/s;
    const excerptMatch = html.match(excerptPattern);
    
    if (excerptMatch) {
      console.log("Found excerpts-wrapper");
      const excerptContent = excerptMatch[1];
      const articlePattern = /<article[^>]*>(.*?)<\/article>/gs;
      const articles = [...excerptContent.matchAll(articlePattern)];
      
      console.log("Found articles:", articles.length);
      
      for (const articleMatch of articles) {
        const articleHtml = articleMatch[0];
        
        // Extract title from h2 > a
        const titleMatch = articleHtml.match(/<h2[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s);
        const title = titleMatch ? titleMatch[1].trim() : "";
        
        // Extract URL from h2 > a href
        const urlMatch = articleHtml.match(/<h2[^>]*>.*?<a[^>]*href="([^"]+)"/s);
        const url = urlMatch ? urlMatch[1] : "";
        
        // Extract cover from img data-src or src
        let cover = "";
        const coverMatch = articleHtml.match(/<img[^>]*(?:data-src|src)="([^"]+)"/);
        if (coverMatch && !coverMatch[1].includes('data:image')) {
          cover = coverMatch[1];
        }
        
        // Extract subtitle/view count
        const subtitleMatch = articleHtml.match(/<div[^>]*class="[^"]*post-view[^"]*"[^>]*>([^<]+)/);
        const update = subtitleMatch ? subtitleMatch[1].trim() : "";
        
        if (title && url) {
          console.log("Found video:", title);
          videos.push({
            title,
            url: url.replace("https://madou.club", ""),
            cover,
            update,
          });
        }
      }
    } else {
      console.log("excerpts-wrapper not found, trying alternative patterns");
      
      // Fallback patterns
      const patterns = [
        /<article[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/article>/gs,
        /<div[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/div>/gs
      ];
      
      for (const pattern of patterns) {
        const matches = [...html.matchAll(pattern)];
        console.log(`Pattern found ${matches.length} matches`);
        
        if (matches.length > 0) {
          for (const match of matches) {
            const itemHtml = match[0];
            
            // Extract title
            const titlePatterns = [
              /<h2[^>]*>.*?<a[^>]*>([^<]+)/s,
              /<h3[^>]*>.*?<a[^>]*>([^<]+)/s,
              /<a[^>]*title="([^"]+)"/
            ];
            
            let title = "";
            for (const titlePattern of titlePatterns) {
              const titleMatch = itemHtml.match(titlePattern);
              if (titleMatch) {
                title = titleMatch[1].trim();
                break;
              }
            }
            
            // Extract URL
            const urlPatterns = [
              /<h2[^>]*>.*?<a[^>]*href="([^"]+)"/s,
              /<h3[^>]*>.*?<a[^>]*href="([^"]+)"/s
            ];
            
            let url = "";
            for (const urlPattern of urlPatterns) {
              const urlMatch = itemHtml.match(urlPattern);
              if (urlMatch) {
                url = urlMatch[1];
                break;
              }
            }
            
            // Extract cover
            let cover = "";
            const coverMatch = itemHtml.match(/<img[^>]*(?:data-src|src)="([^"]+)"/);
            if (coverMatch && !coverMatch[1].includes('data:image')) {
              cover = coverMatch[1];
            }
            
            if (title && url) {
              videos.push({
                title,
                url: url.replace("https://madou.club", ""),
                cover,
                update: "",
              });
            }
          }
          break;
        }
      }
    }
    
    console.log("Parsed videos count:", videos.length);
    return videos;
  }

  async detail(url) {
    try {
      console.log("Detail URL:", url);
      const res = await this.request(url, {
        headers: { 
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });
      
      console.log("Detail response length:", res.length);
      
      // Extract title from h1.entry-title
      let title = "";
      const titleMatch = res.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/);
      if (titleMatch) {
        title = titleMatch[1].trim();
      } else {
        // Fallback to page title
        const pageTitleMatch = res.match(/<title>([^<]+)<\/title>/);
        if (pageTitleMatch) {
          title = pageTitleMatch[1].replace(/ - .*$/, "").trim();
        }
      }
      
      // Extract cover from og:image meta tag
      let cover = "";
      const ogImageMatch = res.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
      if (ogImageMatch) {
        cover = ogImageMatch[1];
      }
      
      // Extract description from article content
      let desc = "暂无介绍";
      const contentMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s);
      if (contentMatch) {
        desc = contentMatch[1]
          .replace(/<iframe[^>]*>.*?<\/iframe>/gs, "")
          .replace(/<script[^>]*>.*?<\/script>/gs, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (desc.length < 10) {
          desc = "暂无介绍";
        }
      }
      
      // Extract video URLs - look for iframe in article-content
      const urls = [];
      const iframeMatches = [...res.matchAll(/<iframe[^>]*src="([^"]+)"/g)];
      
      console.log("Found iframes:", iframeMatches.length);
      
      iframeMatches.forEach((match, index) => {
        if (!match[1].includes('about:blank') && !match[1].includes('googleads')) {
          urls.push({
            name: `播放线路${index + 1}`,
            url: match[1],
          });
        }
      });
      
      // Look for direct video links
      const videoMatches = [...res.matchAll(/<video[^>]*>.*?<source[^>]*src="([^"]+)"/gs)];
      videoMatches.forEach((match, index) => {
        urls.push({
          name: `直链${index + 1}`,
          url: match[1],
        });
      });
      
      // If no URLs found, add placeholder to original page
      if (urls.length === 0) {
        console.log("No video URLs found, adding placeholder");
        urls.push({
          name: "原网页观看",
          url: `https://madou.club${url}`,
        });
      }
      
      console.log("Extracted URLs:", urls.length);
      
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
      console.log("Watch URL:", url);
      
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
        
        console.log("Iframe response length:", res.length);
        
        // Based on madou.js - look for token and reconstruct m3u8 URL
        const tokenMatch = res.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
        const m3u8Match = res.match(/\.m3u8/);
        
        if (tokenMatch && m3u8Match) {
          const token = tokenMatch[1];
          const m3u8Url = `https://madou.club/20230827/${token}.m3u8`;
          console.log("Constructed m3u8 URL:", m3u8Url);
          return {
            type: "hls",
            url: m3u8Url,
            headers: {
              "Referer": "https://madou.club/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          };
        }
        
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
          if (match && match[1] && !match[1].includes('data:')) {
            console.log("Found video URL:", match[1]);
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
      
      // If it's a madou.club URL, return as web player
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
      
      console.log("Fallback - returning original URL:", url);
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