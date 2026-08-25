export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    // 1. GET İsteği: Siteden liste çekildiğinde
    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            let users = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];
            return res.status(200).json({ users: users });
        } catch (err) {
            return res.status(200).json({ users: [] });
        }
    }

    // 2. Telegram Webhook (Butona tıklandığında veya mesaj geldiğinde)
    if (req.method === 'POST') {
        // Eğer Telegram'dan bir buton tıklaması (callback_query) geldiyse
        if (req.body && req.body.callback_query) {
            const callback = req.body.callback_query;
            const dataStr = callback.data;
            const callbackQueryId = callback.id;
            const messageObj = callback.message;

            if (dataStr && dataStr.startsWith('confirm_')) {
                try {
                    const parts = dataStr.split('_');
                    const name = decodeURIComponent(parts[1]);
                    const amount = parts[2];
                    const msgText = decodeURIComponent(parts[3] || '');

                    // A) JSONBin'den mevcut veriyi çek
                    let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    let binData = await getRes.json();
                    let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

                    // B) Yeni kullanıcıyı ekle
                    currentUsers.push({ name, message: msgText, amount });

                    // C) JSONBin'e kaydet
                    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Master-Key': API_KEY
                        },
                        body: JSON.stringify({ users: currentUsers })
                    });

                    // D) Telegram'a bildirimi göster
                    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            callback_query_id: callbackQueryId, 
                            text: "✅ Başarı ile onaylandı ve siteye eklendi!" 
                        })
                    });

                    // E) Butonları mesajdan tamamen kaldır (artık tıklanamasın)
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
                    console.error("Hata oluştu:", e);
                }
            } else if (dataStr && dataStr.startsWith('reject_')) {
                // Reddet butonuna basıldıysa sadece butonları kaldır
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

        // Eğer siteden gelen yeni form başvurusu ise (POST body'de name varsa)
        if (req.body.name) {
            const { name, message, amount, txid } = req.body;
            const text = `🚀 YENI POLIUM BASVURUSU!\n\n👤 Isim: ${name}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "✅ Onayla", callback_data: `confirm_${encodeURIComponent(name)}_${amount}_${encodeURIComponent(message)}` },
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
