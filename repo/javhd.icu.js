// ==MiruExtension==
// @name         JAVHD.icu
// @version      v0.0.6
// @author       bachig26
// @lang         jp
// @license      MIT
// @package      javhd.icu
// @type         bangumi
// @icon         https://javhd.icu/wp-content/uploads/2020/04/javhdicuu-logO.png
// @webSite      https://javhd.icu
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const res = await this.request(`/page/${page}/`, {
      headers: {
        'Accept-Encoding': 'identity',
      },
    });
    const bsxList = await this.querySelectorAll(res, "div.col-xl-3.col-lg-3.col-md-6.col-6");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "h3.post-title > a").text;
      const cover = await this.querySelector(html, "img").getAttributeText("src");
      //console.log(title+cover+url)
      novel.push({
        title: title.trim(),
        url,
        cover,
      });
    }
    return novel;
  }

  async search(kw) {
	const kwstring = kw.replace(/ /g, '+');
    const res = await this.request(`/?s=${kwstring}`);
    const bsxList = await this.querySelectorAll(res, "div.item.col-xl-4.col-lg-4.col-md-4.col-sm-6");
    const novel = [];

    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "h3.post-title > a").text;
      const cover = await this.querySelector(html, "img").getAttributeText("src");
      novel.push({
        title: title.trim(),
        url,
        cover,
      });
    }
    return novel;
  }

  async detail(url) {
    const res = await this.request(url, {
      headers: {
        'Accept-Encoding': 'identity',
      },
    });

    const title = await this.querySelector(res, "h1").text;
    const cover = await this.querySelector(res, "meta[property='og:image']").getAttributeText("content");
    // Try multiple ways to get description
    let desc = "";
    
    // First try meta description
    const metaDescMatch = res.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (metaDescMatch) {
        desc = metaDescMatch[1];
    } else {
        // Fallback to post-entry
        const descElement = await this.querySelector(res, "div.post-entry > p");
        if (descElement && typeof descElement.text === 'string') {
            desc = descElement.text;
        }
    }

    let episodeUrl = "";

    const urlPatterns = [
      /https:\/\/emturbovid\.[^\s'"]+/,
      /https:\/\/[^\s'"]*turbovid[^\s'"]+/,
      /https:\/\/[^\s'"]*\.mp4[^\s'"]+/,
      /https:\/\/[^\s'"]*video[^\s'"]+/,
      /https:\/\/[^\s'"]*embed[^\s'"]+/
    ];

    for (const pattern of urlPatterns) {
        const match = res.match(pattern);
        if (match) {
            episodeUrl = match[0];
            break;
        }
    }

    if (!episodeUrl) {
        const iframeMatch = res.match(/<iframe[^>]*src=["']([^"']+)["']/i);
        if (iframeMatch) {
            episodeUrl = iframeMatch[1];
        }
    }

    if (!episodeUrl) {
        const videoMatch = res.match(/<video[^>]*src=["']([^"']+)["']/i);
        if (videoMatch) {
            episodeUrl = videoMatch[1];
        }
    }
    
    function limitWords(text, maxWords) {
        const words = text.split(/\s+/);
        if (words.length > maxWords) {
            return words.slice(0, maxWords).join(" ") + " ...";
        }
        return text;
    }

    return {
        title: limitWords(title.trim(), 10),
        cover,
        desc,
        episodes: [
            {
                title: "Directory",
                urls: [
                    {
                        name: limitWords(title.trim(), 10),
                        url: episodeUrl,
                    },
                ],
            },
        ],
    };
}

  async watch(url) {
    let directUrl = "";
    
    // Handle different video hosting services
    if (url.includes("turbovidhls.com") || url.includes("emturbovid.com")) {
        const res = await this.request(url, {
            headers: {
                "referer": url.includes("emturbovid.com") ? "https://emturbovid.com/" : "https://turbovidhls.com/",
                "origin": url.includes("emturbovid.com") ? "https://emturbovid.com" : "https://turbovidhls.com",
            },
            method: "GET",
        });
        
        const directUrlMatch = res.match(/(https:\/\/[^\s'"]*\.m3u8[^\s'"]*)/);
        directUrl = directUrlMatch ? directUrlMatch[0] : "";
    }
	
    return {
        type: "hls",
        url: directUrl || "",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.142.86 Safari/537.36",
          referer: directUrl,
        },
    };
  }
}
