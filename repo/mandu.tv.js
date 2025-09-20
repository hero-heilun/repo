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
      
      // Extract iframe source - based on madou.js getTracks implementation
      const urls = [];
      const iframeMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>.*?<iframe[^>]*src="([^"]+)"/s);
      
      if (iframeMatch && !iframeMatch[1].includes('about:blank') && !iframeMatch[1].includes('googleads')) {
        console.log("Found iframe source:", iframeMatch[1]);
        
        try {
          // Fetch iframe content to extract video details
          const iframeRes = await this.request(iframeMatch[1], {
            headers: {
              "Referer": `https://madou.club${url}`,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          
          console.log("Iframe response length:", iframeRes.length);
          
          // Extract domain from iframe URL
          const domainMatch = iframeMatch[1].match(/https?:\/\/([^\/]+)/);
          const domain = domainMatch ? `https://${domainMatch[1]}` : "";
          
          // Extract token and m3u8 path from script
          const tokenMatch = iframeRes.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
          const m3u8Match = iframeRes.match(/m3u8["']?\s*[:=]\s*["']([^"']+)["']/);
          
          if (tokenMatch && m3u8Match && domain) {
            const token = tokenMatch[1];
            const m3u8Path = m3u8Match[1];
            const playUrl = `${domain}${m3u8Path}?token=${token}`;
            
            console.log("Constructed play URL:", playUrl);
            urls.push({
              name: "播放",
              url: playUrl,
            });
          } else {
            console.log("Token or m3u8 not found, using iframe URL");
            urls.push({
              name: "播放",
              url: iframeMatch[1],
            });
          }
        } catch (iframeError) {
          console.error("Failed to fetch iframe:", iframeError);
          urls.push({
            name: "播放",
            url: iframeMatch[1],
          });
        }
      }
      
      // Look for additional iframes
      const additionalIframes = [...res.matchAll(/<iframe[^>]*src="([^"]+)"/g)];
      additionalIframes.forEach((match, index) => {
        if (!match[1].includes('about:blank') && 
            !match[1].includes('googleads') && 
            !urls.some(u => u.url === match[1])) {
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
        console.log("No video URLs found, trying to add placeholder");
        if (url && url.trim() !== "") {
          urls.push({
            name: "原网页观看",
            url: `https://madou.club${url}`,
          });
        } else {
          console.error("Cannot create placeholder URL - detail URL is empty");
          throw new Error("未找到可播放的视频源");
        }
      }
      
      // Validate all URLs before returning
      const validUrls = urls.filter(urlObj => {
        if (!urlObj.url || urlObj.url.trim() === "") {
          console.warn("Filtering out empty URL:", urlObj.name);
          return false;
        }
        return true;
      });
      
      if (validUrls.length === 0) {
        console.error("No valid URLs found after filtering");
        throw new Error("未找到有效的视频播放链接");
      }
      
      console.log("Valid URLs:", validUrls.length);
      
      return {
        title: title || "未知标题",
        cover,
        desc,
        episodes: [{ title: "播放", urls: validUrls }],
      };
    } catch (error) {
      console.error("Failed to get detail:", error);
      throw error;
    }
  }

  async watch(url) {
    try {
      console.log("Watch URL:", url);
      
      // If it's already a direct video URL with token
      if (url.includes(".m3u8") && url.includes("token=")) {
        console.log("Direct m3u8 URL with token");
        return { 
          type: "hls", 
          url,
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      }
      
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
      
      // Handle iframe or embed URLs - this should match URLs from detail()
      if (url.includes("iframe") || url.includes("embed") || url.includes("player") || url.includes("dash")) {
        try {
          const res = await this.request(url, {
            headers: {
              "Referer": "https://madou.club/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          
          console.log("Iframe response length:", res.length);
          
          // Extract domain from URL
          const domainMatch = url.match(/https?:\/\/([^\/]+)/);
          const domain = domainMatch ? `https://${domainMatch[1]}` : "";
          
          // Extract token and m3u8 path from script
          const tokenMatch = res.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
          const m3u8Match = res.match(/m3u8["']?\s*[:=]\s*["']([^"']+)["']/);
          
          if (tokenMatch && m3u8Match && domain) {
            const token = tokenMatch[1];
            const m3u8Path = m3u8Match[1];
            const playUrl = `${domain}${m3u8Path}?token=${token}`;
            
            console.log("Constructed play URL:", playUrl);
            return {
              type: "hls",
              url: playUrl,
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
        } catch (iframeError) {
          console.error("Failed to process iframe URL:", iframeError);
        }
      }
      
      // If it's a madou.club URL, try to extract video from the page
      if (url.includes("madou.club")) {
        try {
          const res = await this.request(url.replace("https://madou.club", ""), {
            headers: {
              "Miru-Url": "https://madou.club",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          
          // Look for iframe in the page
          const iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/);
          if (iframeMatch && !iframeMatch[1].includes('about:blank')) {
            console.log("Found iframe in madou.club page:", iframeMatch[1]);
            // Recursively call watch with iframe URL
            return await this.watch(iframeMatch[1]);
          }
        } catch (error) {
          console.error("Failed to extract from madou.club page:", error);
        }
      }
      
      // Check if URL is empty or invalid
      if (!url || url.trim() === "") {
        console.error("Empty or invalid URL provided");
        throw new Error("无效的播放链接");
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
      
      // Don't return empty URLs even in error cases
      if (!url || url.trim() === "") {
        throw error;
      }
      
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