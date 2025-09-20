// ==MiruExtension==
// @name         Test Parameters
// @version      v0.0.1
// @author       testuser
// @lang         all
// @license      MIT
// @icon         https://madou.club/favicon.ico
// @package      test.params
// @type         bangumi
// @webSite      https://madou.club
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    console.log("=== TEST LATEST METHOD ===");
    console.log("Page parameter:", page);
    console.log("Type of page:", typeof page);
    console.log("Arguments length:", arguments.length);
    console.log("All arguments:", Array.from(arguments));
    
    return [{
      title: "Test Latest",
      url: "/test",
      cover: "https://via.placeholder.com/300x400"
    }];
  }

  async search(kw, page) {
    console.log("=== TEST SEARCH METHOD ===");
    console.log("Keyword parameter:", kw);
    console.log("Page parameter:", page);
    console.log("Type of kw:", typeof kw);
    console.log("Type of page:", typeof page);
    console.log("Arguments length:", arguments.length);
    console.log("All arguments:", Array.from(arguments));
    
    return [{
      title: `Search result for: ${kw}`,
      url: "/test",
      cover: "https://via.placeholder.com/300x400"
    }];
  }

  async detail(url) {
    console.log("=== TEST DETAIL METHOD ===");
    console.log("URL parameter:", url);
    console.log("Type of url:", typeof url);
    console.log("Arguments length:", arguments.length);
    console.log("All arguments:", Array.from(arguments));
    
    return {
      title: "Test Detail",
      cover: "https://via.placeholder.com/300x400",
      desc: `Testing detail for URL: ${url}`,
      episodes: [{
        title: "Episode 1",
        urls: [{
          name: "Test Episode",
          url: url || "/test"
        }]
      }]
    };
  }

  async watch(url) {
    console.log("=== TEST WATCH METHOD ===");
    console.log("URL parameter:", url);
    console.log("Type of url:", typeof url);
    console.log("Arguments length:", arguments.length);
    console.log("All arguments:", Array.from(arguments));
    
    return {
      type: "hls",
      url: "https://test.example.com/test.m3u8"
    };
  }
}