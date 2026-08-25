export default async function handler(req, res) {
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";
    const BIN_ID = "6a8cf6a6da38895dfe0ce74c";
    const API_KEY = "$2a$10$G8jaeYrJCOhWdEhjmslybON9oM3pn6Lg8gnAODI5FzEBSc.foYKyS";

    // 1. GET İsteği: Sitedeki liderlik tablosu güncel listeyi çeker
    if (req.method === 'GET') {
        try {
            let response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let data = await response.json();
            // Eğer record altında users dizisi yoksa boş döndür
            let users = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];
            return res.status(200).json({ users: users });
        } catch (err) {
            return res.status(200).json({ users: [] });
        }
    }

    // 2. POST İsteği (Formdan gelen başvuru -> Telegram'a gönderir)
    if (req.method === 'POST' && req.body.name) {
        const { name, message, amount, txid } = req.body;
        const text = `🚀 YENI POLIUM BASVURUSU!\n\n👤 Isim: ${name}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Onayla", callback_data: `approve_${encodeURIComponent(name)}_${amount}_${encodeURIComponent(message)}` },
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

    // 3. TELEGRAM'DAN GELEN BUTON TIKLAMA (Webhook)
    if (req.body && req.body.callback_query) {
        const callback = req.body.callback_query;
        const dataStr = callback.data;
        const callbackQueryId = callback.id;

        if (dataStr && dataStr.startsWith('approve_')) {
            try {
                const parts = dataStr.split('_');
                const name = decodeURIComponent(parts[1]);
                const amount = parts[2];
                const message = decodeURIComponent(parts[3] || '');

                // Mevcut listeyi JSONBin'den güvenli çek
                let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                    headers: { 'X-Master-Key': API_KEY }
                });
                let binData = await getRes.json();
                
                let currentUsers = [];
                if (binData && binData.record && Array.isArray(binData.record.users)) {
                    currentUsers = binData.record.users;
                }

                // Yeni kullanıcıyı listeye ekle
                currentUsers.push({ name, message, amount });

                // Listeyi JSONBin'e kaydet
                await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': API_KEY
                    },
                    body: JSON.stringify({ users: currentUsers })
                });

                // Telegram'daki bildirimi güncelle / yanıt ver
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callback_query_id: callbackQueryId, text: "✅ Başvuru onaylandı ve siteye eklendi!" })
                });
            } catch (e) {
                console.error("Onaylama hatası:", e);
            }
        }

        return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
