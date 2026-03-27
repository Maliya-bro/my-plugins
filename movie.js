const { cmd, replyHandlers } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth plugin එක add කිරීම (Bot detection මඟහැරීමට)
puppeteer.use(StealthPlugin());

const pendingSearch = {};
const pendingQuality = {};

// Browser එක open කරලා bypass කරන function එක
async function getBypassedContent(url) {
    const browser = await puppeteer.launch({
        headless: true, // බ්‍රවුසරය පේන්න ඕන නම් false දාන්න
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // සැබෑ User Agent එකක් සැකසීම
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        // Cloudflare/ZT-Links වලට තත්පර කිහිපයක් වෙලාව දෙන්න
        await new Promise(r => setTimeout(r, 5000)); 
        
        const content = await page.content();
        await browser.close();
        return content;
    } catch (e) {
        console.error("Puppeteer Error:", e.message);
        await browser.close();
        return null;
    }
}

async function getDirectDownloadLinks(movieUrl) {
    try {
        // 1. Movie Page එකෙන් විස්තර ගැනීම
        const html = await getBypassedContent(movieUrl);
        if (!html) return [];

        const $ = cheerio.load(html);
        const ztLinks = [];

        $('a[href*="/zt-links/"]').each((i, el) => {
            const url = $(el).attr('href');
            const parentText = $(el).closest('tr, div').text();
            const quality = parentText.includes('1080p') ? '1080p' : parentText.includes('720p') ? '720p' : '480p';
            const size = parentText.match(/\d+(\.\d+)?\s*(GB|MB)/i)?.[0] || 'Unknown';
            ztLinks.push({ url, quality, size });
        });

        if (ztLinks.length === 0) return [];

        let finalLinks = [];
        // පළමු ලින්ක් එක bypass කරමු
        const target = ztLinks[0];
        const ztPageHtml = await getBypassedContent(target.url);
        
        if (ztPageHtml) {
            // Sonic-cloud හෝ Direct link එක සොයාගැනීම (Regex)
            const sonicLinkMatch = ztPageHtml.match(/https?:\/\/sonic-cloud\.online\/[^\s"']+/);
            if (sonicLinkMatch) {
                finalLinks.push({
                    link: sonicLinkMatch[0],
                    quality: target.quality,
                    size: target.size
                });
            }
        }

        return finalLinks;
    } catch (e) {
        console.error("Scraping error:", e.message);
        return [];
    }
}

// --- Commands ---

cmd({
    pattern: "film",
    alias: ["movie", "cinesubz"],
    react: "🎬",
    category: "download",
    filename: __filename
}, async (sock, mek, m, { from, q, sender, reply }) => {
    if (!q) return reply("චිත්‍රපටයක නමක් ලබා දෙන්න.");
    reply("🔎 සෙවුම් කරමින් පවතී (Security Bypass Active)...");

    try {
        const searchUrl = `https://cinesubz.lk/?s=${encodeURIComponent(q)}`;
        const searchHtml = await getBypassedContent(searchUrl);
        if (!searchHtml) return reply("❌ වෙබ් අඩවියට පිවිසීමට නොහැකි විය.");

        const $ = cheerio.load(searchHtml);
        const results = [];

        $('.display-item .item-box').each((i, el) => {
            if (i < 5) {
                results.push({
                    id: i + 1,
                    title: $(el).find('a').attr('title')?.trim() || "No Title",
                    movieUrl: $(el).find('a').attr('href'),
                    thumb: $(el).find('img').attr('src')
                });
            }
        });

        if (results.length === 0) return reply("❌ කිසිවක් හමු වූයේ නැත.");

        pendingSearch[sender] = { results };
        let msg = `🎬 *MALIYA-MD MOVIE SEARCH*\n\n`;
        results.forEach((res, i) => msg += `*${i+1}.* ${res.title}\n`);
        msg += `\n📥 *අංකය Reply කරන්න.*`;

        await sock.sendMessage(from, { image: { url: results[0].thumb }, caption: msg }, { quoted: mek });
    } catch (e) { reply("Error: " + e.message); }
});

// Selection Handlers (පැරණි විදිහටම තියන්න)
replyHandlers.push({
    filter: (body, { sender }) => pendingSearch[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const selected = pendingSearch[sender].results[parseInt(body) - 1];
        if (!selected) return;
        delete pendingSearch[sender];

        reply(`⏳ *${selected.title}* ලින්ක් ලබාගනිමින් පවතී (මෙයට විනාඩියක් පමණ ගත විය හැක)...`);
        const links = await getDirectDownloadLinks(selected.movieUrl);
        
        if (links.length === 0) return reply("❌ ආරක්ෂක පද්ධතිය මඟහැරීමට නොහැකි විය. පසුව උත්සාහ කරන්න.");

        pendingQuality[sender] = { title: selected.title, links };
        let qMsg = `🎬 *${selected.title}*\n\n`;
        links.forEach((l, i) => qMsg += `*${i+1}.* ${l.quality} (${l.size})\n`);
        reply(qMsg + `\n📥 *අංකය Reply කරන්න.*`);
    }
});

replyHandlers.push({
    filter: (body, { sender }) => pendingQuality[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const data = pendingQuality[sender];
        const selected = data.links[parseInt(body) - 1];
        if (!selected) return;
        delete pendingQuality[sender];

        reply("📤 ගොනුව එවමින් පවතී...");
        try {
            await sock.sendMessage(from, {
                document: { url: selected.link },
                mimetype: "video/mp4",
                fileName: `${data.title}.mp4`,
                caption: `🎬   *${data.title}*\n\n*Enjoy!*`
            }, { quoted: mek });
        } catch (e) { reply("❌ Download Error: " + e.message); }
    }
});
