const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const freeGroupId = process.env.FREE_GROUP_ID;
const vipGroupId = process.env.VIP_GROUP_ID;

const users = {};

bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const newUser = msg.new_chat_member;

    if (chatId == freeGroupId) {
        const welcomeMessage = `Benvenuto ${newUser.first_name}! Partecipa alla nostra promo: invita 3 amici e sblocca l'accesso al gruppo VIP!`;
        bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: {
                inline_keyboard: [[{ text: "Partecipa alla promo", callback_data: `join_promo_${newUser.id}` }]]
            }
        });
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    if (query.data.startsWith('join_promo_')) {
        const refLink = `https://t.me/joinchat/${freeGroupId}?start=${userId}`;
        users[userId] = { refLink: refLink, invites: [] };

        bot.sendMessage(chatId, `Ecco il tuo link personale per la promo: ${refLink}`);
    }
});

bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const newUser = msg.new_chat_member;

    if (chatId == freeGroupId) {
        const inviterId = msg.text ? msg.text.split(' ')[1] : null; // Assuming the invite link carries the inviter ID
        if (inviterId && users[inviterId]) {
            users[inviterId].invites.push(newUser.id);

            if (users[inviterId].invites.length >= 3) {
                bot.sendMessage(inviterId, `Congratulazioni! Hai invitato 3 amici. Ecco il link per accedere al gruppo VIP: https://t.me/joinchat/${vipGroupId}`);
            }
        }
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (chatId == vipGroupId) {
        if (!users[userId] || users[userId].invites.length < 3) {
            bot.kickChatMember(chatId, userId)
                .then(() => bot.sendMessage(userId, 'Non hai rispettato i requisiti per entrare nel gruppo VIP.'))
                .catch(err => console.error(`Failed to kick user: ${err}`));
        }
    }
});

bot.on("polling_error", console.error);
