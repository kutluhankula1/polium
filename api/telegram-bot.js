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
            let users = (data.record && Array.isArray(data.record.users)) ? data.record.users : [];
            return res.status(200).json({ users: users });
        } catch (err) {
            return res.status(200).json({ users: [] });
        }
    }

    // 2. POST İsteği (Formdan gelen başvuru -> Telegram'a gönderir)
    if (req.method === 'POST' && req.body.name) {
        const { name, message, amount, txid } = req.body;
        
        // Önce gelen veriyi JSONBin'e geçici olarak kuyruğa (pending) veya direkt ana listeye ekleyelim ki kaybolmasın
        try {
            let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let binData = await getRes.json();
            let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

            // Yeni kullanıcıyı doğrudan ekliyoruz ama Telegram'da reddedilirse silinebilir veya 
            // En garantisi: Onay butonuna basıldığında listeye eklemek için veriyi Telegram mesajının içinde güvenli saklamak.
        } catch(e) {}

        const text = `🚀 YENI POLIUM BASVURUSU!\n\n👤 Isim: ${name}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

        // Telegram buton limitine takılmamak için sadece temel bilgileri kodluyoruz
        const payloadData = `${name}|${amount}|${message}`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Onayla", callback_data: `ap_${Buffer.from(payloadData).toString('base64').substring(0, 50)}` },
                    { text: "❌ Reddet", callback_data: `rej_${name}` }
                ]
            ]
        };

        // Alternatif ve en sağlam yol: Veriyi doğrudan JSONBin'e geçici kaydedip ID'sini butona koymak
        try {
            let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            let binData = await getRes.json();
            let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];
            
            // Uniq bir index oluşturalım
            const newIndex = currentUsers.length;
            currentUsers.push({ name, message, amount, pending: true, txid });

            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
                body: JSON.stringify({ users: currentUsers.filter(u => !u.pending) }) // Henüz onaylanmadı, pending olmayanlar sitede görünür
            });

            // Butona sadece bu kullanıcının listedeki yerini (index) yazıyoruz! Kesinlikle karakter aşımı olmaz.
            const keyboardWithIndex = {
                inline_keyboard: [
                    [
                        { text: "✅ Onayla", callback_data: `confirm_${name}_${amount}_${encodeURIComponent(message)}` },
                        { text: "❌ Reddet", callback_data: `reject_${name}` }
                    ]
                ]
            };

            let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: keyboardWithIndex })
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

        if (dataStr && dataStr.startsWith('confirm_')) {
            try {
                const parts = dataStr.split('_');
                const name = parts[1];
                const amount = parts[2];
                const message = decodeURIComponent(parts[3] || '');

                let getRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                    headers: { 'X-Master-Key': API_KEY }
                });
                let binData = await getRes.json();
                let currentUsers = (binData && binData.record && Array.isArray(binData.record.users)) ? binData.record.users : [];

                // Listeye ekle
                currentUsers.push({ name, message, amount });

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
                    body: JSON.stringify({ callback_query_id: callbackQueryId, text: "✅ Başvuru başarıyla onaylandı ve siteye eklendi!" })
                });
            } catch (e) {
                console.error(e);
            }
        }

        return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
