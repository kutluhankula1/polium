export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, message, amount, txid } = req.body;
    const botToken = "8521072456:AAGwN-R3q67KJ5Wag3D5msFPEuc7-mptTyE";
    const chatId = "7394428404";

    const text = `🚀 YENI POLIUM BASVURUSU!\n\n👤 Isim: ${name}\n💬 Mesaj: ${message}\n💰 Tutar: ${amount} USDT\n🔗 TxID: ${txid}`;

    // Telegram'a Onayla ve Reddet butonlarını ekleyerek mesaj gönderiyoruz
    const keyboard = {
        inline_keyboard: [
            [
                { text: "✅ Onayla", callback_data: `approve_${name}_${amount}` },
                { text: "❌ Reddet", callback_data: `reject_${name}` }
            ]
        ]
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                reply_markup: keyboard
            })
        });

        const data = await response.json();
        if (data.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(400).json({ error: data.description });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}