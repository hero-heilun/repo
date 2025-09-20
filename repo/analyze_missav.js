#!/usr/bin/env node

const https = require('https');

async function analyzeMissav() {
  const url = 'https://missav.ai';
  
  console.log('🔍 Analyzing MissAV page structure...\n');
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Page loaded: ${data.length} characters\n`);
        
        // 1. 查找视频卡片的各种可能结构
        console.log('🔍 Looking for video card patterns...');
        
        // 查找所有包含href的a标签
        const linkMatches = [...data.matchAll(/<a[^>]*href="([^"]*\/[A-Z0-9-]+[^"]*)"[^>]*>/gi)];
        console.log(`Found ${linkMatches.length} video-like links:`);
        linkMatches.slice(0, 5).forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[1]}`);
        });
        console.log();
        
        // 2. 查找图片标签
        console.log('🔍 Looking for image tags...');
        const imgMatches = [...data.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)];
        console.log(`Found ${imgMatches.length} image tags:`);
        imgMatches.slice(0, 5).forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[1]}`);
        });
        console.log();
        
        // 3. 查找标题相关的标签
        console.log('🔍 Looking for title tags...');
        const titleMatches = [...data.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi)];
        console.log(`Found ${titleMatches.length} heading tags:`);
        titleMatches.slice(0, 5).forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[1].trim()}`);
        });
        console.log();
        
        // 4. 查找包含class的div
        console.log('🔍 Looking for class-based divs...');
        const classMatches = [...data.matchAll(/<div[^>]*class="([^"]+)"[^>]*>/gi)];
        const uniqueClasses = [...new Set(classMatches.map(m => m[1]))];
        console.log(`Found ${uniqueClasses.length} unique div classes:`);
        uniqueClasses.slice(0, 10).forEach((cls, index) => {
          console.log(`  ${index + 1}. ${cls}`);
        });
        console.log();
        
        // 5. 查看页面title
        const pageTitleMatch = data.match(/<title>([^<]+)<\/title>/);
        if (pageTitleMatch) {
          console.log(`📋 Page title: ${pageTitleMatch[1]}`);
        }
        
        // 6. 检查是否有Cloudflare保护或其他阻止
        if (data.includes('cloudflare') || data.includes('cf-browser-verification')) {
          console.log('⚠️ Cloudflare protection detected');
        }
        
        if (data.includes('403') || data.includes('Forbidden')) {
          console.log('⚠️ Access forbidden detected');
        }
        
        // 7. 输出页面的前500个字符用于分析
        console.log('\n📄 First 500 characters of page:');
        console.log(data.substring(0, 500));
        
        resolve();
      });
    }).on('error', reject);
  });
}

analyzeMissav().catch(console.error);