// ==MiruExtension==
// @name         Jable
// @version      v0.0.2
// @author       YourName
// @lang         zh-cn
// @license      MIT
// @icon         https://jable.tv/favicon.ico
// @package      jable.tv
// @type         bangumi
// @webSite      https://jable.tv
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const url = page === 1 ? '/hot/' : `/hot/page/${page}/`;
    const res = await this.request(url, {
        headers: { "Accept-Encoding": "identity" },
    });

    const videoItems = res.match(/<div class="card-video">[\s\S]+?<\/div>[\s\S]+?<\/div>/g);
    if (!videoItems) {
      return [];
    }

    const novel = [];
    for (const item of videoItems) {
      const urlMatch = item.match(/<a href="([^"]+)"/);
      const titleMatch = item.match(/<h6 class="title">([^<]+)<\/h6>/);
      const coverMatch = item.match(/<img[^>]+src="([^"]+)"/);

      if (urlMatch && titleMatch && coverMatch) {
        novel.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1],
          cover: coverMatch[1],
        });
      }
    }
    return novel;
  }

  async search(kw, page) {
    const url = page === 1 ? `/search/${kw}/` : `/search/${kw}/page/${page}/`;
    const res = await this.request(url, {
        headers: { "Accept-Encoding": "identity" },
    });

    const videoItems = res.match(/<div class="card-video">[\s\S]+?<\/div>[\s\S]+?<\/div>/g);
    if (!videoItems) {
      return [];
    }

    const novel = [];
    for (const item of videoItems) {
      const urlMatch = item.match(/<a href="([^"]+)"/);
      const titleMatch = item.match(/<h6 class="title">([^<]+)<\/h6>/);
      const coverMatch = item.match(/<img[^>]+src="([^"]+)"/);

      if (urlMatch && titleMatch && coverMatch) {
        novel.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1],
          cover: coverMatch[1],
        });
      }
    }
    return novel;
  }

  async detail(url) {
    const res = await this.request(url, {
      headers: { "Accept-Encoding": "identity" },
    });

    const titleMatch = res.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const coverMatch = res.match(/<meta property="og:image" content="([^"]+)"/);
    let cover = coverMatch ? coverMatch[1] : "";
    
    if (!cover) {
        const posterMatch = res.match(/poster="([^"]+)"/);
        if (posterMatch) {
            cover = posterMatch[1];
        }
    }

    const descMatch = res.match(/<div class="synopsis">[^]+?<span>([^<]+)<\/span>/);
    const desc = descMatch ? descMatch[1].trim() : "";

    const hlsUrlMatch = res.match(/var hlsUrl = '([^']+)';/);
    const hlsUrl = hlsUrlMatch ? hlsUrlMatch[1] : "";

    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: "Directory",
          urls: [
            {
              name: title,
              url: hlsUrl,
            },
          ],
        },
      ],
    };
  }

  async watch(url) {
    return {
      type: "hls",
      url: url,
    };
  }
}