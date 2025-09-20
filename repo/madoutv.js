// ==MiruExtension==
// @name         麻豆传媒
// @version      v0.0.2.1
// @author       jason
// @lang         zh-cn
// @license      MIT
// @icon         https://madou.club/favicon.ico
// @package      madoutv
// @type         bangumi
// @webSite      https://madou.club
// @nsfw         true
// ==/MiruExtension==

// Immediate execution marker - should appear if script loads at all
(function() {
  console.log(">>> MADOUTV SCRIPT START EXECUTING v0.0.1.9 <<<");
})();

// Global test function to verify JavaScript execution
globalThis.testFunction = function(testParam) {
  console.log("=== GLOBAL TEST FUNCTION ===");
  console.log("Test parameter:", testParam);
  console.log("Test parameter type:", typeof testParam);
  return "Global function works: " + testParam;
};

// Force cache bust with timestamp
const timestamp = new Date().toISOString();
console.log(`MADOUTV v0.0.1.9 LOADING AT ${timestamp}`);

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
      console.log("=== MANDU.TV LATEST METHOD START ===");
      console.log("Latest page request:", page);
      const url = page === 1 ? "" : `/page/${page}`;
      console.log("Latest URL:", url);

      const res = await this.request(url, {
        headers: {
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });

      console.log("Latest response received, length:", res.length);
      const videos = this.parseVideoList(res);
      console.log("Latest returning", videos.length, "videos");
      return videos;
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
          console.log("Original URL:", url);
          // Ensure URL starts with / for proper relative path
          let cleanUrl = url.replace("https://madou.club", "");
          if (!cleanUrl.startsWith('/')) {
            cleanUrl = '/' + cleanUrl;
          }
          console.log("Clean URL:", cleanUrl);
          videos.push({
            title,
            url: cleanUrl,
            cover,
            update,
          });
        } else {
          console.log("Skipping video - Title:", title, "URL:", url);
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
              console.log("Fallback - Found video:", title);
              console.log("Fallback - Original URL:", url);
              // Ensure URL starts with / for proper relative path
              let cleanUrl = url.replace("https://madou.club", "");
              if (!cleanUrl.startsWith('/')) {
                cleanUrl = '/' + cleanUrl;
              }
              console.log("Fallback - Clean URL:", cleanUrl);
              videos.push({
                title,
                url: cleanUrl,
                cover,
                update: "",
              });
            } else {
              console.log("Fallback - Skipping video - Title:", title, "URL:", url);
            }
          }
          break;
        }
      }
    }

    console.log("Parsed videos count:", videos.length);

    // Debug: show first few videos
    console.log("=== PARSED VIDEOS SUMMARY ===");
    videos.slice(0, 3).forEach((video, index) => {
      console.log(`Video ${index + 1}:`, video.title, "->", video.url);
    });

    if (videos.length === 0) {
      console.error("NO VIDEOS PARSED - Check HTML structure or parsing logic");
    }

    return videos;
  }

  async detail(url) {
    try {
      console.log("=== MADOUTV DETAIL METHOD START v1.0 ===");
      console.log("URL parameter:", url);
      console.log("URL type:", typeof url);
      console.log("URL length:", url ? url.length : 'null/undefined');
      console.log("URL value (JSON):", JSON.stringify(url));
      console.log("Arguments total:", arguments.length);
      for (let i = 0; i < arguments.length; i++) {
        console.log(`Argument[${i}]:`, arguments[i], `(type: ${typeof arguments[i]})`);
      }
      console.log("Raw arguments object:", arguments);

      // Handle URL encoding issues - the app may pass encoded URLs
      let cleanUrl = url;
      if (url && typeof url === 'string') {
        // Try to decode URL if it's encoded
        try {
          if (url.includes('%')) {
            cleanUrl = decodeURIComponent(url);
            console.log("Decoded URL:", cleanUrl);
          }
        } catch (e) {
          console.log("URL decode failed, using original:", e);
        }
      }

      console.log("Final URL to use:", cleanUrl);
      console.log("=== URL DEBUG INFO ===");

      // Validate URL first
      if (!cleanUrl || cleanUrl.trim() === "") {
        console.error("Empty detail URL provided");
        console.error("This is an app integration issue - URL parameter not passed correctly");
        console.error("Expected URL like: /md0362-xxx.html");

        // We can see from logs that the URL exists in GetX tag, but app doesn't pass it
        // Extract URL from GetX tag or use a placeholder that watch method can handle
        // The URL pattern is: /md0362-%e6%b7%ab%e5%83%a7...
        console.log("Attempting to construct URL from available info");

        // Return a structure with a placeholder URL that watch method might be able to resolve
        return {
          title: "测试视频",
          cover: "",
          desc: "URL参数传递测试 - detail方法收到空参数，但GetX tag显示正确URL",
          episodes: [{
            title: "播放",
            urls: [{
              name: "播放链接",
              url: "/md0362-淫僧释永信禅房偷拍实录-少林肉棒替女信徒消灾.html",
            }]
          }],
        };
      }

      const res = await this.request(cleanUrl, {
        headers: {
          "Miru-Url": "https://madou.club",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
      });

      console.log("Detail response length:", res.length);

      // Check if we got valid response
      if (!res || res.length === 0) {
        console.error("Empty response from detail page");
        throw new Error("无法获取详情页内容");
      }

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

      // Try multiple iframe patterns with both single and double quotes
      let iframeMatch = null;
      
      // Pattern 1: iframe src without quotes (like madou.club uses)
      iframeMatch = res.match(/<iframe[^>]*src=([^\s>]+)/);
      console.log("Pattern 1 (src without quotes):", !!iframeMatch);
      
      if (!iframeMatch) {
        // Pattern 2: Any iframe with double quotes
        iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/);
        console.log("Pattern 2 (src double quotes):", !!iframeMatch);
      }
      
      if (!iframeMatch) {
        // Pattern 3: Any iframe with single quotes
        iframeMatch = res.match(/<iframe[^>]*src='([^']+)'/);
        console.log("Pattern 3 (src single quotes):", !!iframeMatch);
      }
      
      if (!iframeMatch) {
        // Pattern 4: iframe with data-src double quotes
        iframeMatch = res.match(/<iframe[^>]*data-src="([^"]+)"/);
        console.log("Pattern 4 (data-src double quotes):", !!iframeMatch);
      }
      
      if (!iframeMatch) {
        // Pattern 5: iframe with data-src single quotes
        iframeMatch = res.match(/<iframe[^>]*data-src='([^']+)'/);
        console.log("Pattern 5 (data-src single quotes):", !!iframeMatch);
      }
      
      if (!iframeMatch) {
        // Pattern 6: iframe with data-src without quotes
        iframeMatch = res.match(/<iframe[^>]*data-src=([^\s>]+)/);
        console.log("Pattern 6 (data-src without quotes):", !!iframeMatch);
      }

      // Debug: check for any iframes at all with both quote types and data-src
      const allIframes = [
        ...res.matchAll(/<iframe[^>]*src="([^"]+)"/g),
        ...res.matchAll(/<iframe[^>]*src='([^']+)'/g),
        ...res.matchAll(/<iframe[^>]*data-src="([^"]+)"/g),
        ...res.matchAll(/<iframe[^>]*data-src='([^']+)'/g)
      ];
      console.log("Total iframes found:", allIframes.length);
      allIframes.forEach((match, index) => {
        console.log(`Iframe ${index + 1}:`, match[1]);
      });
      
      // Debug: also look for iframe tags without src
      const iframeTagsOnly = [...res.matchAll(/<iframe[^>]*>/g)];
      console.log("Total iframe tags (any):", iframeTagsOnly.length);
      iframeTagsOnly.forEach((match, index) => {
        console.log(`Iframe tag ${index + 1}:`, match[0]);
      });
      
      // Debug: Look for article-content div to understand page structure
      const articleContentMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s);
      if (articleContentMatch) {
        console.log("Found article-content div, length:", articleContentMatch[1].length);
        const articleContent = articleContentMatch[1];
        
        // Show first 500 chars of article content
        console.log("Article content preview:", articleContent.substring(0, 500));
        
        // Look for any embed-related content
        const embedKeywords = ['iframe', 'embed', 'player', 'video', 'src=', 'data-src='];
        embedKeywords.forEach(keyword => {
          if (articleContent.toLowerCase().includes(keyword)) {
            console.log(`Found keyword "${keyword}" in article content`);
          }
        });
      } else {
        console.log("No article-content div found");
        
        // Look for other common content containers
        const contentPatterns = [
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>/g,
          /<div[^>]*class="[^"]*post[^"]*"[^>]*>/g,
          /<div[^>]*class="[^"]*entry[^"]*"[^>]*>/g
        ];
        
        contentPatterns.forEach((pattern, index) => {
          const matches = [...res.matchAll(pattern)];
          console.log(`Content pattern ${index + 1} matches:`, matches.length);
        });
      }
      
      // Debug: Show page title to verify we're getting the right page
      const titleMatch = res.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        console.log("Page title:", titleMatch[1]);
      }
      
      // Debug: Look for any script tags that might contain video info
      const scriptTags = [...res.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
      console.log("Total script tags found:", scriptTags.length);
      
      // Check scripts for video-related keywords
      let foundVideoScript = false;
      scriptTags.forEach((script, index) => {
        const scriptContent = script[1];
        if (scriptContent.includes('token') || scriptContent.includes('m3u8') || scriptContent.includes('video') || scriptContent.includes('player')) {
          console.log(`Script ${index + 1} contains video keywords`);
          console.log(`Script ${index + 1} preview:`, scriptContent.substring(0, 300));
          foundVideoScript = true;
        }
      });
      
      if (!foundVideoScript) {
        console.log("No scripts containing video keywords found");
      }

      console.log("Looking for iframe in article-content");
      console.log("Iframe match found:", !!iframeMatch);

      if (iframeMatch) {
        console.log("Raw iframe URL:", iframeMatch[1]);
      }

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

          // Extract domain from iframe URL - exactly like madou.js
          const domainMatch = iframeMatch[1].match(/^(https?:\/\/[^\/]+)/);
          const domain = domainMatch ? domainMatch[1] : "";

          // Find all script tags and look for the one with token and m3u8
          const scriptMatches = [...iframeRes.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
          console.log(`Found ${scriptMatches.length} script tags`);

          let token = null;
          let m3u8Path = null;

          // First try the 6th script tag (index 5) as per madou.js reference
          if (scriptMatches.length > 5) {
            const scriptContent = scriptMatches[5][1];
            console.log("Checking 6th script tag (index 5) as per madou.js pattern");
            
            // Use exact patterns from madou.js
            const tokenMatch = scriptContent.match(/var token = "(.+?)";/);
            const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

            if (tokenMatch && m3u8Match) {
              token = tokenMatch[1];
              m3u8Path = m3u8Match[1];
              console.log("Found token in 6th script:", token.substring(0, 20) + "...");
              console.log("Found m3u8 path in 6th script:", m3u8Path);
            }
          }

          // If not found in 6th script, search all scripts
          if (!token || !m3u8Path) {
            console.log("Not found in 6th script, searching all scripts");
            for (let i = 0; i < scriptMatches.length; i++) {
              const scriptContent = scriptMatches[i][1];
              const preview = scriptContent.substring(0, 200).replace(/\s+/g, ' ');
              console.log(`Checking script ${i + 1}:`, preview + "...");

              // Use exact patterns from madou.js first, then fallbacks
              let tokenMatch = scriptContent.match(/var token = "(.+?)";/);
              let m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

              // Fallback patterns
              if (!tokenMatch) {
                tokenMatch = scriptContent.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
              }
              if (!m3u8Match) {
                m3u8Match = scriptContent.match(/m3u8["']?\s*[:=]\s*["']([^"']+)["']/);
              }

              if (tokenMatch) {
                token = tokenMatch[1];
                console.log("Found token:", token.substring(0, 20) + "...");
              }
              if (m3u8Match) {
                m3u8Path = m3u8Match[1];
                console.log("Found m3u8 path:", m3u8Path);
              }

              if (token && m3u8Path) {
                console.log("Both token and m3u8 found, breaking");
                break;
              }
            }
          }

          // If we still don't have both, try the original iframe URL
          if (!token || !m3u8Path) {
            console.log("Token or m3u8 not found in scripts, adding iframe URL as fallback");
            urls.push({
              name: "播放",
              url: iframeMatch[1],
            });
          }

          if (token && m3u8Path && domain) {
            // Construct final playback URL exactly like madou.js
            const playUrl = `${domain}${m3u8Path}?token=${token}`;

            console.log("Constructed play URL:", playUrl);
            urls.push({
              name: "播放",
              url: playUrl,
            });
          } else {
            console.log("Token or m3u8 not found, using iframe URL");
            console.log("Domain:", domain, "Token:", token, "M3U8:", m3u8Path);
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
      console.log("=== MADOUTV WATCH METHOD START v1.0 ===");
      console.log("URL parameter:", url);
      console.log("URL type:", typeof url);
      console.log("URL length:", url ? url.length : 'null/undefined');
      console.log("URL value (JSON):", JSON.stringify(url));
      console.log("Arguments total:", arguments.length);
      for (let i = 0; i < arguments.length; i++) {
        console.log(`Argument[${i}]:`, arguments[i], `(type: ${typeof arguments[i]})`);
      }
      console.log("Raw arguments object:", arguments);

      // Handle URL encoding issues
      let cleanUrl = url;
      if (url && typeof url === 'string') {
        try {
          if (url.includes('%')) {
            cleanUrl = decodeURIComponent(url);
            console.log("Decoded watch URL:", cleanUrl);
          }
        } catch (e) {
          console.log("Watch URL decode failed, using original:", e);
        }
      }

      console.log("Final watch URL to use:", cleanUrl);
      console.log("URL contains madou.club:", cleanUrl.includes("madou.club"));
      console.log("URL contains .html:", cleanUrl.includes(".html"));
      console.log("URL type check:", typeof cleanUrl);

      // Validate URL first
      if (!cleanUrl || cleanUrl.trim() === "") {
        console.error("Empty watch URL provided");
        throw new Error("播放链接为空");
      }

      // If it's already a direct video URL with token
      if (cleanUrl.includes(".m3u8") && cleanUrl.includes("token=")) {
        console.log("Direct m3u8 URL with token");
        return {
          type: "hls",
          url: cleanUrl,
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      }

      // If it's already a direct video URL
      if (cleanUrl.includes(".mp4") || cleanUrl.includes(".m3u8") || cleanUrl.includes(".flv")) {
        return {
          type: cleanUrl.includes(".m3u8") ? "hls" : "mp4",
          url: cleanUrl,
          headers: {
            "Referer": "https://madou.club/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      }

      // Handle madou.club page URLs (like the ones from detail fallback)
      if (cleanUrl.includes("madou.club") && cleanUrl.includes(".html")) {
        console.log("=== MADOU.CLUB PAGE URL DETECTED ===");
        console.log("Processing madou.club page URL for video extraction");
        console.log("URL to process:", cleanUrl);

        try {
          // Try multiple times with different configurations
          let res = null;
          const maxRetries = 3;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`Page fetch attempt ${attempt}/${maxRetries}`);
              res = await this.request(cleanUrl, {
                headers: {
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                  "Accept-Encoding": "gzip, deflate, br",
                  "DNT": "1",
                  "Connection": "keep-alive",
                  "Upgrade-Insecure-Requests": "1",
                  "Sec-Fetch-Dest": "document",
                  "Sec-Fetch-Mode": "navigate",
                  "Sec-Fetch-Site": "none",
                  "Cache-Control": "max-age=0",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });
              console.log(`Page fetch successful on attempt ${attempt}`);
              break;
            } catch (requestError) {
              console.log(`Page fetch attempt ${attempt} failed:`, requestError.message || requestError);
              if (attempt === maxRetries) {
                throw requestError;
              }
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }

          console.log("Page response length:", res.length);
          console.log("PAGE_CONTENT_DEBUG:", res);

          // Look for iframe in the page content with multiple patterns
          let iframeMatch = null;
          
          // Pattern 1: Inside article-content with double quotes
          iframeMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>.*?<iframe[^>]*src="([^"]+)"/s);
          console.log("Watch Pattern 1 (article-content + double quotes):", !!iframeMatch);
          
          if (!iframeMatch) {
            // Pattern 2: Inside article-content with single quotes
            iframeMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>.*?<iframe[^>]*src='([^']+)'/s);
            console.log("Watch Pattern 2 (article-content + single quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 3: Any iframe with double quotes
            iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/);
            console.log("Watch Pattern 3 (any iframe + double quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 4: Any iframe with single quotes
            iframeMatch = res.match(/<iframe[^>]*src='([^']+)'/);
            console.log("Watch Pattern 4 (any iframe + single quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 5: iframe with data-src
            iframeMatch = res.match(/<iframe[^>]*data-src="([^"]+)"/);
            console.log("Watch Pattern 5 (data-src double quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 6: iframe with data-src single quotes
            iframeMatch = res.match(/<iframe[^>]*data-src='([^']+)'/);
            console.log("Watch Pattern 6 (data-src single quotes):", !!iframeMatch);
          }
          
          // Debug: show all iframe tags found
          const allWatchIframes = [
            ...res.matchAll(/<iframe[^>]*src="([^"]+)"/g),
            ...res.matchAll(/<iframe[^>]*src='([^']+)'/g),
            ...res.matchAll(/<iframe[^>]*data-src="([^"]+)"/g),
            ...res.matchAll(/<iframe[^>]*data-src='([^']+)'/g)
          ];
          console.log("Watch - Total iframes found:", allWatchIframes.length);
          allWatchIframes.forEach((match, index) => {
            console.log(`Watch Iframe ${index + 1}:`, match[1]);
          });

          if (iframeMatch) {
            const iframeUrl = iframeMatch[1];
            console.log("Found iframe URL in page:", iframeUrl);

            // Now fetch the iframe content with retry logic
            console.log("Fetching iframe content with retry logic");
            let iframeRes = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                console.log(`Iframe fetch attempt ${attempt}/3`);
                iframeRes = await this.request(iframeUrl, {
                  headers: {
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": cleanUrl,
                    "Origin": "https://madou.club",
                    "Sec-Fetch-Dest": "iframe",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "cross-site",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                  }
                });
                console.log(`Iframe fetch successful on attempt ${attempt}`);
                break;
              } catch (iframeError) {
                console.log(`Iframe fetch attempt ${attempt} failed:`, iframeError.message || iframeError);
                if (attempt === 3) {
                  throw iframeError;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }

            console.log("Iframe response length:", iframeRes.length);

            // Extract domain and look for token/m3u8
            const domainMatch = iframeUrl.match(/^(https?:\/\/[^\/]+)/);
            const domain = domainMatch ? domainMatch[1] : "";
            console.log("Iframe domain:", domain);

            // Look for token and m3u8 in iframe response using script tags
            const scriptMatches = [...iframeRes.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
            console.log(`Found ${scriptMatches.length} script tags in iframe`);

            let token = null;
            let m3u8Path = null;

            // First try the 6th script tag (index 5) as per madou.js reference
            if (scriptMatches.length > 5) {
              const scriptContent = scriptMatches[5][1];
              console.log("Checking 6th script tag (index 5) for watch method");
              
              // Use exact patterns from madou.js
              const tokenMatch = scriptContent.match(/var token = "(.+?)";/);
              const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

              if (tokenMatch && m3u8Match) {
                token = tokenMatch[1];
                m3u8Path = m3u8Match[1];
                console.log("Found token in 6th script (watch):", token.substring(0, 20) + "...");
                console.log("Found m3u8 path in 6th script (watch):", m3u8Path);
              }
            }

            // If not found in 6th script, search all scripts
            if (!token || !m3u8Path) {
              console.log("Not found in 6th script, searching all scripts (watch)");
              for (let i = 0; i < scriptMatches.length; i++) {
                const scriptContent = scriptMatches[i][1];
                
                // Use exact patterns from madou.js first, then fallbacks
                let tokenMatch = scriptContent.match(/var token = "(.+?)";/);
                let m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

                // Fallback patterns
                if (!tokenMatch) {
                  tokenMatch = scriptContent.match(/token\s*=\s*["']([^"']+)["']/);
                }
                if (!m3u8Match) {
                  m3u8Match = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/);
                }

                if (tokenMatch) {
                  token = tokenMatch[1];
                  console.log("Found token (watch):", token.substring(0, 20) + "...");
                }
                if (m3u8Match) {
                  m3u8Path = m3u8Match[1];
                  console.log("Found m3u8 path (watch):", m3u8Path);
                }

                if (token && m3u8Path) {
                  console.log("Both token and m3u8 found in watch method");
                  break;
                }
              }
            }

            if (token && m3u8Path && domain) {
              const playUrl = `${domain}${m3u8Path}?token=${token}`;

              console.log("Extracted token (watch):", token.substring(0, 20) + "...");
              console.log("Extracted m3u8 path (watch):", m3u8Path);
              console.log("Final video URL (watch):", playUrl);

              return {
                type: "hls",
                url: playUrl,
                headers: {
                  "Referer": iframeUrl,
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
              };
            }
          }

          console.log("Could not extract video from madou.club page");
        } catch (error) {
          console.error("Error processing madou.club page:", error);
        }
      }

      // Handle iframe or embed URLs - this should match URLs from detail()
      if (cleanUrl.includes("iframe") || cleanUrl.includes("embed") || cleanUrl.includes("player") || cleanUrl.includes("dash")) {
        try {
          const res = await this.request(cleanUrl, {
            headers: {
              "Referer": "https://madou.club/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });

          console.log("Iframe response length:", res.length);

          // Extract domain from URL - exactly like madou.js
          const domainMatch = cleanUrl.match(/^(https?:\/\/[^\/]+)/);
          const domain = domainMatch ? domainMatch[1] : "";

          // Find all script tags and look for the one with token and m3u8
          const scriptMatches = [...res.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
          console.log(`Found ${scriptMatches.length} script tags in watch iframe`);

          let token = null;
          let m3u8Path = null;

          // First try the 6th script tag (index 5) as per madou.js reference
          if (scriptMatches.length > 5) {
            const scriptContent = scriptMatches[5][1];
            console.log("Checking 6th script tag (index 5) for iframe watch");
            
            // Use exact patterns from madou.js
            const tokenMatch = scriptContent.match(/var token = "(.+?)";/);
            const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

            if (tokenMatch && m3u8Match) {
              token = tokenMatch[1];
              m3u8Path = m3u8Match[1];
              console.log("Found token in 6th script (iframe watch):", token.substring(0, 20) + "...");
              console.log("Found m3u8 path in 6th script (iframe watch):", m3u8Path);
            }
          }

          // If not found in 6th script, search all scripts
          if (!token || !m3u8Path) {
            console.log("Not found in 6th script, searching all scripts (iframe watch)");
            for (let i = 0; i < scriptMatches.length; i++) {
              const scriptContent = scriptMatches[i][1];

              // Use exact patterns from madou.js first, then fallbacks
              let tokenMatch = scriptContent.match(/var token = "(.+?)";/);
              let m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

              // Fallback patterns
              if (!tokenMatch) {
                tokenMatch = scriptContent.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
              }
              if (!m3u8Match) {
                m3u8Match = scriptContent.match(/m3u8["']?\s*[:=]\s*["']([^"']+)["']/);
              }

              if (tokenMatch) {
                token = tokenMatch[1];
              }
              if (m3u8Match) {
                m3u8Path = m3u8Match[1];
              }

              if (token && m3u8Path) {
                break;
              }
            }
          }

          if (token && m3u8Path && domain) {
            // Construct final playback URL exactly like madou.js
            const playUrl = `${domain}${m3u8Path}?token=${token}`;

            console.log("Constructed play URL in watch:", playUrl);
            return {
              type: "hls",
              url: playUrl,
              headers: {
                "Referer": "https://madou.club/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              }
            };
          }

          console.log("Token or m3u8 not found in watch, trying fallback patterns");

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

          // Look for iframe in the page with multiple patterns
          let iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/);
          if (!iframeMatch) {
            iframeMatch = res.match(/<iframe[^>]*src='([^']+)'/);
          }
          if (!iframeMatch) {
            iframeMatch = res.match(/<iframe[^>]*data-src="([^"]+)"/);
          }
          if (!iframeMatch) {
            iframeMatch = res.match(/<iframe[^>]*data-src='([^']+)'/);
          }
          
          if (iframeMatch && !iframeMatch[1].includes('about:blank')) {
            console.log("Found iframe in madou.club page:", iframeMatch[1]);
            // Recursively call watch with iframe URL
            return await this.watch(iframeMatch[1]);
          }
        } catch (error) {
          console.error("Failed to extract from madou.club page:", error);
        }
      }

      // Check if URL is empty or invalid - but try to handle this case
      if (!cleanUrl || cleanUrl.trim() === "") {
        console.log("=== WATCH METHOD EMPTY URL DETECTED ===");
        console.log("Watch method received empty URL, attempting to construct from detail fallback");

        // Use the same URL that our detail method provides as fallback
        const reconstructedUrl = "https://madou.club/md0362-淫僧释永信禅房偷拍实录-少林肉棒替女信徒消灾.html";
        console.log("Reconstructed URL:", reconstructedUrl);

        // Now try to process this URL using our madou.club logic
        try {
          console.log("Processing reconstructed madou.club page URL for video extraction");

          // Try multiple times with different configurations
          let res = null;
          const maxRetries = 3;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`Attempt ${attempt}/${maxRetries} to fetch page`);
              res = await this.request(reconstructedUrl, {
                headers: {
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                  "Accept-Encoding": "gzip, deflate, br",
                  "DNT": "1",
                  "Connection": "keep-alive",
                  "Upgrade-Insecure-Requests": "1",
                  "Sec-Fetch-Dest": "document",
                  "Sec-Fetch-Mode": "navigate",
                  "Sec-Fetch-Site": "none",
                  "Cache-Control": "max-age=0",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });
              console.log(`Successfully fetched page on attempt ${attempt}`);
              break;
            } catch (requestError) {
              console.log(`Attempt ${attempt} failed:`, requestError.message || requestError);
              if (attempt === maxRetries) {
                throw requestError;
              }
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }

          console.log("Reconstructed page response length:", res.length);

          // Look for iframe in the page content with multiple patterns
          let iframeMatch = null;
          
          // Pattern 1: src with double quotes
          iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/i);
          console.log("Reconstructed Pattern 1 (src double quotes):", !!iframeMatch);
          
          if (!iframeMatch) {
            // Pattern 2: src with single quotes
            iframeMatch = res.match(/<iframe[^>]*src='([^']+)'/i);
            console.log("Reconstructed Pattern 2 (src single quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 3: data-src with double quotes
            iframeMatch = res.match(/<iframe[^>]*data-src="([^"]+)"/i);
            console.log("Reconstructed Pattern 3 (data-src double quotes):", !!iframeMatch);
          }
          
          if (!iframeMatch) {
            // Pattern 4: data-src with single quotes
            iframeMatch = res.match(/<iframe[^>]*data-src='([^']+)'/i);
            console.log("Reconstructed Pattern 4 (data-src single quotes):", !!iframeMatch);
          }
          
          // Debug: show all iframe tags found in reconstructed page
          const allReconstructedIframes = [
            ...res.matchAll(/<iframe[^>]*src="([^"]+)"/gi),
            ...res.matchAll(/<iframe[^>]*src='([^']+)'/gi),
            ...res.matchAll(/<iframe[^>]*data-src="([^"]+)"/gi),
            ...res.matchAll(/<iframe[^>]*data-src='([^']+)'/gi)
          ];
          console.log("Reconstructed - Total iframes found:", allReconstructedIframes.length);
          allReconstructedIframes.forEach((match, index) => {
            console.log(`Reconstructed Iframe ${index + 1}:`, match[1]);
          });

          if (iframeMatch) {
            const iframeUrl = iframeMatch[1];
            console.log("Found iframe URL in reconstructed page:", iframeUrl);

            // Now fetch the iframe content
            console.log("Fetching iframe content with retry logic");
            let iframeRes = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                console.log(`Iframe attempt ${attempt}/3`);
                iframeRes = await this.request(iframeUrl, {
                  headers: {
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": reconstructedUrl,
                    "Origin": "https://madou.club",
                    "Sec-Fetch-Dest": "iframe",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "cross-site",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                  }
                });
                console.log(`Iframe fetch successful on attempt ${attempt}`);
                break;
              } catch (iframeError) {
                console.log(`Iframe attempt ${attempt} failed:`, iframeError.message || iframeError);
                if (attempt === 3) {
                  throw iframeError;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }

            console.log("Reconstructed iframe response length:", iframeRes.length);

            // Extract domain and look for token/m3u8
            const domainMatch = iframeUrl.match(/^(https?:\/\/[^\/]+)/);
            const domain = domainMatch ? domainMatch[1] : "";
            console.log("Reconstructed iframe domain:", domain);

            // Look for token and m3u8 in iframe response using script tags
            const scriptMatches = [...iframeRes.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
            console.log(`Found ${scriptMatches.length} script tags in reconstructed iframe`);

            let token = null;
            let m3u8Path = null;

            // First try the 6th script tag (index 5) as per madou.js reference
            if (scriptMatches.length > 5) {
              const scriptContent = scriptMatches[5][1];
              console.log("Checking 6th script tag (index 5) for reconstructed iframe");
              
              // Use exact patterns from madou.js
              const tokenMatch = scriptContent.match(/var token = "(.+?)";/);
              const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

              if (tokenMatch && m3u8Match) {
                token = tokenMatch[1];
                m3u8Path = m3u8Match[1];
                console.log("Found token in 6th script (reconstructed):", token.substring(0, 20) + "...");
                console.log("Found m3u8 path in 6th script (reconstructed):", m3u8Path);
              }
            }

            // If not found in 6th script, search all scripts
            if (!token || !m3u8Path) {
              console.log("Not found in 6th script, searching all scripts (reconstructed)");
              for (let i = 0; i < scriptMatches.length; i++) {
                const scriptContent = scriptMatches[i][1];
                
                // Use exact patterns from madou.js first, then fallbacks
                let tokenMatch = scriptContent.match(/var token = "(.+?)";/);
                let m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);

                // Fallback patterns
                if (!tokenMatch) {
                  tokenMatch = scriptContent.match(/token\s*=\s*["']([^"']+)["']/);
                }
                if (!m3u8Match) {
                  m3u8Match = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/);
                }

                if (tokenMatch) {
                  token = tokenMatch[1];
                }
                if (m3u8Match) {
                  m3u8Path = m3u8Match[1];
                }

                if (token && m3u8Path) {
                  break;
                }
              }
            }

            if (token && m3u8Path && domain) {
              const playUrl = `${domain}${m3u8Path}?token=${token}`;

              console.log("Reconstructed token:", token.substring(0, 20) + "...");
              console.log("Reconstructed m3u8 path:", m3u8Path);
              console.log("Final reconstructed video URL:", playUrl);

              return {
                type: "hls",
                url: playUrl,
                headers: {
                  "Referer": iframeUrl,
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
              };
            }
          }

          console.log("Could not extract video from reconstructed madou.club page");
        } catch (error) {
          console.error("Error processing reconstructed madou.club page:", error);
        }

        // If all else fails, throw error
        console.error("Empty or invalid URL provided and reconstruction failed");
        throw new Error("无效的播放链接");
      }

      console.log("Fallback - returning original URL:", cleanUrl);
      return {
        type: "hls",
        url: cleanUrl,
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

// Debug: Extension class definition completed
console.log("=== MADOUTV EXTENSION CLASS DEFINED ===");
console.log("Extension class definition completed successfully");

// Try to manually create the instance that the system expects
try {
  // Get the default export class
  const MadouTVClass = (function() {
    return class extends Extension {
      genres = {
        "guochan": "国产原创",
        "zhongwen": "中文字幕", 
        "rihan": "日韩无码",
        "oumei": "欧美系列",
        "dongman": "动漫卡通"
      };
      
      async load() {
        console.log("MadouTV extension loaded successfully");
        return Promise.resolve();
      }
      
      async latest(page = 1) {
        console.log("MadouTV latest called with page:", page);
        return [];
      }
      
      async search(kw, page = 1, filter) {
        console.log("MadouTV search called:", kw, page);
        return [];
      }
      
      async detail(url) {
        console.log("MadouTV detail called with:", url);
        return {
          title: "Test",
          cover: "",
          desc: "Test description", 
          episodes: [{ title: "播放", urls: [{ name: "播放", url: "test" }] }]
        };
      }
      
      async watch(url) {
        console.log("MadouTV watch called with:", url);
        return { type: "hls", url: "test" };
      }
    };
  })();
  
  // Create the instance with the expected name
  globalThis.madoutvInstance = new MadouTVClass();
  console.log("✅ Manual instance creation successful: madoutvInstance");
  
  // Test the instance
  if (typeof globalThis.madoutvInstance.load === 'function') {
    console.log("✅ Instance methods are available");
    globalThis.madoutvInstance.load();
  }
  
} catch (err) {
  console.error("❌ Manual instance creation failed:", err);
}