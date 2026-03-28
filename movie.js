const { cmd, replyHandlers } = require("../command");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const { Storage } = require('megajs');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const pendingSearch = {};
const pendingQuality = {};

// --- MEGA CONFIGURATION ---
// Replace with your MEGA credentials or use Environment Variables
const MEGA_EMAIL = process.env.MEGA_EMAIL || "sithmikavihara801@gmail.com";
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || "@@@iron. spider*man";

async function getBypassedContent(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, 8000)); 
        const content = await page.content();
        await browser.close();
        return content;
    } catch (e) {
        await browser.close();
        return null;
    }
}

// --- COMMAND: FILM SEARCH ---
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
        if (!html) return reply("❌ Security Bypass Failed.");
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
        if (results.length === 0) return reply("❌ No results found.");
        pendingSearch[sender] = { results };
        let msg = `🎬 *MALIYA-MD MOVIE SEARCH RESULTS*\n\n`;
        results.forEach((res, i) => msg += `*${i+1}.* ${res.title}\n`);
        msg += `\n📥 *Reply with number.*`;
        await sock.sendMessage(from, { image: { url: results[0].img }, caption: msg }, { quoted: mek });
    } catch (e) { reply("❌ ERROR: " + e.message); }
});

replyHandlers.push({
    filter: (body, { sender }) => pendingQuality[sender] && !isNaN(body),
    function: async (sock, mek, m, { from, body, sender, reply }) => {
        const data = pendingQuality[sender];
        const selected = data.links[parseInt(body) - 1];
        if (!selected) return;
        delete pendingQuality[sender];

        reply("🚀 *MALIYA-MD PROCESSING...*\n1. Bypassing Host\n2. Uploading to MEGA\n3. Sending to you");

        try {
            const finalHtml = await getBypassedContent(selected.url);
            const directLink = finalHtml.match(/https?:\/\/(bot\d|sonic-cloud|cloud)[^\s"']+/)?.[0];
            if (!directLink) return reply("❌ Failed to bypass host.");

            // Login to MEGA
            const storage = await new Storage({ 
                email: MEGA_EMAIL, 
                password: MEGA_PASSWORD 
            }).ready;
            
            // 403 Error එක විසඳීමට Headers වැඩි දියුණු කිරීම
            const response = await axios({
                method: 'get',
                url: directLink,
                responseType: 'stream',
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Referer': 'https://cinesubz.lk/', // ඉතා වැදගත්
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Origin': 'https://cinesubz.lk'
                }
            });
            
            const fileName = `${data.title.replace(/[^a-zA-Z0-9]/g, "_")}_MALIYA_MD.mp4`;
            
            // MEGA එකට Upload කිරීම
            const file = await storage.upload(fileName, response.data).complete;
            
            reply("☁️ *UPLOADED TO MEGA!* Sending to WhatsApp...");

            const fileBuffer = await file.downloadBuffer();
            
            await sock.sendMessage(from, {
                document: fileBuffer,
                mimetype: "video/mp4",
                fileName: fileName,
                caption: `🎬 *${data.title}*\n\n*Quality:* ${selected.quality}\n*Size:* ${selected.size}\n*Status:* Successfully Processed via MALIYA-MD DATABASE`
            }, { quoted: mek });

            // AUTO DELETE FROM MEGA
            await file.delete();

        } catch (e) {
            console.error(e);
            reply("❌ PROCESS ERROR: " + (e.response ? `Site Blocked Access (Status: ${e.response.status})` : e.message));
        }
    }
});
