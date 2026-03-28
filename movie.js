const { cmd, replyHandlers } = require("../command");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const pendingSearch = {};
const pendingQuality = {};

/**
 * MALIYA-MD BROWSER ENGINE
 * Bypassing Cinesubz & ZT-Links Security
 */
async function getBypassedContent(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        // Delay for link generation (Timer bypass)
        await new Promise(r => setTimeout(r, 8000)); 
        const content = await page.content();
        await browser.close();
        return content;
    } catch (e) {
        console.error("MALIYA-MD ENGINE ERROR:", e.message);
        await browser.close();
        return null;
    }
}

// --- MOVIE SEARCH COMMAND ---

cmd({
    pattern: "film",
    alias: ["movie", "cinesubz"],
    react: "🎬",
    category: "download",
    filename: __filename
}, async (sock, mek, m, { from, q, sender, reply }) => {
    if (!q) return reply("Please provide a movie name.");
    
    reply("🔎 *MALIYA-MD DATABASE IS SEARCHING...*");

    try {
        const searchUrl = `https://cinesubz.lk/?s=${encodeURIComponent(q)}`;
        const html = await getBypassedContent(searchUrl);
        
        if (!html) return reply("❌ Security Bypass Failed. Please try again.");

        const $ = cheerio.load(html);
        const results = [];

        $('.display-item').each((i, el) => {
            if (i < 5) {
                const title = $(el).find('h2 a').text().trim() || $(el).find('a').attr('title');
                const link = $(el).find('a').attr('href');
                const img = $(el).find('img').attr('src');
                if(link) results.push({ id: i + 1, title, link, img });
            }
        });

        if (results.length === 0) return reply("❌ No results found in MALIYA-MD DATABASE.");

        pendingSearch[sender] = { results };
        
        let msg = `🎬 *MALIYA-MD MOVIE SEARCH RESULTS*\n\n`;
        results.forEach((res, i) => msg += `*${i+1}.* ${res.title}\n`);
        msg += `\n📥 *Reply with the number to select quality.*`;

        await sock.sendMessage(from, { image: { url: results[0].img }, caption: msg }, { quoted: mek });
    } catch (e) { 
        reply("❌ SYSTEM ERROR: " + e.message); 
    }
});

// --- SELECTION HANDLERS ---

replyHandlers.push({
    filter: (body, { sender }) => pendingSearch[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const selected = pendingSearch[sender].results[parseInt(body) - 1];
        if (!selected) return;
        delete pendingSearch[sender];

        reply(`⏳ *MALIYA-MD IS EXTRACTING LINKS...*\nTarget: ${selected.title}`);

        try {
            const moviePageHtml = await getBypassedContent(selected.link);
            const $ = cheerio.load(moviePageHtml);
            
            let downloadLinks = [];
            $('a[href*="zt-links"]').each((i, el) => {
                const url = $(el).attr('href');
                const parentText = $(el).closest('tr, div').text();
                const quality = parentText.includes('1080p') ? '1080p' : parentText.includes('720p') ? '720p' : '480p';
                const size = parentText.match(/\d+(\.\d+)?\s*(GB|MB)/i)?.[0] || 'Unknown Size';
                
                downloadLinks.push({ url, quality, size });
            });

            if (downloadLinks.length === 0) return reply("❌ No direct links found on the page.");

            pendingQuality[sender] = { title: selected.title, links: downloadLinks };
            
            let qMsg = `🎬 *SELECT QUALITY - MALIYA-MD*\n\n`;
            downloadLinks.forEach((l, i) => qMsg += `*${i+1}.* ${l.quality} (${l.size})\n`);
            reply(qMsg + `\n📥 *Reply with the number to start download.*`);

        } catch (e) {
            reply("❌ LINK ERROR: " + e.message);
        }
    }
});

replyHandlers.push({
    filter: (body, { sender }) => pendingQuality[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const data = pendingQuality[sender];
        const selected = data.links[parseInt(body) - 1];
        if (!selected) return;
        delete pendingQuality[sender];

        reply("🚀 *MALIYA-MD IS BYPASSING FINAL CLOUD HOST...*");

        try {
            const finalHtml = await getBypassedContent(selected.url);
            const directFileLink = finalHtml.match(/https?:\/\/(bot\d|sonic-cloud|cloud)[^\s"']+/)?.[0];

            if (!directFileLink) {
                return reply("❌ Failed to generate download link.");
            }

            reply("📤 *MALIYA-MD IS UPLOADING AS DOCUMENT...*");

            // FINAL UPLOAD LOGIC IN DOCUMENT FORMAT WITH HEADERS
            await sock.sendMessage(from, {
                document: { 
                    url: directFileLink 
                },
                mimetype: "video/mp4",
                fileName: `${data.title} MALIYA-MD.mp4`,
                caption: `🎬 *${data.title}*\n\n*Quality:* ${selected.quality}\n*Size:* ${selected.size}\n*Powered by MALIYA-MD DATABASE*`,
                headers: {
                    "Referer": "https://cinesubz.lk/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            }, { quoted: mek });

        } catch (e) {
            reply("❌ FINAL DOWNLOAD ERROR: " + e.message);
        }
    }
});
