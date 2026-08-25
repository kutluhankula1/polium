export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    const baseTemplates = [
        { name: "@CryptoKing", message: "To the moon 🚀", nftImg: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150" },
        { name: "@Satoshi_N", message: "Building the future", nftImg: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150" },
        { name: "@WhaleHunter", message: "LFG 🔥", nftImg: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=150" },
        { name: "@BlockchainDev", message: "Web3 is here", nftImg: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=150" },
        { name: "@MoonWalker", message: "Diamond hands 💎", nftImg: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=150" }
    ];

    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            let rawUsers = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];

            let realUsers = rawUsers.map(u => ({
                ...u,
                amount: parseFloat(parseFloat(u.amount || 0).toFixed(2))
            }));

            let fullList = [...realUsers];
            let index = 0;
            
            let currentMockAmount = 492.35;
            while (fullList.length < 20) {
                let template = baseTemplates[index % baseTemplates.length];
                let randomJump = (Math.sin(index * 99) * 10 + 12) * (1 + (index % 3));
                currentMockAmount = Math.max(10.50, currentMockAmount - randomJump);

                let centsOptions = [0.00, 0.25, 0.50, 0.75, 0.33, 0.88, 0.45, 0.90];
                let baseInt = Math.floor(currentMockAmount);
                let finalMockAmt = baseInt + centsOptions[(index * 7) % centsOptions.length];

                fullList.push({
                    name: `${template.name}_${fullList.length + 1}`,
                    message: template.message,
                    nftImg: template.nftImg,
                    amount: parseFloat(finalMockAmt.toFixed(2))
                });
                index++;
            }

            fullList.sort((a, b) => b.amount - a.amount);

            let formattedList = fullList.map(u => ({
                ...u,
                amount: Number(u.amount).toFixed(2)
            }));

            return res.status(200).json({ users: formattedList });
        } catch (err) {
            return res.status(200).json({ users: [] });
        }
    }

    if (req.method === 'POST') {
        if (req.body && req.body.callback_query) {
            const callback = req.body.callback_query;
            const dataStr = callback.data;
            const callbackQueryId = callback.id;
            const messageObj = callback.message;

            if (dataStr === 'cf_yes') {
                try {
                    let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    let binData = await getRes.json();
                    let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

                    // Telegram mesajından bilgileri direkt satır satır okuyoruz
                    let incomingMsg = messageObj.text || "";
                    let lines = incomingMsg.split('\n');
                    
                    let nameLine = lines.find(l => l.startsWith('🐦 X Handle:')) || "🐦 X Handle: @Unknown";
                    let imgLine = lines.find(l => l.startsWith('🖼️ NFT Görsel:')) || "🖼️ NFT Görsel: https://via.placeholder.com/150";
                    let msgLine = lines.find(l => l.startsWith('💬 Mesaj:')) || "💬 Mesaj: Flex";
                    let amtLine = lines.find(l => l.startsWith('💰 Tutar:')) || "💰 Tutar: 0 USDT";

                    let name = nameLine.replace('🐦 X Handle:', '').trim();
                    let nftImg = imgLine.replace('🖼️ NFT Görsel:', '').trim();
                    let msgText = msgLine.replace('💬 Mesaj:', '').trim();
                    
                    let rawAmtStr = amtLine.replace('💰 Tutar:', '').replace('USDT', '').trim();
                    let amount = parseFloat(parseFloat(rawAmtStr || 0).toFixed(2));

                    currentUsers.push({ name, message: msgText, nftImg, amount: amount });

                    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Master-Key': API_KEY
                        },
                        body: JSON.stringify({ users: currentUsers })
                    });

                    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            callback_query_id: callbackQueryId, 
                            text: "✅ Onaylandı! Tahta eklendi." 
                        })
                    });

                    if (messageObj) {
                        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: messageObj.chat.id,
                                message_id: messageObj.message_id,
                                reply_markup: { inline_keyboard: [] }
                            })
                        });
                    }
                } catch (e) {
                    console.error("Onay hatası:", e);
                }
            } else if (dataStr === 'cf_no') {
                try {
                    if (messageObj) {
                        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ callback_query_id: callbackQueryId, text: "❌ Başvuru reddedildi." })
                        });
                        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: messageObj.chat.id,
                                message_id: messageObj.message_id,
                                reply_markup: { inline_keyboard: [] }
                            })
                        });
                    }
                } catch(err) {}
            }

            return res.status(200).json({ status: 'ok' });
        }

        if (req.body.name) {
            const { name, nftImg, message, amount, txid } = req.body;
            const text = `👑 YENİ FLEX BAŞVURUSU!\n\n🐦 X Handle: ${name}\n🖼️ NFT Görsel: ${nftImg}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

            // Callback data artık sadece 6 karakter! Telegram'ın sınırı aşması imkansız, butonlar %100 garantili gelecektir.
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "✅ Onayla", callback_data: "cf_yes" },
                        { text: "❌ Reddet", callback_data: "cf_no" }
                    ]
                ]
            };

            try {
                let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: keyboard })
                });

                let data = await response.json();
                return data.ok ? res.status(200).json({ success: true }) : res.status(400).json({ error: data.description });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
