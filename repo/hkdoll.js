// ==MiruExtension==
// @name         HKDoll
// @version      v0.0.3
// @author       YourName
// @lang         zh-cn
// @license      MIT
// @icon         https://hongkongdollvideo.com/favicon.ico
// @package      hkdoll.tv
// @type         bangumi
// @webSite      https://hongkongdollvideo.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  constructor() {
    super();
    this.site = 'https://hongkongdollvideo.com';
    this.UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  }

  async latest(page) {
    const url = page === 1 ? this.site : `${this.site}/index${page}.html`;
    
    const res = await this.request(url, {
      headers: {
        'User-Agent': this.UA,
        'Accept-Encoding': 'identity'
      },
    });

    return this.parseVideoList(res);
  }

  async search(kw, page) {
    const encodedKeyword = encodeURIComponent(kw);
    const url = `${this.site}/search/${encodedKeyword}/${page}.html`;
    
    const res = await this.request(url, {
      headers: {
        'User-Agent': this.UA,
        'Accept-Encoding': 'identity'
      },
    });

    return this.parseVideoList(res);
  }

  parseVideoList(html) {
    // Updated regex to match the actual HTML structure - extract images separately
    const regex = /<div class="video-item">[\s\S]*?<a[^>]+title="([^"]+)"[^>]+href="([^"]+)"[\s\S]*?<img[^>]*>[\s\S]*?<div class="duration">([^<]*)<\/div>/g;
    const matches = [...html.matchAll(regex)];
    
    const videos = [];
    for (const match of matches) {
      let url = match[2];
      // Convert to relative path if needed
      if (url.startsWith('https://hongkongdollvideo.com')) {
        url = url.replace('https://hongkongdollvideo.com', '');
      }
      
      // Extract the img tag from the matched content
      const imgMatch = match[0].match(/<img[^>]*>/);
      let cover = '';
      
      if (imgMatch) {
        const imgTag = imgMatch[0];
        // First try data-src (for lazy-loaded images)
        const dataSrcMatch = imgTag.match(/data-src="([^"]+)"/);
        if (dataSrcMatch) {
          cover = dataSrcMatch[1];
        } else {
          // Fallback to src, but avoid base64 placeholders
          const srcMatch = imgTag.match(/src="([^"]+)"/);
          if (srcMatch && !srcMatch[1].startsWith('data:image')) {
            cover = srcMatch[1];
          }
        }
      }
      
      videos.push({
        url: url,
        title: match[1].trim(),
        cover: cover,
        remarks: match[3].trim(),
      });
    }
    
    return videos;
  }

  async detail(url) {
    const res = await this.request(url, {
      headers: {
        'User-Agent': this.UA,
        'Accept-Encoding': 'identity'
      },
    });

    // Extract title
    const titleMatch = res.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim().replace(' - 麻豆社', '') : "";

    // Extract cover image
    const coverMatch = res.match(/<meta property="og:image" content="([^"]+)"/);
    let cover = coverMatch ? coverMatch[1] : "";
    
    if (!cover) {
      const posterMatch = res.match(/poster="([^"]+)"/);
      if (posterMatch) {
        cover = posterMatch[1];
      }
    }

    // Extract description
    const descMatch = res.match(/<meta name="description" content="([^"]+)"/);
    const desc = descMatch ? descMatch[1].trim() : "";

    // Extract video URL using the decoding logic from hkdoll.js
    let videoUrl = "";
    try {
      const paramMatch = res.match(/var __PAGE__PARAMS__="([^"]+)"/);
      if (paramMatch) {
        videoUrl = this.decodeVideoUrl(paramMatch[1]);
      }
    } catch (error) {
      console.error('Failed to decode video URL:', error);
    }

    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: "播放",
          urls: [
            {
              name: title,
              url: videoUrl,
            },
          ],
        },
      ],
    };
  }

  decodeVideoUrl(param) {
    try {
      // Extract key and encrypted config
      const key = param.slice(-32);
      const encryptedConf = param.substring(0, param.length - 32);
      
      // Decrypt config using XOR
      const pageConfig = JSON.parse(this.xorDec(encryptedConf, key));
      
      // Check if this site uses a different structure
      if (pageConfig.player && pageConfig.player.embedUrl) {
        // This site seems to provide the embed URL directly
        const embedUrl = pageConfig.player.embedUrl;
        console.log('Found embed URL:', embedUrl);
        
        // Try to extract video ID from the embed URL
        const videoIdMatch = embedUrl.match(/\/embed\/([^\/]+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          console.log('Extracted video ID:', videoId);
          
          // The embed URL itself might be the video source or lead to it
          // For now, return the embed URL as it might work with the iframe player
          return embedUrl;
        }
      }
      
      // Fallback to original method if available
      if (pageConfig.player && pageConfig.player.param && pageConfig.player.param.id) {
        const id = pageConfig.player.param.id;
        const embedURL = pageConfig.player.param.embedURL;
        const timestamp = embedURL.substring(embedURL.lastIndexOf('/') + 1).slice(-10);
        
        // Generate decryption key
        const reverseKey = (id.toString() + '-' + timestamp.toString()).split('').reverse().join('');
        const base64Key = this.base64Encode(reverseKey).replaceAll('=', '');
        
        // Decode final URL
        const finalUrl = this.strDecode(pageConfig.player.param.arg, base64Key);
        return finalUrl;
      }
      
      console.log('No suitable player configuration found');
      return "";
    } catch (error) {
      console.error('Decode error:', error);
      return "";
    }
  }

  xorDec(hexString, key) {
    let result = '';
    const keyLength = key.length;
    
    for (let i = 0; i < hexString.length; i += 2) {
      const hexByte = hexString.substr(i, 2);
      const charCode = String.fromCharCode(parseInt(hexByte, 16));
      const keyChar = key[(i / 2) % keyLength];
      result += String.fromCharCode(charCode.charCodeAt(0) ^ keyChar.charCodeAt(0));
    }
    
    return result;
  }

  strDecode(encodedString, key) {
    // Base64 decode first
    const decoded = this.base64Decode(encodedString);
    const keyLength = key.length;
    let result = '';
    
    // XOR decode with key
    for (let i = 0; i < decoded.length; i++) {
      const keyIndex = i % keyLength;
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(keyIndex));
    }
    
    // Base64 decode again and URI decode
    return decodeURIComponent(this.base64Decode(result));
  }

  base64Encode(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  base64Decode(text) {
    return decodeURIComponent(escape(atob(text)));
  }

  async watch(url) {
    // If the URL is an embed URL, we need to fetch it to get the actual video stream
    if (url.includes('/embed/')) {
      try {
        const res = await this.request(url, {
          headers: {
            'User-Agent': this.UA,
            'Accept-Encoding': 'identity'
          },
        });
        
        // Look for various video URL patterns in the embed page
        const videoPatterns = [
          /https?:\/\/[^'">\s]*\.m3u8[^'">\s]*/gi,
          /https?:\/\/[^'">\s]*\.mp4[^'">\s]*/gi,
          /"file"\s*:\s*"([^"]+)"/gi,
          /"src"\s*:\s*"([^"]+\.(?:m3u8|mp4)[^"]*)"/gi,
          /var\s+videoUrl\s*=\s*["']([^"']+)["']/gi,
          /var\s+hlsUrl\s*=\s*["']([^"']+)["']/gi
        ];
        
        for (const pattern of videoPatterns) {
          const matches = [...res.matchAll(pattern)];
          if (matches.length > 0) {
            for (const match of matches) {
              const videoUrl = match[1] || match[0];
              // Skip data URIs and invalid URLs
              if (videoUrl && !videoUrl.startsWith('data:') && videoUrl.includes('://')) {
                console.log('Found video URL:', videoUrl);
                return {
                  type: videoUrl.includes('.m3u8') ? "hls" : "mp4",
                  url: videoUrl,
                };
              }
            }
          }
        }
        
        console.log('No direct video URL found in embed page, returning embed URL');
      } catch (error) {
        console.error('Failed to fetch embed page:', error);
      }
    }
    
    // Fallback: return the original URL
    return {
      type: url.includes('.m3u8') ? "hls" : (url.includes('/embed/') ? "iframe" : "mp4"),
      url: url,
    };
  }
}