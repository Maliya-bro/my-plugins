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

// --- HANDLER: QUALITY SELECTION ---
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
                const sizeMatch = parentText.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
                if (sizeMatch) {
                    const sizeVal = parseFloat(sizeMatch[1]);
                    const unit = sizeMatch[3].toUpperCase();
                    let sizeInGB = unit === 'MB' ? sizeVal / 1024 : sizeVal;
                    if (sizeInGB <= 2.0) { // WhatsApp 2GB Limit
                        downloadLinks.push({ url, quality, size: sizeMatch[0] });
                    }
                }
            });
            if (downloadLinks.length === 0) return reply("❌ Qualities under 2GB not found.");
            pendingQuality[sender] = { title: selected.title, links: downloadLinks };
            let qMsg = `🎬 *SELECT QUALITY - MALIYA-MD*\n\n`;
            downloadLinks.forEach((l, i) => qMsg += `*${i+1}.* ${l.quality} (${l.size})\n`);
            reply(qMsg + `\n📥 *Reply with number to process via MEGA.*`);
        } catch (e) { reply("❌ LINK ERROR: " + e.message); }
    }
});

// --- HANDLER: DOWNLOAD -> MEGA -> WHATSAPP -> DELETE ---
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
            const storage = await new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD }).ready;
            
            // Download from source as Stream and Upload to MEGA
            const response = await axios({ method: 'get', url: directLink, responseType: 'stream', headers: { "Referer": "https://cinesubz.lk/", "User-Agent": "Mozilla/5.0" } });
            
            const fileName = `${data.title.replace(/[^a-zA-Z0-3]/g, "_")}_MALIYA_MD.mp4`;
            const file = await storage.upload(fileName, response.data).complete;
            
            reply("☁️ *UPLOADED TO MEGA!* Now streaming to WhatsApp...");

            // Get the Buffer from MEGA and send to WhatsApp
            const fileBuffer = await file.downloadBuffer();
            
            await sock.sendMessage(from, {
                document: fileBuffer,
                mimetype: "video/mp4",
                fileName: fileName,
                caption: `🎬 *${data.title}*\n\n*Quality:* ${selected.quality}\n*Size:* ${selected.size}\n*Cloud:* MALIYA-MD MEGA STORAGE`
            }, { quoted: mek });

            // AUTO DELETE FROM MEGA
            await file.delete();
            reply("✅ *PROCESS COMPLETE!*\nFile sent and auto-deleted from MEGA.");

        } catch (e) {
            reply("❌ PROCESS ERROR: " + e.message);
        }
    }
});
