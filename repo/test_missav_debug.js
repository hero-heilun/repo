// ==MiruExtension==
// @name         MISSAV DEBUG
// @version      v0.0.1
// @author       debug
// @lang         all
// @license      MIT
// @icon         https://missav.ai/favicon.ico
// @package      missav.debug
// @type         bangumi
// @webSite      https://missav.ai
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  constructor() {
    super();
    this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
  }

  async latest(page = 1) {
    try {
      console.log("=== MISSAV DEBUG START ===");
      console.log("Page:", page);
      
      const url = page === 1 ? "" : `?page=${page}`;
      console.log("Request URL:", url);

      const res = await this.request(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        }
      });

      console.log("Response length:", res.length);
      console.log("Response type:", typeof res);
      
      // 检查响应内容
      if (res.includes('Just a moment...') || res.includes('cloudflare')) {
        console.log("⚠️ Cloudflare detected");
        return [{
          title: "Cloudflare保护检测到",
          url: "/debug-cf",
          cover: "",
          update: "Debug"
        }];
      }
      
      // 截取前1000字符用于调试
      const preview = res.substring(0, 1000);
      console.log("HTML Preview (first 1000 chars):", preview);
      
      // 查找各种可能的视频链接格式
      console.log("\n=== LINK ANALYSIS ===");
      
      // 1. 查找所有href链接
      const allLinks = [...res.matchAll(/<a[^>]*href="([^"]+)"[^>]*>/g)];
      console.log(`Found ${allLinks.length} total links`);
      
      // 显示前20个链接
      allLinks.slice(0, 20).forEach((link, index) => {
        console.log(`Link ${index + 1}: ${link[1]}`);
      });
      
      console.log("\n=== VIDEO LINK PATTERNS ===");
      
      // 2. 查找可能的视频代码模式
      const patterns = [
        /\/[A-Z]{2,8}-?\d{3,5}/g,  // 标准AV代码
        /\/[A-Z0-9]{4,}-?[A-Z0-9]*/g,  // 更宽泛的模式
        /\/[^\/\s"]{6,}/g  // 基本模式（6个字符以上）
      ];
      
      patterns.forEach((pattern, index) => {
        const matches = [...res.matchAll(pattern)];
        console.log(`Pattern ${index + 1} (${pattern}): ${matches.length} matches`);
        matches.slice(0, 10).forEach((match, i) => {
          console.log(`  Match ${i + 1}: ${match[0]}`);
        });
      });
      
      console.log("\n=== SECTION ANALYSIS ===");
      
      // 3. 查找可能的视频容器区域
      const containerPatterns = [
        /<div[^>]*class="[^"]*grid[^"]*"/g,
        /<div[^>]*class="[^"]*video[^"]*"/g,
        /<div[^>]*class="[^"]*content[^"]*"/g,
        /<main[^>]*>/g,
        /<section[^>]*>/g
      ];
      
      containerPatterns.forEach((pattern, index) => {
        const matches = [...res.matchAll(pattern)];
        console.log(`Container pattern ${index + 1}: ${matches.length} matches`);
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`  Container ${i + 1}: ${match[0]}`);
        });
      });
      
      console.log("\n=== IMAGE ANALYSIS ===");
      
      // 4. 查找封面图片模式
      const imgMatches = [...res.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
      console.log(`Found ${imgMatches.length} images`);
      imgMatches.slice(0, 10).forEach((img, index) => {
        console.log(`Image ${index + 1}: ${img[1]}`);
      });
      
      console.log("\n=== TITLE ANALYSIS ===");
      
      // 5. 查找可能的标题模式
      const titleMatches = [...res.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/g)];
      console.log(`Found ${titleMatches.length} headings`);
      titleMatches.slice(0, 10).forEach((title, index) => {
        console.log(`Title ${index + 1}: ${title[1].trim()}`);
      });
      
      // 返回调试结果
      const debugVideos = [];
      
      // 尝试提取一些视频链接用于测试
      const videoLinks = [...res.matchAll(/<a[^>]*href="(\/[A-Z0-9][A-Z0-9-]{4,})"[^>]*>/g)];
      videoLinks.slice(0, 5).forEach((link, index) => {
        const url = link[1];
        const code = url.replace(/^\//, '');
        debugVideos.push({
          title: `DEBUG ${index + 1}: ${code}`,
          url: url,
          cover: `https://pics.xjav.pro/cover/${code}_b.jpg`,
          update: `Debug ${index + 1}`
        });
      });
      
      if (debugVideos.length === 0) {
        debugVideos.push({
          title: "调试模式 - 未找到视频链接",
          url: "/debug-no-links",
          cover: "",
          update: "Debug"
        });
      }
      
      console.log(`=== DEBUG COMPLETE - Found ${debugVideos.length} videos ===`);
      return debugVideos;
      
    } catch (error) {
      console.error("Debug error:", error);
      return [{
        title: `调试错误: ${error.message}`,
        url: "/debug-error",
        cover: "",
        update: "Error"
      }];
    }
  }

  async search(kw, page) {
    return this.latest(page);
  }

  async detail(url) {
    console.log("=== DEBUG DETAIL ===");
    console.log("URL:", url);
    
    return {
      title: `调试详情页: ${url}`,
      cover: "",
      desc: "这是调试模式的详情页",
      episodes: [{
        title: "调试播放",
        urls: [{
          name: "调试链接",
          url: "https://example.com/debug.mp4"
        }]
      }]
    };
  }

  async watch(url) {
    console.log("=== DEBUG WATCH ===");
    console.log("URL:", url);
    
    return {
      type: "mp4",
      url: "https://example.com/debug.mp4"
    };
  }
}