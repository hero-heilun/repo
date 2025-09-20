#!/usr/bin/env node

// 独立测试 madoutv.js 的视频提取逻辑
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

// 复制 madoutv.js 的核心提取逻辑
class MadouTVExtension extends Extension {
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
      
      // 查找 iframe (修复：支持无引号的src)
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
      
      // 获取 iframe 内容
      console.log(`\n🔗 Fetching iframe content...`);
      const iframeRes = await this.request(iframeUrl, {
        headers: {
          "Referer": "https://madou.club/",
        }
      });
      
      console.log(`📄 Iframe content length: ${iframeRes.length}`);
      
      // 查找 script 标签
      const scriptMatches = [...iframeRes.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
      console.log(`📜 Found ${scriptMatches.length} script tags`);
      
      // 提取域名
      const domainMatch = iframeUrl.match(/^(https?:\/\/[^\/]+)/);
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
          title: titleMatch ? titleMatch[1] : "Test Video",
          playUrl: playUrl,
          type: "hls"
        };
      } else {
        console.log(`\n❌ FAILED to extract video URL`);
        console.log(`   Domain: ${domain}`);
        console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
        console.log(`   M3U8: ${m3u8Path || 'null'}`);
        return null;
      }
      
    } catch (error) {
      console.error(`\n💥 ERROR: ${error.message}`);
      return null;
    }
  }
}

// 测试函数
async function testMadouTV() {
  console.log('🚀 Starting MadouTV extraction test...\n');
  
  const extension = new MadouTVExtension();
  const testUrl = '/md0362-淫僧释永信禅房偷拍实录-少林肉棒替女信徒消灾.html';
  
  const result = await extension.detail(testUrl);
  
  if (result) {
    console.log('\n🎉 Test completed successfully!');
    console.log(`📋 Title: ${result.title}`);
    console.log(`🎬 Video URL: ${result.playUrl}`);
    console.log(`📺 Type: ${result.type}`);
  } else {
    console.log('\n💔 Test failed - no video URL extracted');
  }
}

// 运行测试
if (require.main === module) {
  testMadouTV().catch(console.error);
}

module.exports = { MadouTVExtension, testMadouTV };