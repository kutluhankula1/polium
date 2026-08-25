export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    // Örnek (Placeholder) isimler ve mesajlar havuzu (100'e tamamlamak için)
    const dummyPool = [
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

    // 1. GET İsteği: Siteden liste istendiğinde
    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            let realUsers = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];

            // A) Gerçek kullanıcıları ödedikleri miktara göre büyükten küçüğe sırala (Number dönüşümü yaparak)
            realUsers.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));

            // B) Eğer 100'den azsa, kalan kısmı rastgele/örnek kullanıcılarla 100'e tamamla
            let fullList = [...realUsers];
            let dummyIndex = 0;
            
            while (fullList.length < 100) {
                let baseUser = dummyPool[dummyIndex % dummyPool.length];
                // Rastgele ama mantıklı tutarlar üretelim (10 ile 500 USDT arası)
                let randomAmount = Math.floor(Math.random() * 490) + 10;
                
                fullList.push({
                    name: `${baseUser.name}_${fullList.length + 1}`,
                    message: baseUser.message,
                    amount: randomAmount,
                    isDummy: true
                });
                dummyIndex++;
            }

            // Örnekleri de kendi aralarında tutara göre sıralayalım ki gerçeklerin arasına doğru yerleşsinler veya en alta kalsınlar
            // İstersen gerçekler her zaman üstte kalır, arkasından dummy'ler dizilir:
            // Gerçekleri öne koyup, dummy'leri kendi içinde sıralayabiliriz:
            let dummyUsers = fullList.filter(u => u.isDummy);
            dummyUsers.sort((a, b) => b.amount - a.amount);

            let finalUsers = [...realUsers, ...dummyUsers].slice(0, 100);

            return res.status(200).json({ users: finalUsers });
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

                    // Yeni gerçek kullanıcıyı ekle
                    currentUsers.push({ name, message: msgText, amount: parseFloat(amount) });

                    // JSONBin'e kaydet
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
                        await fetch(`https://api.telegram.org/bot${botToken}/editMessageRule`, { ... }); // pass
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
