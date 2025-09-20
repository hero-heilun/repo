#!/usr/bin/env node

const https = require('https');

async function analyzePage() {
  const url = 'https://madou.club/md0362-淫僧释永信禅房偷拍实录-少林肉棒替女信徒消灾.html';
  
  console.log('🔍 Analyzing madou.club page structure...\n');
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Page loaded: ${data.length} characters\n`);
        
        // 1. 查找所有iframe标签
        console.log('🔍 Looking for iframe tags...');
        const iframeMatches = [...data.matchAll(/<iframe[^>]*>/gi)];
        console.log(`Found ${iframeMatches.length} iframe tags:`);
        iframeMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[0]}`);
        });
        console.log();
        
        // 2. 查找video相关标签
        console.log('🔍 Looking for video tags...');
        const videoMatches = [...data.matchAll(/<video[^>]*>/gi)];
        console.log(`Found ${videoMatches.length} video tags:`);
        videoMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[0]}`);
        });
        console.log();
        
        // 3. 查找embed标签
        console.log('🔍 Looking for embed tags...');
        const embedMatches = [...data.matchAll(/<embed[^>]*>/gi)];
        console.log(`Found ${embedMatches.length} embed tags:`);
        embedMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[0]}`);
        });
        console.log();
        
        // 4. 查找script标签中的视频相关内容
        console.log('🔍 Looking for video-related content in scripts...');
        const scriptMatches = [...data.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
        console.log(`Found ${scriptMatches.length} script tags`);
        
        let foundVideoScript = false;
        scriptMatches.forEach((script, index) => {
          const content = script[1];
          const keywords = ['token', 'm3u8', 'video', 'player', 'src', '.mp4', '.flv'];
          const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (foundKeywords.length > 0) {
            console.log(`  Script ${index + 1}: Contains ${foundKeywords.join(', ')}`);
            console.log(`    Preview: ${content.substring(0, 200).replace(/\s+/g, ' ')}...`);
            foundVideoScript = true;
          }
        });
        
        if (!foundVideoScript) {
          console.log('  No video-related scripts found');
        }
        console.log();
        
        // 5. 查找article-content div
        console.log('🔍 Looking for article-content div...');
        const articleMatch = data.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s);
        if (articleMatch) {
          console.log(`Found article-content div (${articleMatch[1].length} chars)`);
          console.log(`Preview: ${articleMatch[1].substring(0, 500).replace(/\s+/g, ' ')}...`);
        } else {
          console.log('No article-content div found');
        }
        console.log();
        
        // 6. 查找所有包含src的标签
        console.log('🔍 Looking for any tags with src attributes...');
        const srcMatches = [...data.matchAll(/<[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)];
        console.log(`Found ${srcMatches.length} tags with src:`);
        srcMatches.forEach((match, index) => {
          const fullTag = match[0];
          const srcUrl = match[1];
          if (srcUrl && !srcUrl.includes('data:') && !srcUrl.includes('.css') && !srcUrl.includes('.js') && !srcUrl.includes('.png') && !srcUrl.includes('.jpg') && !srcUrl.includes('.gif')) {
            console.log(`  ${index + 1}. ${fullTag}`);
            console.log(`      -> ${srcUrl}`);
          }
        });
        
        resolve();
      });
    }).on('error', reject);
  });
}

analyzePage().catch(console.error);