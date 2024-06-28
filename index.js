const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const freeGroupId = process.env.FREE_GROUP_ID;
const vipGroupId = process.env.VIP_GROUP_ID;

const freeGroupLink = "https://t.me/+E6LO3QVWyj5hNWFk";
const vipGroupLink = "https://t.me/+r_WY7qdTa-BiMWY0";

const users = {};

// Funzione per inviare il messaggio di benvenuto con captcha
bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const newUser = msg.new_chat_member;

    if (chatId == freeGroupId) {
        const captchaQuestion = generateCaptcha();
        users[newUser.id] = { invites: [], captchaAnswer: captchaQuestion.answer };

        const captchaMessage = `Benvenuto ${newUser.first_name}! Per verificare il tuo account, rispondi a questa domanda: ${captchaQuestion.question}`;
        bot.sendMessage(chatId, captchaMessage);
    }
});

// Funzione per generare una domanda captcha
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    return {
        question: `${num1} + ${num2} = ?`,
        answer: (num1 + num2).toString()
    };
}

// Funzione per gestire i messaggi
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (chatId == freeGroupId && users[userId] && users[userId].captchaAnswer) {
        if (msg.text === users[userId].captchaAnswer) {
            // Utente verificato
            delete users[userId].captchaAnswer;

            const welcomeMessage = `Grazie ${msg.from.first_name}! Sei stato verificato. Partecipa alla nostra promo: invita 3 amici e sblocca l'accesso al gruppo VIP!`;
            bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: {
                    inline_keyboard: [[{ text: "Partecipa alla promo", callback_data: `join_promo_${userId}` }]]
                }
            }).then(sentMessage => {
                bot.sendMessage(chatId, "Verifica completata con successo.", { reply_to_message_id: msg.message_id });
            });
        } else {
            bot.sendMessage(chatId, "Risposta sbagliata. Riprova.", { reply_to_message_id: msg.message_id });
        }
    } else if (msg.text === "/challengeref") {
        // Comando /challengeref per vedere il numero di inviti
        if (users[userId]) {
            bot.sendMessage(chatId, `Hai invitato ${users[userId].invites.length} persone.`, { reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, "Non hai ancora partecipato alla promo.", { reply_to_message_id: msg.message_id });
        }
    } else if (chatId == freeGroupId && msg.text && msg.text.startsWith("/start")) {
        const inviterId = msg.text.split(' ')[1];
        if (inviterId && users[inviterId]) {
            users[inviterId].invites.push(userId);

            if (users[inviterId].invites.length >= 3) {
                bot.sendMessage(inviterId, `Congratulazioni! Hai invitato 3 amici. Ecco il link per accedere al gruppo VIP: ${vipGroupLink}`);
            }
        }
    } else if (chatId == vipGroupId) {
        // Controlla se l'utente può accedere al gruppo VIP
        if (!users[userId] || users[userId].invites.length < 3) {
            bot.kickChatMember(chatId, userId)
                .then(() => bot.sendMessage(userId, 'Non hai rispettato i requisiti per entrare nel gruppo VIP.'))
                .catch(err => console.error(`Failed to kick user: ${err}`));
        }
    }
});

// Funzione per gestire la partecipazione alla promo
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    if (query.data.startsWith('join_promo_')) {
        users[userId].refLink = `${freeGroupLink}?start=${userId}`;
        bot.sendMessage(chatId, `Ecco il tuo link personale per la promo: ${freeGroupLink}?start=${userId}`);
    }
});

bot.on("polling_error", console.error);
