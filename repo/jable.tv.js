// ==MiruExtension==
// @name         Jable
// @version      v0.0.5
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
    let url;
    if (page === 1) {
      url = '/hot/';
    } else {
      // Use async API for pagination
      const from = String((page - 1) * 24 + 1).padStart(2, '0');
      url = `/hot/?mode=async&function=get_block&block_id=list_videos_common_videos_list&sort_by=video_viewed_week&from=${from}`;
    }
    
    const res = await this.request(url, {
        headers: { "Accept-Encoding": "identity" },
    });

    const regex = /<a href="([^"]*\/videos\/[^"]+)"[\s\S]*?data-src="([^"]+)"[\s\S]*?<h6 class="title"><a[^>]*>([^<]+)<\/a><\/h6>/g;
    const matches = [...res.matchAll(regex)];
    
    const novel = [];
    for (const match of matches) {
        let url = match[1];
        // Convert full URL to relative path if needed
        if (url.startsWith('https://jable.tv')) {
          url = url.replace('https://jable.tv', '');
        }
        novel.push({
          url: url,
          cover: match[2],
          title: match[3].trim(),
        });
    }
    return novel;
  }

  async search(kw, page) {
    const url = page === 1 ? `/search/${kw}/` : `/search/${kw}/page/${page}/`;
    const res = await this.request(url, {
        headers: { "Accept-Encoding": "identity" },
    });

    const regex = /<a href="([^"]*\/videos\/[^"]+)"[\s\S]*?data-src="([^"]+)"[\s\S]*?<h6 class="title"><a[^>]*>([^<]+)<\/a><\/h6>/g;
    const matches = [...res.matchAll(regex)];
    
    const novel = [];
    for (const match of matches) {
        let url = match[1];
        // Convert full URL to relative path if needed
        if (url.startsWith('https://jable.tv')) {
          url = url.replace('https://jable.tv', '');
        }
        novel.push({
          url: url,
          cover: match[2],
          title: match[3].trim(),
        });
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