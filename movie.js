const { cmd, replyHandlers } = require("../command");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable Stealth Plugin to bypass bot detection
puppeteer.use(StealthPlugin());

const pendingSearch = {};
const pendingQuality = {};

/**
 * Function to handle Browser Automation and Security Bypass
 * Handles ZT-Links, Cloudflare, and Redirects
 */
async function getBypassedContent(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-blink-features=AutomationControlled'
        ]
    });
    const page = await browser.newPage();
    
    // Set realistic User Agent to look like a real person
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Wait for ZT-Links timer/redirect (As seen in Screenshot 9 & 10)
        await new Promise(r => setTimeout(r, 7000)); 

        const content = await page.content();
        await browser.close();
        return content;
    } catch (e) {
        console.error("MALIYA-MD BROWSER ERROR:", e.message);
        await browser.close();
        return null;
    }
}

// --- MALIYA-MD MOVIE COMMANDS ---

cmd({
    pattern: "film",
    alias: ["movie", "cinesubz"],
    react: "🎬",
    category: "download",
    filename: __filename
}, async (sock, mek, m, { from, q, sender, reply }) => {
    if (!q) return reply("Please provide a movie name. (e.g. .film O' Romeo)");
    
    reply("🔎 *MALIYA-MD DATABASE IS SEARCHING...* \nBypassing Security Filters...");

    try {
        const searchUrl = `https://cinesubz.lk/?s=${encodeURIComponent(q)}`;
        const html = await getBypassedContent(searchUrl);
        
        if (!html) return reply("❌ Security Bypass Failed. Please try again later.");

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

        if (results.length === 0) return reply("❌ No movies found in MALIYA-MD Database.");

        pendingSearch[sender] = { results };
        
        let msg = `🎬 *MALIYA-MD MOVIE SEARCH RESULTS*\n\n`;
        results.forEach((res, i) => msg += `*${i+1}.* ${res.title}\n`);
        msg += `\n📥 *Reply with the number to get links.*`;

        await sock.sendMessage(from, { image: { url: results[0].img }, caption: msg }, { quoted: mek });
    } catch (e) { 
        reply("❌ SYSTEM ERROR: " + e.message); 
    }
});

// --- REPLY HANDLERS FOR SELECTION ---

replyHandlers.push({
    filter: (body, { sender }) => pendingSearch[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const selected = pendingSearch[sender].results[parseInt(body) - 1];
        if (!selected) return;
        delete pendingSearch[sender];

        reply(`⏳ *MALIYA-MD IS EXTRACTING LINKS...*\nTarget: ${selected.title}\n(Please wait 15-30 seconds)`);

        try {
            // Step 1: Scrape Movie Page for ZT-Links
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

            if (downloadLinks.length === 0) return reply("❌ Failed to find direct links on this page.");

            pendingQuality[sender] = { title: selected.title, links: downloadLinks };
            
            let qMsg = `🎬 *SELECT QUALITY - MALIYA-MD*\n\n`;
            downloadLinks.forEach((l, i) => qMsg += `*${i+1}.* ${l.quality} (${l.size})\n`);
            reply(qMsg + `\n📥 *Reply with the number to download.*`);

        } catch (e) {
            reply("❌ LINK EXTRACTION ERROR: " + e.message);
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

        reply("🚀 *MALIYA-MD IS BYPASSING FINAL CLOUD HOST...*\nPreparing your file download link.");

        try {
            // Step 2: Bypass ZT-Links to get Final Cloud Link (As seen in SS 12)
            const finalHtml = await getBypassedContent(selected.url);
            
            // Regex to find bot/sonic-cloud streaming/download link from the source
            const directFileLink = finalHtml.match(/https?:\/\/(bot\d|sonic-cloud|cloud)[^\s"']+/)?.[0];

            if (!directFileLink) {
                return reply("❌ Direct Link Generation Failed. The host might be protected.");
            }

            reply("📤 *UPLOADING FILE TO WHATSAPP...*");

            await sock.sendMessage(from, {
                document: { url: directFileLink },
                mimetype: "video/mp4",
                fileName: `${data.title} MALIYA-MD.mp4`,
                caption: `🎬 *${data.title}*\n\n*Quality:* ${selected.quality}\n*Source:* MALIYA-MD DATABASE`
            }, { quoted: mek });

        } catch (e) {
            reply("❌ FINAL DOWNLOAD ERROR: " + e.message);
        }
    }
});
