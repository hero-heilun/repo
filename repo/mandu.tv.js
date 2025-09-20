// ==MiruExtension==
// @name         麻豆传媒
// @version      v0.0.2
// @author       jason
// @lang         zh-cn
// @license      MIT
// @icon         https://madou.club/favicon.ico
// @package      mandu.tv
// @type         bangumi
// @webSite      https://madou.club
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  genres = {
    "guochan": "国产原创",
    "zhongwen": "中文字幕",
    "rihan": "日韩无码",
    "oumei": "欧美系列",
    "dongman": "动漫卡通"
  };

  async load() {
    // No pre-loading needed for this extension
  }

  async createFilter() {
    return {
      genres: {
        title: "分类",
        max: 1,
        min: 0,
        default: "",
        options: this.genres,
      }
    };
  }

  async latest(page = 1) {
    const url = page === 1 ? "/" : `/page/${page}`;
    const res = await this.request(url, {
      headers: { "Miru-Url": "https://madou.club" },
    });
    return this.parseVideoList(res);
  }

  async search(kw, page = 1, filter) {
    if (!kw && !filter?.genres?.[0]) {
      return this.latest(page);
    }

    let url;
    if (filter?.genres?.[0]) {
      const categoryId = filter.genres[0];
      url = page === 1 ? `/category/${categoryId}` : `/category/${categoryId}/page/${page}`;
    } else {
      url = `/page/${page}?s=${encodeURIComponent(kw)}`;
    }

    const res = await this.request(url, {
      headers: { "Miru-Url": "https://madou.club" },
    });
    return this.parseVideoList(res);
  }

  parseVideoList(html) {
    const articles = [...html.matchAll(/<article[^>]*>(.*?)<\/article>/gs)];
    const videos = [];

    for (const articleMatch of articles) {
      const articleHtml = articleMatch[0];
      const titleMatch = articleHtml.match(/<h2[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s);
      const urlMatch = articleHtml.match(/<h2[^>]*>.*?<a[^>]*href="([^"]+)"/s);
      const coverMatch = articleHtml.match(/<img[^>]*(?:data-src|src)="([^"]+)"/);
      const updateMatch = articleHtml.match(/<div[^>]*class="[^"]*post-view[^"]*"[^>]*>([^<]+)/);

      if (titleMatch && urlMatch) {
        const url = urlMatch[1].replace("https://madou.club", "");
        videos.push({
          title: titleMatch[1].trim(),
          url: url.startsWith('/') ? url : '/' + url,
          cover: coverMatch ? coverMatch[1] : "",
          update: updateMatch ? updateMatch[1].trim() : "",
        });
      }
    }
    return videos;
  }

  async detail(url) {
    const res = await this.request(url, {
      headers: { "Miru-Url": "https://madou.club" },
    });

    const titleMatch = res.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/);
    const coverMatch = res.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    const contentMatch = res.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s);
    const iframeMatch = res.match(/<iframe[^>]*src="([^"]+)"/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const cover = coverMatch ? coverMatch[1] : "";
    let desc = "暂无介绍";
    if (contentMatch) {
        desc = contentMatch[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
    }

    const episodes = [];
    if (iframeMatch) {
      episodes.push({
        title: "播放",
        urls: [{ name: "播放", url: iframeMatch[1] }],
      });
    }

    return {
      title,
      cover,
      desc,
      episodes,
    };
  }

  async watch(url) {
    if (url.includes(".m3u8") || url.includes(".mp4")) {
        return { type: url.includes(".m3u8") ? "hls" : "mp4", url };
    }

    const res = await this.request(url, {
        headers: { "Referer": "https://madou.club/" }
    });

    const m3u8Match = res.match(/["']([^"']*\.m3u8[^"']*)['"]/);
    if (m3u8Match) {
        let videoUrl = m3u8Match[1];
        if (!videoUrl.startsWith("http")) {
            const domainMatch = url.match(/^(https?:\/\/[^\/]+)/);
            if (domainMatch) {
                videoUrl = new URL(videoUrl, domainMatch[0]).href;
            }
        }
        return { type: "hls", url: videoUrl };
    }

    const mp4Match = res.match(/["']([^"']*\.mp4[^"']*)['"]/);
    if (mp4Match) {
        let videoUrl = mp4Match[1];
        if (!videoUrl.startsWith("http")) {
            const domainMatch = url.match(/^(https?:\/\/[^\/]+)/);
            if (domainMatch) {
                videoUrl = new URL(videoUrl, domainMatch[0]).href;
            }
        }
        return { type: "mp4", url: videoUrl };
    }

    return { type: "hls", url };
  }
}
