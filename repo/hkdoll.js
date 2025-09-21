// ==MiruExtension==
// @name         HKDoll
// @version      v0.0.5
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

    // Extract video URL - focus on finding direct streams
    let videoUrl = "";
    
    // Method 1: Look for direct video URLs in the page first
    const directVideoPatterns = [
      /var\s+hlsUrl\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi,
      /var\s+videoUrl\s*=\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
      /"file"\s*:\s*"([^"]+\.(?:m3u8|mp4)[^"]+)"/gi,
      /https?:\/\/[^'">\s]*\.m3u8[^'">\s]*/gi,
      /src\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi
    ];
    
    for (const pattern of directVideoPatterns) {
      const matches = [...res.matchAll(pattern)];
      if (matches.length > 0) {
        const directUrl = matches[0][1] || matches[0][0];
        if (directUrl && directUrl.includes('://')) {
          console.log('Found direct video URL:', directUrl);
          videoUrl = directUrl;
          break;
        }
      }
    }
    
    // Method 2: Try to decode __PAGE__PARAMS__ only if no direct URL found
    if (!videoUrl) {
      try {
        const paramMatch = res.match(/var __PAGE__PARAMS__="([^"]+)"/);
        if (paramMatch) {
          const decodedUrl = this.decodeVideoUrl(paramMatch[1]);
          if (decodedUrl && !decodedUrl.includes('/embed/')) {
            videoUrl = decodedUrl;
          }
        }
      } catch (error) {
        console.error('Failed to decode __PAGE__PARAMS__:', error);
      }
    }
    
    // Method 3: If still no URL, use current page URL as fallback
    if (!videoUrl) {
      const videoIdMatch = url.match(/\/video\/([^\/\.]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        console.log('No direct URL found, using video page as fallback:', url);
        // Return a special identifier to indicate this needs browser handling
        videoUrl = `browser:${url}`;
      }
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
      // Extract key and encrypted config - Reference implementation approach
      const key = param.slice(-32);
      const encryptedConf = param.substring(0, param.length - 32);
      
      // Decrypt config using XOR
      const pageConfig = JSON.parse(this.xorDec(encryptedConf, key));
      
      console.log('Decoded page config:', pageConfig);
      
      // Use the reference implementation's exact decryption logic
      if (pageConfig.player && pageConfig.player.param && pageConfig.player.param.id) {
        const videoId = pageConfig.player.param.id;
        const embedURL = pageConfig.player.param.embedURL;
        const arg = pageConfig.player.param.arg;
        
        console.log('Video ID:', videoId);
        console.log('Embed URL:', embedURL);
        
        // Extract timestamp from embedURL (last 10 chars of the last path segment)
        const lastSegment = embedURL.substring(embedURL.lastIndexOf('/') + 1);
        const timestamp = lastSegment.slice(-10);
        
        console.log('Timestamp:', timestamp);
        
        // Generate decryption key exactly like reference implementation
        const keyString = (videoId.toString() + '-' + timestamp.toString()).split('').reverse().join('');
        const base64Key = this.base64Encode(keyString).replaceAll('=', '');
        
        console.log('Generated key string:', keyString);
        console.log('Base64 key:', base64Key);
        
        // Decode final URL using the reference implementation's strDecode
        const finalUrl = this.strDecode(arg, base64Key);
        
        console.log('Final decoded URL:', finalUrl);
        return finalUrl;
      }
      
      // Check if this site uses a different structure (embedUrl only)
      if (pageConfig.player && pageConfig.player.embedUrl) {
        const embedUrl = pageConfig.player.embedUrl;
        console.log('Found embed URL only:', embedUrl);
        
        // Extract token from embed URL and try to decode it
        const tokenMatch = embedUrl.match(/token=([^&]+)/);
        const videoIdMatch = embedUrl.match(/\/embed\/([^\/\?]+)/);
        
        if (tokenMatch && videoIdMatch) {
          const token = tokenMatch[1];
          const videoId = videoIdMatch[1];
          
          console.log('Attempting to decode token from embed URL');
          console.log('Token:', token.substring(0, 50) + '...');
          console.log('Video ID:', videoId);
          
          // Try to decode the token using similar logic
          try {
            const decodedUrl = this.decodeEmbedToken(token, videoId);
            if (decodedUrl) {
              console.log('Successfully decoded video URL from embed token:', decodedUrl);
              return decodedUrl;
            }
          } catch (error) {
            console.log('Token decoding failed:', error.message);
          }
        }
        
        // Fallback to embed URL
        return embedUrl;
      }
      
      console.log('No suitable player configuration found');
      return "";
    } catch (error) {
      console.error('Decode error:', error);
      return "";
    }
  }
  
  decodeEmbedToken(token, videoId) {
    // Dedicated method to decode embed URL tokens
    try {
      console.log('Decoding embed token...');
      
      const hexDecoded = this.hexToString(token);
      
      // Method 1: Use video ID as key and look for hex patterns (BREAKTHROUGH METHOD!)
      try {
        const result = this.xorDecode(hexDecoded, videoId);
        console.log('Video ID XOR result (first 300 chars):', result.substring(0, 300));
        
        // Look for hex patterns in the result
        const patterns = result.match(/[0-9a-f]{12,}/g);
        if (patterns) {
          console.log('Found hex patterns:');
          for (const pattern of patterns) {
            if (pattern.length >= 16) {
              console.log(`  Testing pattern: ${pattern}`);
              
              // Use this pattern as key
              try {
                const patternKey = pattern.substring(0, 16);
                const testResult = this.xorDecode(hexDecoded, patternKey);
                
                // Look for video URL
                const urlMatch = testResult.match(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)[^\s'"<>]*/);
                if (urlMatch) {
                  console.log(`🎯 SUCCESS! Found video URL with pattern key "${patternKey}":`, urlMatch[0]);
                  return urlMatch[0];
                }
                
                // Also check if the result contains JSON with video info
                try {
                  // The result might be a JSON string
                  const jsonMatch = testResult.match(/\{[^}]*"[^"]*"[^}]*\}/);
                  if (jsonMatch) {
                    const jsonResult = JSON.parse(jsonMatch[0]);
                    if (jsonResult.url && jsonResult.url.includes('.m3u8')) {
                      console.log(`🎯 SUCCESS! Found video URL in JSON:`, jsonResult.url);
                      return jsonResult.url;
                    }
                  }
                } catch (e) {
                  // Continue searching
                }
              } catch (e) {
                console.log(`  Pattern ${pattern} failed: ${e.message}`);
              }
            }
          }
        }
      } catch (e) {
        console.log('Video ID method failed:', e.message);
      }
      
      // Method 2: Try the same logic as __PAGE__PARAMS__
      if (token.length > 32) {
        const key = token.slice(-32);
        const encryptedData = token.substring(0, token.length - 32);
        
        try {
          const keyDecoded = this.hexToString(key);
          const dataDecoded = this.hexToString(encryptedData);
          const xorResult = this.xorDecode(dataDecoded, keyDecoded);
          
          // Look for JSON structure that might contain video info
          try {
            const jsonResult = JSON.parse(xorResult);
            console.log('Parsed JSON from embed token:', jsonResult);
            
            // Look for video URL in various possible fields
            if (jsonResult.url) return jsonResult.url;
            if (jsonResult.src) return jsonResult.src;
            if (jsonResult.file) return jsonResult.file;
            if (jsonResult.video) return jsonResult.video;
            if (jsonResult.stream) return jsonResult.stream;
          } catch (e) {
            // Not JSON, try to extract URLs directly
            const urlMatch = xorResult.match(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)[^\s'"<>]*/);
            if (urlMatch) {
              console.log('Found URL in embed token XOR result:', urlMatch[0]);
              return urlMatch[0];
            }
          }
        } catch (e) {
          console.log('Standard token decoding failed:', e.message);
        }
      }
      
      // Method 3: Try common domain keys
      const domainKeys = ['hongkongdoll', 'video', 'embed', 'player', 'hkdoll'];
      for (const key of domainKeys) {
        try {
          const result = this.xorDecode(hexDecoded, key);
          const urlMatch = result.match(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)[^\s'"<>]*/);
          if (urlMatch) {
            console.log(`Found URL with domain key "${key}":`, urlMatch[0]);
            return urlMatch[0];
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.log('No video URL found in embed token');
      return null;
    } catch (error) {
      console.error('Embed token decoding error:', error);
      return null;
    }
  }
  
  async decodeTokenUrl(token, videoId) {
    // New method to decode token-based URLs
    try {
      console.log('Attempting token URL decoding...');
      
      // Method 1: Try standard key extraction (last 32 chars)
      if (token.length > 32) {
        const key = token.slice(-32);
        const encryptedData = token.substring(0, token.length - 32);
        
        try {
          const keyDecoded = this.hexToString(key);
          const dataDecoded = this.hexToString(encryptedData);
          const xorResult = this.xorDecode(dataDecoded, keyDecoded);
          
          // Look for JSON structure
          const jsonMatch = xorResult.match(/\{[^}]*"[^"]*"[^}]*\}/);
          if (jsonMatch) {
            const jsonResult = JSON.parse(jsonMatch[0]);
            if (jsonResult.url || jsonResult.src || jsonResult.file) {
              console.log('Found video URL in token JSON:', jsonResult);
              return jsonResult.url || jsonResult.src || jsonResult.file;
            }
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Method 2: Try video ID based keys
      const videoIdKeys = [
        videoId,
        videoId.substring(0, 16),
        'embed_' + videoId,
        'player_' + videoId,
        videoId + 'embed'
      ];
      
      const hexDecoded = this.hexToString(token);
      
      for (const key of videoIdKeys) {
        try {
          const result = this.xorDecode(hexDecoded, key);
          
          // Look for HTTP URLs
          const urlMatch = result.match(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)[^\s'"<>]*/);
          if (urlMatch) {
            console.log('Found video URL with key', key, ':', urlMatch[0]);
            return urlMatch[0];
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Method 3: Try domain-based keys
      const domainKeys = ['hongkongdoll', 'video', 'embed', 'player', 'hkdoll'];
      
      for (const key of domainKeys) {
        try {
          const result = this.xorDecode(hexDecoded, key);
          
          const urlMatch = result.match(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)[^\s'"<>]*/);
          if (urlMatch) {
            console.log('Found video URL with domain key', key, ':', urlMatch[0]);
            return urlMatch[0];
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.log('Token decoding failed, no video URL found');
      return null;
    } catch (error) {
      console.error('Token decoding error:', error);
      return null;
    }
  }
  
  hexToString(hex) {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      result += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return result;
  }
  
  xorDecode(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
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
    // Reference implementation's exact strDecode logic
    // First base64 decode
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
    console.log('Watch method called with URL:', url);
    
    // Handle browser-prefixed URLs (these need special handling by Miru)
    if (url.startsWith('browser:')) {
      const actualUrl = url.substring(8); // Remove 'browser:' prefix
      console.log('Browser URL detected, returning for web view:', actualUrl);
      return {
        type: "hls",
        url: actualUrl,
        headers: {
          'User-Agent': this.UA
        }
      };
    }
    
    // Handle potential direct video URLs first
    if (url.includes('.m3u8') || url.includes('.mp4')) {
      console.log('Direct video URL detected:', url);
      
      // Try to validate the URL by making a head request
      try {
        const response = await this.request(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': this.UA,
            'Accept-Encoding': 'identity'
          }
        });
        
        // If we get a successful response, use this URL
        console.log('Direct video URL validated successfully');
        return {
          type: url.includes('.m3u8') ? "hls" : "mp4",
          url: url,
          headers: {
            'User-Agent': this.UA
          }
        };
      } catch (error) {
        console.log('Direct video URL validation failed:', error.message);
        // Continue to other methods
      }
    }
    
    // Handle embed URLs by extracting token and trying advanced decoding
    if (url.includes('/embed/')) {
      const videoIdMatch = url.match(/\/embed\/([^\/\?]+)/);
      const tokenMatch = url.match(/token=([^&]+)/);
      
      if (videoIdMatch && tokenMatch) {
        const videoId = videoIdMatch[1];
        const token = tokenMatch[1];
        
        console.log('Attempting advanced token decoding for embed URL');
        
        // Try to decode the token for a direct video URL
        const decodedUrl = await this.decodeTokenUrl(token, videoId);
        if (decodedUrl) {
          console.log('Successfully decoded video URL from token:', decodedUrl);
          return await this.watch(decodedUrl); // Recursively process the decoded URL
        }
        
        // If token decoding fails, try constructing potential URLs
        const potentialUrls = [
          `https://hongkongdollvideo.com/stream/${videoId}.m3u8`,
          `https://hongkongdollvideo.com/hls/${videoId}/index.m3u8`,
          `https://media.hongkongdollvideo.com/${videoId}.m3u8`,
          `https://hongkongdollvideo.com/files/${videoId}/playlist.m3u8`,
          `https://cdn.hongkongdollvideo.com/${videoId}.m3u8`
        ];
        
        // Try each potential URL
        for (const potentialUrl of potentialUrls) {
          try {
            console.log('Trying potential URL:', potentialUrl);
            const response = await this.request(potentialUrl, {
              method: 'HEAD',
              headers: {
                'User-Agent': this.UA,
                'Accept-Encoding': 'identity'
              }
            });
            
            console.log('✓ Found working video URL:', potentialUrl);
            return {
              type: "hls",
              url: potentialUrl,
              headers: {
                'User-Agent': this.UA
              }
            };
          } catch (error) {
            console.log('Failed URL:', potentialUrl, error.message);
            // Continue to next URL
          }
        }
        
        // If no direct URLs work, fall back to video page
        const videoPageUrl = `https://hongkongdollvideo.com/video/${videoId}.html`;
        console.log('All direct URLs failed, falling back to video page:', videoPageUrl);
        
        return {
          type: "hls",
          url: videoPageUrl,
          headers: {
            'User-Agent': this.UA
          }
        };
      }
    }
    
    // For any other URL, assume it's a video page that needs browser handling
    console.log('Unknown URL type, returning for browser handling:', url);
    return {
      type: "hls",
      url: url,
      headers: {
        'User-Agent': this.UA
      }
    };
  }
}