#!/usr/bin/env node

// 独立测试 mandu.tv.js 的视频提取逻辑
const https = require('https');
const http = require('http');

// 模拟 Extension 基类
class Extension {
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `https://madou.club${url}`;
    console.log(`🌐 Requesting: ${fullUrl}`);
    
    return new Promise((resolve, reject) => {
      const client = fullUrl.startsWith('https') ? https : http;
      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...options.headers
        }
      };
      
      const req = client.get(fullUrl, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`✅ Response received: ${data.length} characters`);
          resolve(data);
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

// 从 mandu.tv.js 中提取核心类逻辑
class ManduTVExtension extends Extension {
  async detail(url) {
    console.log(`\n🔍 Testing detail() with URL: ${url}`);
    
    try {
      const res = await this.request(url);
      console.log(`📄 Page content length: ${res.length}`);
      
      // 检查页面标题
      const titleMatch = res.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        console.log(`📋 Page title: ${titleMatch[1]}`);
      }
      
      // 查找 iframe (使用mandu.tv.js中的逻辑)
      const iframePatterns = [
        /<iframe[^>]*src=([^\s>]+)/, // 无引号 (madou.club 的格式)
        /<iframe[^>]*src="([^"]+)"/, // 双引号
        /<iframe[^>]*src='([^']+)'/, // 单引号
        /<iframe[^>]*data-src="([^"]+)"/, // data-src 双引号
        /<iframe[^>]*data-src='([^']+)'/, // data-src 单引号
        /<iframe[^>]*data-src=([^\s>]+)/ // data-src 无引号
      ];
      
      let iframeUrl = null;
      for (let i = 0; i < iframePatterns.length; i++) {
        const match = res.match(iframePatterns[i]);
        if (match && !match[1].includes('about:blank') && !match[1].includes('googleads')) {
          iframeUrl = match[1];
          console.log(`🎯 Found iframe (pattern ${i + 1}): ${iframeUrl}`);
          break;
        }
      }
      
      if (!iframeUrl) {
        console.log('❌ No iframe found in page');
        return null;
      }
      
      return {
        title: titleMatch ? titleMatch[1] : "Test Video",
        cover: "https://via.placeholder.com/300x400",
        desc: "Test description",
        episodes: [{
          title: "播放",
          urls: [{
            name: "播放",
            url: iframeUrl // 返回iframe URL给watch方法处理
          }]
        }]
      };
      
    } catch (error) {
      console.error(`\n💥 ERROR in detail(): ${error.message}`);
      return null;
    }
  }

  async watch(url) {
    console.log(`\n🔍 Testing watch() with URL: ${url}`);
    
    try {
      // 如果是madou.club页面URL，先获取iframe
      if (url.includes("madou.club") && url.includes(".html")) {
        console.log("🔗 Processing madou.club page URL...");
        const pageRes = await this.request(url);
        
        // 查找iframe
        const iframePatterns = [
          /<iframe[^>]*src=([^\s>]+)/, // 无引号
          /<iframe[^>]*src="([^"]+)"/, // 双引号
          /<iframe[^>]*src='([^']+)'/, // 单引号
        ];
        
        let iframeUrl = null;
        for (let i = 0; i < iframePatterns.length; i++) {
          const match = pageRes.match(iframePatterns[i]);
          if (match && !match[1].includes('about:blank') && !match[1].includes('googleads')) {
            iframeUrl = match[1];
            console.log(`🎯 Found iframe: ${iframeUrl}`);
            break;
          }
        }
        
        if (!iframeUrl) {
          console.log('❌ No iframe found');
          return null;
        }
        
        url = iframeUrl; // 使用iframe URL
      }
      
      // 获取 iframe 内容
      console.log(`\n🔗 Fetching iframe content...`);
      const iframeRes = await this.request(url, {
        headers: {
          "Referer": "https://madou.club/",
        }
      });
      
      console.log(`📄 Iframe content length: ${iframeRes.length}`);
      
      // 查找 script 标签
      const scriptMatches = [...iframeRes.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
      console.log(`📜 Found ${scriptMatches.length} script tags`);
      
      // 提取域名
      const domainMatch = url.match(/^(https?:\/\/[^\/]+)/);
      const domain = domainMatch ? domainMatch[1] : "";
      console.log(`🌐 Iframe domain: ${domain}`);
      
      let token = null;
      let m3u8Path = null;
      
      // 检查第6个脚本标签（索引5）
      if (scriptMatches.length > 5) {
        const scriptContent = scriptMatches[5][1];
        console.log(`🔍 Checking 6th script tag (${scriptContent.length} chars)`);
        
        const tokenMatch = scriptContent.match(/var token = "(.+?)";/);
        const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/);
        
        if (tokenMatch && m3u8Match) {
          token = tokenMatch[1];
          m3u8Path = m3u8Match[1];
          console.log(`🔑 Found token: ${token.substring(0, 20)}...`);
          console.log(`🎬 Found m3u8 path: ${m3u8Path}`);
        }
      }
      
      // 如果在第6个脚本中没找到，搜索所有脚本
      if (!token || !m3u8Path) {
        console.log(`🔍 Searching all scripts for token/m3u8...`);
        for (let i = 0; i < scriptMatches.length; i++) {
          const scriptContent = scriptMatches[i][1];
          
          const tokenMatch = scriptContent.match(/var token = "(.+?)";/) ||
                            scriptContent.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
          const m3u8Match = scriptContent.match(/var m3u8 = '(.+?)';/) ||
                           scriptContent.match(/m3u8["']?\s*[:=]\s*["']([^"']+)["']/);
          
          if (tokenMatch) {
            token = tokenMatch[1];
            console.log(`🔑 Found token in script ${i + 1}: ${token.substring(0, 20)}...`);
          }
          if (m3u8Match) {
            m3u8Path = m3u8Match[1];
            console.log(`🎬 Found m3u8 in script ${i + 1}: ${m3u8Path}`);
          }
          
          if (token && m3u8Path) break;
        }
      }
      
      if (token && m3u8Path && domain) {
        const playUrl = `${domain}${m3u8Path}?token=${token}`;
        console.log(`\n✅ SUCCESS! Final video URL: ${playUrl}`);
        return {
          type: "hls",
          url: playUrl,
          headers: {
            "Referer": url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        };
      } else {
        console.log(`\n❌ FAILED to extract video URL`);
        console.log(`   Domain: ${domain}`);
        console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
        console.log(`   M3U8: ${m3u8Path || 'null'}`);
        return null;
      }
      
    } catch (error) {
      console.error(`\n💥 ERROR in watch(): ${error.message}`);
      return null;
    }
  }
}

