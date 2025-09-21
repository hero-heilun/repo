// ==MiruExtension==
// @name         HKDoll
// @version      v0.0.1
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
    // Updated regex to match the actual HTML structure
    const regex = /<div class="video-item">[\s\S]*?<a[^>]+title="([^"]+)"[^>]+href="([^"]+)"[\s\S]*?(?:data-src="([^"]+)"|src="([^"]+)")[\s\S]*?<div class="duration">([^<]*)<\/div>/g;
    const matches = [...html.matchAll(regex)];
    
    const videos = [];
    for (const match of matches) {
      let url = match[2];
      // Convert to relative path if needed
      if (url.startsWith('https://hongkongdollvideo.com')) {
        url = url.replace('https://hongkongdollvideo.com', '');
      }
      
      // Get cover image from either data-src or src
      const cover = match[3] || match[4] || '';
      
      videos.push({
        url: url,
        title: match[1].trim(),
        cover: cover,
        remarks: match[5].trim(),
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
      const paramMatch = res.match(/var __PAGE_PARAMS__="([^"]+)"/);
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
      
      // Extract necessary parameters
      const id = pageConfig.player.param.id;
      const embedURL = pageConfig.player.param.embedURL;
      const timestamp = embedURL.substring(embedURL.lastIndexOf('/') + 1).slice(-10);
      
      // Generate decryption key
      const reverseKey = (id.toString() + '-' + timestamp.toString()).split('').reverse().join('');
      const base64Key = this.base64Encode(reverseKey).replaceAll('=', '');
      
      // Decode final URL
      const finalUrl = this.strDecode(pageConfig.player.param.arg, base64Key);
      
      return finalUrl;
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
    return {
      type: "hls",
      url: url,
    };
  }
}