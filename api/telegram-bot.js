export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    const baseTemplates = [
        { name: "CryptoKing", message: "To the moon 🚀" },
        { name: "Satoshi_N", message: "Building the future" },
        { name: "WhaleHunter", message: "LFG 🔥" },
        { name: "BlockchainDev", message: "Web3 is here" },
        { name: "MoonWalker", message: "Holding strong diamond hands 💎" },
        { name: "AlphaSeeker", message: "Next 100x gem" },
        { name: "TokenMaster", message: "Polium to the top!" },
        { name: "DeFiGod", message: "Yield farming season" },
        { name: "BitMonster", message: "Bullish on this project" },
        { name: "SolanaSurfer", message: "Greetings from crypto community" }
    ];

    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            let rawUsers = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];

            // Spam temizliği ve ondalık formatı
            let realUsers = rawUsers
                .filter(u => {
                    const n = (u.name || "").toLowerCase();
                    return !n.includes("victor");
                })
                .map(u => ({
                    ...u,
                    amount: parseFloat(parseFloat(u.amount || 0).toFixed(2))
                }));

            let fullList = [...realUsers];
            let index = 0;
            
            // Tamamen bağımsız ve rastgele dağılımlı örnek tutarlar üretimi
            // Her eleman için tamamen rasyonel olmayan, birbirinden kopuk rastgele düşüşler ve küsuratlar kullanıyoruz
            let currentMockAmount = 492.35;
            while (fullList.length < 100) {
                let template = baseTemplates[index % baseTemplates.length];
                
                // Tamamen rastgele aralıklarda düşüşler (bazen 1.20 dolar, bazen 14.50 dolar, bazen 3.75 dolar)
                let randomJump = (Math.sin(index * 99) * 10 + 12) * (1 + (index % 3));
                currentMockAmount = Math.max(10.50, currentMockAmount - randomJump);

                // Tamamen bağımsız küsurat üretimi
                let centsOptions = [0.12, 0.45, 0.78, 0.33, 0.90, 0.15, 0.67, 0.89, 0.24, 0.51];
                let baseInt = Math.floor(currentMockAmount);
                let finalMockAmt = baseInt + centsOptions[(index * 7) % centsOptions.length];

                fullList.push({
                    name: `${template.name}_${fullList.length + 1}`,
                    message: template.message,
                    amount: parseFloat(finalMockAmt.toFixed(2))
                });
                index++;
            }

            // Büyükten küçüğe kusursuz sıralama (Örnekler ve gerçekler kendi aralarında doğru sıraya oturur)
            fullList.sort((a, b) => b.amount - a.amount);

            let formattedList = fullList.slice(0, 100).map(u => ({
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

            if (dataStr && dataStr.startsWith('confirm_')) {
                try {
                    const parts = dataStr.split('|');
                    const name = decodeURIComponent(parts[1]);
                    const amount = parseFloat(parseFloat(parts[2]).toFixed(2));
                    const msgText = decodeURIComponent(parts[3] || '');

                    let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    let binData = await getRes.json();
                    let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

                    currentUsers = currentUsers.filter(u => !u.name || !u.name.toLowerCase().includes("victor"));
                    currentUsers.push({ name, message: msgText, amount: amount });

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
                            text: "✅ Başarıyla onaylandı ve siteye eklendi!" 
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
            } else if (dataStr && dataStr.startsWith('reject_')) {
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
            const { name, message, amount, txid } = req.body;
            const text = `🚀 YENI POLIUM BASVURUSU!\n\n👤 Isim: ${name}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

            const callbackData = `confirm_|${encodeURIComponent(name)}|${amount}|${encodeURIComponent(message)}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "✅ Onayla", callback_data: callbackData },
                        { text: "❌ Reddet", callback_data: `reject_${encodeURIComponent(name)}` }
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
