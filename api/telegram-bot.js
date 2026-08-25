export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    // Sabit, asla yer değiştirmeyen örnek kullanıcı havuzu
    const fixedDummyList = [
        { name: "CryptoKing", message: "To the moon 🚀", amount: 450 },
        { name: "Satoshi_N", message: "Building the future", amount: 400 },
        { name: "WhaleHunter", message: "LFG 🔥", amount: 350 },
        { name: "BlockchainDev", message: "Web3 is here", amount: 300 },
        { name: "MoonWalker", message: "Holding strong diamond hands 💎", amount: 250 },
        { name: "AlphaSeeker", message: "Next 100x gem", amount: 200 },
        { name: "TokenMaster", message: "Polium to the top!", amount: 150 },
        { name: "DeFiGod", message: "Yield farming season", amount: 100 },
        { name: "BitMonster", message: "Bullish on this project", amount: 80 },
        { name: "SolanaSurfer", message: "Greetings from crypto community", amount: 50 }
    ];

    // 1. GET İsteği: Siteden liste istendiğinde
    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            let rawUsers = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];

            // A) "victor" veya spam içeren eski kalıntıları veritabanından tamamen filtreleyip atıyoruz
            let realUsers = rawUsers.filter(u => {
                const n = (u.name || "").toLowerCase();
                return !n.includes("victor");
            });

            // Eğer temizlik sonrası veritabanını güncellemek istersek arka planda güncelleyebiliriz ama GET'te filtrelemek yeterlidir.

            // B) Gerçek kullanıcıları ödedikleri miktara göre büyükten küçüğe sırala
            realUsers.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));

            // C) Sabit örnek listeyi ekleyerek 100'e tamamla (Bunlar asla kendi aralarında oynaşmaz, sabittir)
            let fullList = [...realUsers];
            let dummyIndex = 0;

            while (fullList.length < 100) {
                let template = fixedDummyList[dummyIndex % fixedDummyList.length];
                fullList.push({
                    name: `${template.name}_${fullList.length + 1}`,
                    message: template.message,
                    amount: template.amount - (dummyIndex % 5) // Sabit ve düzgün azalan tutarlar
                });
                dummyIndex++;
            }

            return res.status(200).json({ users: fullList.slice(0, 100) });
        } catch (err) {
            return res.status(200).json({ users: [] });
        }
    }

    // 2. POST İsteği
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
                    const amount = parts[2];
                    const msgText = decodeURIComponent(parts[3] || '');

                    let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    let binData = await getRes.json();
                    let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

                    // Yeni gerçek kullanıcıyı ekle ("victor" olanları da temizleyerek kaydedelim)
                    currentUsers = currentUsers.filter(u => !u.name || !u.name.toLowerCase().includes("victor"));
                    currentUsers.push({ name, message: msgText, amount: parseFloat(amount) });

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