// 测试函数
async function testManduTV() {
  console.log('🚀 Starting Mandu.TV extraction test...\n');
  
  const extension = new ManduTVExtension();
  const testUrl = '/md0362-淫僧释永信禅房偷拍实录-少林肉棒替女信徒消灾.html';
  
  // 测试 detail 方法
  console.log('=== TESTING DETAIL METHOD ===');
  const detailResult = await extension.detail(testUrl);
  
  if (detailResult) {
    console.log('\n📋 Detail Result:');
    console.log(`Title: ${detailResult.title}`);
    console.log(`Episodes: ${detailResult.episodes.length}`);
    if (detailResult.episodes[0] && detailResult.episodes[0].urls[0]) {
      const watchUrl = detailResult.episodes[0].urls[0].url;
      console.log(`Watch URL: ${watchUrl}`);
      
      // 测试 watch 方法
      console.log('\n=== TESTING WATCH METHOD ===');
      const watchResult = await extension.watch(watchUrl);
      
      if (watchResult) {
        console.log('\n🎉 Complete test successful!');
        console.log(`🎬 Video URL: ${watchResult.url}`);
        console.log(`📺 Type: ${watchResult.type}`);
      } else {
        console.log('\n💔 Watch test failed');
      }
    }
  } else {
    console.log('\n💔 Detail test failed');
  }
}

// 运行测试
if (require.main === module) {
  testManduTV().catch(console.error);
}

module.exports = { ManduTVExtension, testManduTV };