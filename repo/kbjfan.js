// ==MiruExtension==
// @name         KBJFan
// @version      v0.0.1
// @author       TechCat
// @lang         all
// @license      MIT
// @icon         https://www.kbjfan.com/wp-content/uploads/2024/07/ce55db65b720240703143112.png
// @package      kbjfan.com
// @type         bangumi
// @webSite      https://www.kbjfan.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page = 1) {
    console.log(`[KBJFan] Fetching latest videos - page ${page}`);
    
    let url;
    if (page === 1) {
      url = 'https://www.kbjfan.com';
    } else {
      url = `https://www.kbjfan.com/page/${page}/`;
    }
    
    console.log(`[KBJFan] Request URL: ${url}`);
    const response = await this.request(url);
    console.log(`[KBJFan] Response length: ${response.length}`);
    
    return this.parseVideoList(response);
  }

  async search(keyword, page = 1) {
    console.log(`[KBJFan] Searching for: ${keyword}, page: ${page}`);
    
    const encodedKeyword = encodeURIComponent(keyword);
    let url;
    if (page === 1) {
      url = `https://www.kbjfan.com/?s=${encodedKeyword}`;
    } else {
      url = `https://www.kbjfan.com/page/${page}/?s=${encodedKeyword}`;
    }
    
    console.log(`[KBJFan] Search URL: ${url}`);
    const response = await this.request(url);
    
    return this.parseVideoList(response);
  }

  parseVideoList(html) {
    console.log(`[KBJFan] Parsing video list from HTML...`);
    
    const videos = [];
    
    // Try multiple patterns for video cards
    const patterns = [
      // Pattern 1: Common WordPress post structure
      /<article[^>]*class="[^"]*posts-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>[\s\S]*?<h[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/article>/gi,
      
      // Pattern 2: Direct link pattern
      /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi,
      
      // Pattern 3: Post title pattern
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>[\s\S]*?<h[^>]*>([^<]+)<\/h[^>]*>/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        const cover = match[2];
        const title = match[3]?.trim();
        
        // Skip invalid entries
        if (!url || !title || url.includes('#') || url.startsWith('javascript:')) {
          continue;
        }
        
        console.log(`[KBJFan] Found video: ${title} -> ${url}`);
        
        videos.push({
          title: this.cleanTitle(title),
          url: this.makeAbsoluteUrl(url),
          cover: this.makeAbsoluteUrl(cover),
          remarks: '' // Duration will be extracted from detail page
        });
        
        if (videos.length >= 24) break; // Limit per page
      }
      
      if (videos.length > 0) break; // Use first successful pattern
    }
    
    // Fallback: Look for any links to posts
    if (videos.length === 0) {
      console.log(`[KBJFan] Trying fallback pattern...`);
      const linkRegex = /<a[^>]*href="(https:\/\/www\.kbjfan\.com\/[^"]+\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null && videos.length < 24) {
        const url = match[1];
        const title = match[2]?.trim();
        
        if (title && !url.includes('#') && !title.includes('Read More')) {
          videos.push({
            title: this.cleanTitle(title),
            url: url,
            cover: this.getDefaultCover(),
            remarks: ''
          });
        }
      }
    }
    
    console.log(`[KBJFan] Total videos found: ${videos.length}`);
    return videos;
  }

  async detail(url) {
    console.log(`[KBJFan] Getting details for: ${url}`);
    
    const response = await this.request(url);
    console.log(`[KBJFan] Detail response length: ${response.length}`);
    
    // Extract title
    const titleMatch = response.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? this.cleanTitle(titleMatch[1]) : 'Unknown Title';
    
    // Extract cover image
    const coverMatch = response.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                      response.match(/<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>/i);
    const cover = coverMatch ? this.makeAbsoluteUrl(coverMatch[1]) : this.getDefaultCover();
    
    // Extract description
    const descMatch = response.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                     response.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const desc = descMatch ? this.cleanText(descMatch[1]) : '';
    
    // Look for video URLs in various formats
    const videoUrls = this.extractVideoUrls(response);
    
    const episodes = [{
      title: title,
      urls: videoUrls.map(videoUrl => ({
        name: 'Video',
        url: videoUrl
      }))
    }];
    
    console.log(`[KBJFan] Found ${videoUrls.length} video URLs`);
    
    return {
      title: title,
      cover: cover,
      desc: desc,
      episodes: episodes
    };
  }

  extractVideoUrls(html) {
    const videoUrls = [];
    
    // Pattern 1: KBJFan specific - video-url attributes in switch-video elements
    const switchVideoPattern = /class="switch-video[^"]*"[^>]*video-url="([^"]+)"/gi;
    let match;
    while ((match = switchVideoPattern.exec(html)) !== null) {
      videoUrls.push(match[1]);
      console.log(`[KBJFan] Found switch-video URL: ${match[1]}`);
    }
    
    // Pattern 2: KBJFan specific - video-url attribute in dplayer
    const dplayerPattern = /(?:class="[^"]*dplayer[^"]*"|video-url)="([^"]*(?:\.mp4|\.m3u8)[^"]*)"/gi;
    while ((match = dplayerPattern.exec(html)) !== null) {
      if (match[1].includes('.mp4') || match[1].includes('.m3u8')) {
        videoUrls.push(match[1]);
        console.log(`[KBJFan] Found dplayer URL: ${match[1]}`);
      }
    }
    
    // Pattern 3: Direct video file URLs in src/data-src
    const videoFilePattern = /(?:src|data-src)="([^"]*\.(?:mp4|m3u8|webm|avi|mov)[^"]*)"/gi;
    while ((match = videoFilePattern.exec(html)) !== null) {
      videoUrls.push(match[1]);
      console.log(`[KBJFan] Found direct video file: ${match[1]}`);
    }
    
    // Pattern 4: Embedded video URLs
    const embedPattern = /<iframe[^>]*src="([^"]+)"/gi;
    while ((match = embedPattern.exec(html)) !== null) {
      videoUrls.push(match[1]);
      console.log(`[KBJFan] Found iframe URL: ${match[1]}`);
    }
    
    // Pattern 5: Video data in JSON/JavaScript
    const jsonPattern = /"(?:video_url|videoUrl|url|src)"\s*:\s*"([^"]+)"/gi;
    while ((match = jsonPattern.exec(html)) !== null) {
      if (match[1].includes('.mp4') || match[1].includes('.m3u8')) {
        videoUrls.push(match[1]);
        console.log(`[KBJFan] Found JSON video URL: ${match[1]}`);
      }
    }
    
    // Remove duplicates and filter valid URLs
    const uniqueUrls = [...new Set(videoUrls)]
      .filter(url => url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('embed')))
      .map(url => this.makeAbsoluteUrl(url));
    
    console.log(`[KBJFan] Total unique video URLs found: ${uniqueUrls.length}`);
    return uniqueUrls;
  }

  async watch(url) {
    console.log(`[KBJFan] Watch method called with URL: ${url}`);
    
    // If it's already a direct video URL, return it
    if (url.includes('.mp4') || url.includes('.m3u8')) {
      console.log(`[KBJFan] Direct video URL detected: ${url}`);
      
      // Validate the URL
      try {
        const response = await this.request(url, { method: 'HEAD' });
        console.log(`[KBJFan] Video URL validation successful`);
        
        return {
          type: url.includes('.m3u8') ? 'hls' : 'mp4',
          url: url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.kbjfan.com/'
          }
        };
      } catch (error) {
        console.log(`[KBJFan] Video URL validation failed: ${error.message}`);
      }
    }
    
    // If it's an embed URL, fetch and extract video URL
    if (url.includes('embed') || url.includes('iframe')) {
      console.log(`[KBJFan] Embed URL detected, extracting video URL...`);
      
      try {
        const response = await this.request(url);
        const videoUrls = this.extractVideoUrls(response);
        
        if (videoUrls.length > 0) {
          const videoUrl = videoUrls[0];
          console.log(`[KBJFan] Extracted video URL: ${videoUrl}`);
          
          return {
            type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
            url: videoUrl,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://www.kbjfan.com/'
            }
          };
        }
      } catch (error) {
        console.log(`[KBJFan] Failed to extract from embed: ${error.message}`);
      }
    }
    
    // Fallback: return the URL as iframe (though Miru might not support it)
    console.log(`[KBJFan] Returning URL as fallback`);
    return {
      type: 'mp4',
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.kbjfan.com/'
      }
    };
  }

  // Helper methods
  makeAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return 'https://www.kbjfan.com' + url;
    return 'https://www.kbjfan.com/' + url;
  }

  cleanTitle(title) {
    return title
      .replace(/\s*-\s*KBJFan.*$/i, '')
      .replace(/\s*\|\s*KBJFan.*$/i, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  cleanText(text) {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getDefaultCover() {
    return 'https://www.kbjfan.com/wp-content/uploads/2024/07/ce55db65b720240703143112.png';
  }
}