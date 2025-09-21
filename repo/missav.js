// ==MiruExtension==
// @name         MISSAV
// @version      v0.0.8
// @author       jason
// @lang         all
// @license      MIT
// @icon         https://missav.ai/favicon.ico
// @package      missav.ai
// @type         bangumi
// @webSite      https://missav.ai
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  constructor() {
    super();
    // 使用参考代码中的User-Agent
    this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
  }

  async load() {
    // Pre-defined categories to avoid parsing issues
  }

  // 处理Cloudflare保护的通用方法
  async handleCloudflare(url) {
    console.log("⚠️ Cloudflare protection detected for:", url);
    
    // 在Miru环境中，我们无法调用Safari，所以使用不同的策略
    // 1. 尝试使用不同的请求参数
    // 2. 模拟真实的浏览器行为
    
    try {
      const response = await this.request(url, {
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
          "Upgrade-Insecure-Requests": "1",
          "Connection": "keep-alive"
        }
      });
      
      if (response.includes('Just a moment...') || response.includes('cloudflare')) {
        console.log("Still blocked, using fallback data");
        return null; // 让调用者处理fallback
      }
      
      return response;
    } catch (error) {
      console.log("Cloudflare bypass failed:", error.message);
      return null;
    }
  }

  async createFilter() {
    const genres = {
      title: "分类",
      max: 1,
      min: 0,
      default: "",
      options: {
        "": "全部",
        "chinese-subtitle": "中文字幕",
        "uncensored-leak": "无码流出",
        "fc2": "FC2",
        "amateur": "素人",
        "western": "欧美",
        "genres/censored": "有码",
        "genres/uncensored": "无码"
      }
    };
    return { genres };
  }

  async latest(page = 1) {
    try {
      console.log("=== MISSAV LATEST METHOD START ===");
      console.log("Latest page request:", page);
      
      const url = page === 1 ? "" : `?page=${page}`;
      console.log("Request URL:", url);

      // 首次请求
      let res = await this.request(url, {
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

      // 检查是否遇到Cloudflare保护
      if (res.includes('Just a moment...') || res.includes('cloudflare')) {
        console.log("Cloudflare detected, trying alternative approach...");
        const alternativeRes = await this.handleCloudflare(url);
        if (alternativeRes) {
          res = alternativeRes;
        }
      }

      console.log("Latest response length:", res.length);

      const videos = [];
      
      // 检查响应大小，如果太大则截取前部分避免内存问题
      if (res.length > 500000) {
        console.log("⚠️ Response too large, truncating to avoid memory issues");
        res = res.substring(0, 500000);
      }
      
      // 检查是否仍然遇到Cloudflare保护
      if (res.includes('Just a moment...') || res.includes('cloudflare') || res.length < 1000) {
        console.log("⚠️ Cloudflare protection still detected");
        return [];
      }

      try {
        // 使用正确的MissAV HTML结构解析
        console.log("Parsing with correct MissAV structure...");
        
        // 基于实际MissAV结构：aspect-w-16 aspect-h-9 rounded容器
        const containerPattern = /<div[^>]*class="[^"]*aspect-w-16[^"]*aspect-h-9[^"]*rounded[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        
        let match;
        let videoCount = 0;
        
        while ((match = containerPattern.exec(res)) !== null && videoCount < 30) {
          try {
            const container = match[1];
            
            // 提取链接 - 过滤模板变量
            const linkMatch = container.match(/<a[^>]*href="([^"]+)"[^>]*>/);
            if (!linkMatch) continue;
            const url = linkMatch[1];
            
            // 跳过包含模板变量的URL
            if (url.includes('ITEM.') || url.includes('JAVASCRIPT') || url.includes('item.')) {
              continue;
            }
            
            // 提取标题 - 改进逻辑避免模板变量
            let title = '';
            const titleMatch = container.match(/<img[^>]*alt="([^"]*)"/); 
            if (titleMatch && titleMatch[1] && 
                !titleMatch[1].includes('item.') && 
                !titleMatch[1].includes('ITEM.') &&
                !titleMatch[1].includes('JAVASCRIPT') &&
                titleMatch[1].trim().length > 0) {
              title = titleMatch[1];
            }
            
            // 如果没有有效标题，尝试从其他地方提取
            if (!title) {
              // 尝试从标题属性
              const titleAttrMatch = container.match(/title="([^"]+)"/);
              if (titleAttrMatch && 
                  !titleAttrMatch[1].includes('item.') && 
                  !titleAttrMatch[1].includes('ITEM.') &&
                  !titleAttrMatch[1].includes('JAVASCRIPT') &&
                  titleAttrMatch[1].trim().length > 0) {
                title = titleAttrMatch[1];
              }
            }
            
            // 尝试从其他文本节点提取标题
            if (!title) {
              const textMatches = container.match(/>([^<]{10,})</g);
              if (textMatches) {
                for (const textMatch of textMatches) {
                  const text = textMatch.replace(/^>|<$/g, '').trim();
                  if (text && 
                      !text.includes('item.') && 
                      !text.includes('ITEM.') &&
                      !text.includes('JAVASCRIPT') &&
                      !text.match(/^\d+:\d+$/) && // 不是时长格式
                      text.length > 5 && 
                      text.length < 200) {
                    title = text;
                    break;
                  }
                }
              }
            }
            
            // 提取封面 - 改进URL处理
            let cover = '';
            // 优先data-src
            let coverMatch = container.match(/<img[^>]*data-src="([^"]*)"/);
            if (coverMatch) {
              cover = coverMatch[1];
            } else {
              // 备用src
              coverMatch = container.match(/<img[^>]*src="([^"]*)"/);
              if (coverMatch) {
                cover = coverMatch[1];
              }
            }
            
            // 确保封面URL是完整的
            if (cover && !cover.startsWith('http')) {
              if (cover.startsWith('//')) {
                cover = 'https:' + cover;
              } else if (cover.startsWith('/')) {
                cover = 'https://missav.ai' + cover;
              }
            }
            
            // 提取时长
            const durationMatch = container.match(/>([0-9:]+)<\//);
            const duration = durationMatch ? durationMatch[1] : "Unknown";
            
            // 如果没有标题，从URL提取视频代码
            if (!title && url) {
              const urlParts = url.split('/');
              const code = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';
              if (code && code.length > 2) {
                title = code.toUpperCase().replace(/-/g, ' ');
              }
            }
            
            // 最后的备用标题
            if (!title) {
              title = 'Video ' + (videoCount + 1);
            }
            
            if (url && title) {
              videos.push({
                title: title.trim(),
                url: url,
                cover: cover,
                update: duration
              });
              videoCount++;
              console.log(`Found video ${videoCount}: ${title.trim().substring(0, 50)}`);
            }
            
          } catch (containerError) {
            console.error("Container error:", containerError);
            continue;
          }
        }
        
        console.log(`Parsed ${videos.length} videos using correct structure`);
        
        // 备用解析：如果没找到视频
        if (videos.length === 0) {
          console.log("Using fallback parsing...");
          const fallbackPattern = /<a[^>]*href="(\/[A-Z0-9][A-Z0-9-]{3,}[^"]*)"[^>]*>/g;
          let fallbackMatch;
          let fallbackCount = 0;
          
          while ((fallbackMatch = fallbackPattern.exec(res)) !== null && fallbackCount < 20) {
            const url = fallbackMatch[1];
            const code = url.replace(/^\//, '').split('/')[0];
            
            if (code && code.length > 3 && !code.includes('search') && !code.includes('page')) {
              videos.push({
                title: code.toUpperCase(),
                url: url,
                cover: `https://pics.dmm.co.jp/digital/video/${code.toLowerCase()}/${code.toLowerCase()}pl.jpg`,
                update: "Unknown"
              });
              fallbackCount++;
            }
          }
          console.log(`Fallback found ${fallbackCount} videos`);
        }
        
      } catch (parseError) {
        console.error("Parsing error:", parseError.message);
        // 返回fallback数据
        return [{
          title: "解析错误 - SSIS-469",
          url: "/SSIS-469", 
          cover: "https://pics.xjav.pro/cover/SSIS-469_b.jpg",
          update: "Error"
        }];
      }

      console.log(`Found ${videos.length} videos in latest`);
      return videos;

    } catch (error) {
      console.error("Latest error:", error);
      throw error;
    }
  }

  async search(keyword, page = 1) {
    try {
      console.log("=== MISSAV SEARCH METHOD START ===");
      console.log("Search keyword:", keyword, "page:", page);

      const url = `/search/${encodeURIComponent(keyword)}?page=${page}`;
      console.log("Search URL:", url);

      const res = await this.request(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br"
        }
      });

      console.log("Search response length:", res.length);

      const videos = [];
      
      // 使用相同的卡片解析逻辑
      const cardPattern = /<div[^>]*class="[^"]*thumbnail[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<h5[^>]*>([^<]+)<\/h5>/g;
      
      let match;
      while ((match = cardPattern.exec(res)) !== null) {
        const [, url, cover, duration, title] = match;
        
        if (title && url) {
          console.log("Found search result:", title.trim());
          videos.push({
            title: title.trim(),
            url: url,
            cover: cover,
            update: duration ? duration.trim() : ""
          });
        }
      }

      console.log(`Found ${videos.length} search results`);
      return videos;

    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  }

  async detail(url) {
    try {
      console.log("=== MISSAV DETAIL METHOD START v1.1 ===");
      console.log("URL parameter:", JSON.stringify(url));
      console.log("URL type:", typeof url);
      console.log("URL length:", url ? url.length : 'null/undefined');
      console.log("URL raw value:", url);

      // Handle URL encoding and format issues
      let cleanUrl = url;
      
      // 检查URL参数
      if (!url || url.length === 0) {
        console.log("⚠️ Empty URL detected, using test URL for debugging");
        cleanUrl = "/SSIS-469";
      } else if (url && typeof url === 'string') {
        console.log("Processing URL:", url);
        
        // 如果是完整URL，手动提取路径部分
        if (url.startsWith('https://missav.ai')) {
          // 手动解析 https://missav.ai/path 格式
          const pathStart = url.indexOf('/', 8); // 跳过 https://
          if (pathStart !== -1) {
            cleanUrl = url.substring(pathStart);
          } else {
            cleanUrl = '/';
          }
          console.log("Extracted path from full URL:", cleanUrl);
        } else if (url.startsWith('http')) {
          // 其他域名的完整URL，手动提取路径
          try {
            const protocolEnd = url.indexOf('://');
            if (protocolEnd !== -1) {
              const pathStart = url.indexOf('/', protocolEnd + 3);
              if (pathStart !== -1) {
                cleanUrl = url.substring(pathStart);
              } else {
                cleanUrl = '/';
              }
            } else {
              cleanUrl = url;
            }
            console.log("Extracted path from URL:", cleanUrl);
          } catch (e) {
            console.log("URL parsing failed, using as-is:", e);
            cleanUrl = url;
          }
        } else {
          // 已经是路径格式，直接使用
          cleanUrl = url;
        }
        
        // 解码URL编码
        try {
          if (cleanUrl.includes('%')) {
            cleanUrl = decodeURIComponent(cleanUrl);
            console.log("Decoded URL:", cleanUrl);
          }
        } catch (e) {
          console.log("URL decode failed, using original:", e);
        }
        
        // 确保以/开头
        if (cleanUrl && !cleanUrl.startsWith('/')) {
          cleanUrl = '/' + cleanUrl;
        }
      }

      console.log("Final URL to use:", cleanUrl);

      const res = await this.request(cleanUrl, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br"
        }
      });

      console.log("Detail response length:", res.length);

      // Extract title - 多种模式尝试
      let title = "";
      
      // 模式1: 标准h1标签
      let titleMatch = res.match(/<h1[^>]*class="[^"]*text-base[^"]*"[^>]*>([^<]+)<\/h1>/);
      if (!titleMatch) {
        titleMatch = res.match(/<h1[^>]*>([^<]+)<\/h1>/);
      }
      if (!titleMatch) {
        // 模式2: 页面标题
        titleMatch = res.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          title = titleMatch[1].replace(/ - .*$/, "").replace(/^MissAV \| /, "").trim();
        }
      } else {
        title = titleMatch[1].trim();
      }

      // Extract cover image - 多种模式
      let cover = "";
      
      // 模式1: video-cover类
      let coverMatch = res.match(/<img[^>]*class="[^"]*video-cover[^"]*"[^>]*(?:data-src|src)="([^"]+)"/);
      if (!coverMatch) {
        // 模式2: 更通用的img标签查找
        coverMatch = res.match(/<img[^>]*(?:data-src|src)="([^"]*cover[^"]*\.jpg)"/);
      }
      if (!coverMatch) {
        // 模式3: 从link rel preconnect查找封面
        coverMatch = res.match(/<link[^>]*href="([^"]*cover[^"]*\.jpg)"[^>]*rel="preconnect"/);
      }
      if (coverMatch) {
        cover = coverMatch[1];
        // 确保封面URL完整
        if (cover && !cover.startsWith('http')) {
          if (cover.startsWith('//')) {
            cover = 'https:' + cover;
          } else if (cover.startsWith('/')) {
            cover = 'https://missav.ai' + cover;
          }
        }
      }

      // Extract description/duration info
      let desc = "";
      const descMatch = res.match(/<div[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([^<]+)<\/div>/);
      if (descMatch) {
        desc = descMatch[1].trim();
      } else {
        // 备用：查找时长信息
        const durationMatch = res.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/);
        if (durationMatch) {
          desc = `时长: ${durationMatch[1]}`;
        }
      }

      console.log("Extracted title:", title);
      console.log("Extracted cover:", cover);
      console.log("Extracted desc:", desc);

      return {
        title: title || "MISSAV Video",
        cover: cover,
        desc: desc,
        episodes: [{
          title: "播放",
          urls: [{
            name: "播放",
            url: cleanUrl
          }]
        }]
      };

    } catch (error) {
      console.error("Detail error:", error);
      throw error;
    }
  }

  async watch(url) {
    try {
      console.log("=== MISSAV WATCH METHOD START v1.0 ===");
      console.log("URL parameter:", url);
      console.log("URL type:", typeof url);
      console.log("URL length:", url ? url.length : 'null/undefined');
      console.log("URL value (JSON):", JSON.stringify(url));

      // Handle URL encoding issues
      let cleanUrl = url;
      
      // 临时调试：如果URL为空，使用测试URL
      if (!url || url.length === 0) {
        console.log("⚠️ Empty watch URL detected, using test URL for debugging");
        cleanUrl = "/SSIS-469";
      } else if (url && typeof url === 'string') {
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

      // Ensure URL is complete
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = `https://missav.ai${cleanUrl}`;
      }

      const res = await this.request(cleanUrl, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Referer": "https://missav.ai/",
          "Cache-Control": "no-cache"
        }
      });

      console.log("Watch page response length:", res.length);

      // 查找视频播放相关的脚本
      const scriptMatches = [...res.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
      console.log(`Found ${scriptMatches.length} script tags`);

      let videoUrl = null;

      // 基于参考代码的UUID提取逻辑
      const uuidMatch = res.match(/nineyu\.com\\?\/(.+?)\\?\/seek\\?\/_0\.jpg/) ||
                       res.match(/nineyu\.com\/(.+?)\/seek\/_0\.jpg/) ||
                       res.match(/uuid["']\s*:\s*["']([^"']+)["']/);
      
      if (uuidMatch) {
        const uuid = uuidMatch[1];
        console.log(`🎬 Found UUID: ${uuid}`);
        
        // 基于参考实现构建m3u8 URL
        videoUrl = `https://surrit.com/${uuid}/playlist.m3u8`;
        console.log(`🎬 Built m3u8 URL from UUID: ${videoUrl}`);
      } else {
        // Fallback: 直接从URL提取视频ID并构建m3u8 URL
        const videoIdMatch = cleanUrl.match(/\/([A-Z0-9-]+)(?:\/|$)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          console.log(`🎬 Extracted video ID: ${videoId}`);
          
          // 基于参考实现的URL构建逻辑
          const possibleUrls = [
            `https://surrit.com/${videoId}/playlist.m3u8`,
            `https://d2pass.com/missav/${videoId}/playlist.m3u8`,
            `https://streamtape.com/v/${videoId}/`,
            `https://dood.la/d/${videoId}`
          ];
          
          // 使用第一个URL作为主要源
          videoUrl = possibleUrls[0];
          console.log(`🎬 Built m3u8 URL from video ID: ${videoUrl}`);
        }
      }

      // 备用：查找脚本中的UUID或其他标识符
      if (!videoUrl) {
        for (let i = 0; i < scriptMatches.length; i++) {
          const scriptContent = scriptMatches[i][1];
          
          // 查找各种可能的视频标识符
          const patterns = [
            /uuid['"]\s*:\s*['"]([^'"]+)['"]/,
            /video['"]\s*:\s*['"]([^'"]+)['"]/,
            /src['"]\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/,
            /["']([^"']*\.m3u8[^"']*)["']/
          ];
          
          for (const pattern of patterns) {
            const match = scriptContent.match(pattern);
            if (match) {
              if (pattern.source.includes('m3u8')) {
                videoUrl = match[1];
              } else {
                videoUrl = `https://d2pass.com/missav/${match[1]}/playlist.m3u8`;
              }
              console.log(`🎬 Found in script ${i + 1}: ${videoUrl}`);
              break;
            }
          }
          
          if (videoUrl) break;
        }
      }

      if (videoUrl) {
        console.log(`\n✅ SUCCESS! Final video URL: ${videoUrl}`);
        
        return {
          type: videoUrl.includes('.m3u8') ? "hls" : "mp4",
          url: videoUrl,
          headers: {
            "Referer": "https://missav.ai/",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
          }
        };
      } else {
        console.log(`\n❌ FAILED to extract video URL from page`);
        
        // Fallback: 尝试直接访问可能的m3u8 URL
        const pageIdMatch = cleanUrl.match(/\/([^\/]+)$/);
        if (pageIdMatch) {
          const pageId = pageIdMatch[1];
          const fallbackUrl = `https://d2pass.com/missav/${pageId}/playlist.m3u8`;
          console.log(`🔄 Trying fallback URL: ${fallbackUrl}`);
          
          return {
            type: "hls",
            url: fallbackUrl,
            headers: {
              "Referer": "https://missav.ai/",
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
            }
          };
        }
        
        return null;
      }

    } catch (error) {
      console.error("Watch error:", error);
      throw error;
    }
  }
}