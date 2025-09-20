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
  genres = {};

  async load() {
    try {
      const res = await this.request("", {
        headers: { "Miru-Url": "https://madou.club" },
      });
      
      // Extract categories from navigation
      const categories = [...res.matchAll(/href="\/category\/(\d+).*?>(.+?)</g)];
      categories.forEach(([, id, name]) => {
        this.genres[id] = name.trim();
      });
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
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
      const res = await this.request(`/page/${page}`, {
        headers: { "Miru-Url": "https://madou.club" },
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
        url = `/category/${filter.genres[0]}/page/${page}`;
      } else if (kw) {
        url = `/search/${encodeURIComponent(kw)}/page/${page}`;
      }

      const res = await this.request(url, {
        headers: { "Miru-Url": "https://madou.club" },
      });
      
      return this.parseVideoList(res);
    } catch (error) {
      console.error("Failed to search:", error);
      return [];
    }
  }

  parseVideoList(html) {
    const videos = [];
    const videoMatches = [...html.matchAll(/<article[^>]*class="[^"]*post[^"]*"[^>]*>.*?<\/article>/gs)];
    
    for (const match of videoMatches) {
      const videoHtml = match[0];
      
      // Extract title
      const titleMatch = videoHtml.match(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>.*?<a[^>]*>([^<]+)</s);
      const title = titleMatch ? titleMatch[1].trim() : "";
      
      // Extract URL
      const urlMatch = videoHtml.match(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>.*?<a[^>]*href="([^"]+)"/s);
      const url = urlMatch ? urlMatch[1] : "";
      
      // Extract cover image
      const coverMatch = videoHtml.match(/<img[^>]*src="([^"]+)"/);
      const cover = coverMatch ? coverMatch[1] : "";
      
      // Extract update info (date or remarks)
      const dateMatch = videoHtml.match(/<time[^>]*>([^<]+)</);
      const update = dateMatch ? dateMatch[1].trim() : "";
      
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
        headers: { "Miru-Url": "https://madou.club" },
      });
      
      // Extract title
      const titleMatch = res.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      
      // Extract cover
      const coverMatch = res.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
      const cover = coverMatch ? coverMatch[1] : "";
      
      // Extract description
      const descMatch = res.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)<\/div>/s);
      let desc = "暂无介绍";
      if (descMatch) {
        desc = descMatch[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      
      // Extract video URLs
      const urls = [];
      const videoMatches = [...res.matchAll(/<iframe[^>]*src="([^"]+)"/g)];
      
      videoMatches.forEach((match, index) => {
        urls.push({
          name: `播放线路${index + 1}`,
          url: match[1],
        });
      });
      
      // Also check for direct video links
      const directVideoMatches = [...res.matchAll(/<video[^>]*>.*?<source[^>]*src="([^"]+)"/gs)];
      directVideoMatches.forEach((match, index) => {
        urls.push({
          name: `直链${index + 1}`,
          url: match[1],
        });
      });
      
      return {
        title,
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
      // Handle iframe URLs
      if (url.includes("iframe") || url.includes("embed")) {
        const res = await this.request(url);
        
        // Try to extract direct video URL from iframe content
        const videoMatch = res.match(/<source[^>]*src="([^"]+)"/);
        if (videoMatch) {
          return { type: "hls", url: videoMatch[1] };
        }
        
        // Try to extract m3u8 URLs
        const m3u8Match = res.match(/["']([^"']*\.m3u8[^"']*)['"]/);
        if (m3u8Match) {
          return { type: "hls", url: m3u8Match[1] };
        }
      }
      
      // If it's already a direct video URL
      if (url.includes(".mp4") || url.includes(".m3u8")) {
        return { type: url.includes(".m3u8") ? "hls" : "mp4", url };
      }
      
      console.log("Playing URL:", url);
      return { type: "hls", url };
    } catch (error) {
      console.error("Failed to get watch URL:", error);
      return { type: "hls", url };
    }
  }
}